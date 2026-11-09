import { test } from "node:test";
import assert from "node:assert/strict";
import { MockAuthorizationClient, saveMockCode } from "../lib/mock-authorization-client.js";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
function setup() {
  let time = 1_800_000_000_000;
  let sessionRequests = 0;
  const requests = [];
  const client = new MockAuthorizationClient({ now: () => time, fetchImpl: async (url, options) => {
    requests.push({ url, options });
    if (url === "/mock-session") {
      sessionRequests++;
      return json({ success: true, jwt: "development-jwt", userToken: "demo-user-token" });
    }
    if (url === "/mock-authentication") return json({ success: true, nonce: "opaque-nonce",
      expiresAt: time + 60_000, expiresInSeconds: 60 });
    return json({ success: true, revision: { id: "saved" } });
  } });
  return { client, requests, advance: amount => { time += amount; }, sessions: () => sessionRequests };
}

test("client shares a single bootstrap and holds reusable credentials only until the deadline", async () => {
  const state = setup();
  await Promise.all([state.client.headers(), state.client.headers()]);
  assert.equal(state.sessions(), 1);
  await state.client.authenticate("demo123", new AbortController().signal);
  const headers = await state.client.headers();
  assert.equal(headers.Authorization, "Bearer development-jwt");
  assert.equal(headers["X-HAXCMS-User-Token"], "demo-user-token");
  assert.equal(headers["X-HAXCMS-Reauthentication"], "opaque-nonce");
  assert.equal(state.client.hasAuthorization(), true);
  state.advance(59_999);
  await saveMockCode({ authorization: state.client, language: "css", code: "", reauthenticate: () => assert.fail() });
  state.advance(1);
  assert.equal(state.client.hasAuthorization(), false);
  state.client.dispose();
  assert.equal(state.client.session, null);
  assert.equal(state.client.nonce, "");
});

test("save retries once after explicit expiry with identical payload and fresh authorization", async () => {
  const state = setup();
  await state.client.authenticate("demo123", new AbortController().signal);
  const transport = state.client.fetch;
  const saved = [];
  let prompts = 0;
  state.client.fetch = async (url, options) => {
    if (url !== "/mock-save-code") return transport(url, options);
    saved.push({ body: options.body, nonce: options.headers["X-HAXCMS-Reauthentication"] });
    if (saved.length === 1) return json({ success: false, code: "REAUTH_REQUIRED", message: "Expired" }, 403);
    return json({ success: true });
  };
  await saveMockCode({ authorization: state.client, language: "javascript", code: "// original snapshot",
    reauthenticate: async () => {
      prompts++;
      assert.equal(state.client.nonce, "");
      await state.client.authenticate("demo123", new AbortController().signal);
      state.client.nonce = "fresh-nonce";
      return true;
    } });
  assert.equal(prompts, 1);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].body, saved[1].body);
  assert.equal(saved[1].nonce, "fresh-nonce");
});

test("cancel, session errors, network errors, and repeated expiry never loop or retry writes blindly", async () => {
  for (const failure of ["REAUTH_REQUIRED", "SESSION_INVALID", "USER_TOKEN_INVALID", "network", "write"]) {
    const { client } = setup();
    await client.headers();
    let writes = 0;
    let prompts = 0;
    client.fetch = async () => {
      writes++;
      if (failure === "network") throw new Error("Connection lost");
      return json({ success: false, code: failure, message: "Rejected" }, failure === "write" ? 500 : 403);
    };
    const operation = saveMockCode({ authorization: client, language: "css", code: "/* draft */",
      reauthenticate: async () => { prompts++; return false; } });
    if (failure === "REAUTH_REQUIRED") assert.equal(await operation, null);
    else await assert.rejects(operation);
    assert.equal(writes, 1);
    assert.equal(prompts, failure === "REAUTH_REQUIRED" ? 1 : 0);
  }
  const { client } = setup();
  await client.headers();
  let writes = 0;
  client.fetch = async () => {
    writes++;
    return json({ success: false, code: "REAUTH_REQUIRED" }, 403);
  };
  await assert.rejects(saveMockCode({ authorization: client, language: "css", code: "", reauthenticate: async () => true }));
  assert.equal(writes, 2);
});

test("aborted or malformed authentication cannot authorize the client", async () => {
  for (const body of [{ success: true }, { success: true, nonce: "n", expiresAt: 0, expiresInSeconds: 60 }]) {
    const { client } = setup();
    await client.headers();
    client.fetch = async () => json(body);
    await assert.rejects(client.authenticate("demo123", new AbortController().signal));
    assert.equal(client.hasAuthorization(), false);
  }
  const { client } = setup();
  await client.headers();
  const controller = new AbortController();
  client.fetch = async () => {
    controller.abort();
    return json({ success: true, nonce: "n", expiresAt: 1_800_000_060_000, expiresInSeconds: 60 });
  };
  await client.authenticate("demo123", controller.signal);
  assert.equal(client.hasAuthorization(), false);
});
