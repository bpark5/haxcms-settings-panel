import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createMockAuthorization } from "../lib/mock-reauthentication.mjs";
import { createJsonDocuments, createRedisState, compareAndSetScript } from "../lib/redis-json-state.mjs";
import { createHostedCodeStore, createHostedAuthorization } from "../lib/hosted-mock-store.mjs";
import { createHostedServices, createVercelMockHandler } from "../lib/vercel-mock-api.mjs";

function setup() {
  let time = Date.now();
  const records = new Map();
  let writes = 0;
  const state = {
    async get(key) { return records.get(key) || null; },
    async compareAndSet(key, expected, replacement, ttl, guard = {}) {
      if ((records.get(key) || null) !== expected) return 0;
      if (guard.sessionExpiresAt && time >= guard.sessionExpiresAt) return -2;
      if (guard.nonceExpiresAt && time >= guard.nonceExpiresAt) return -1;
      records.set(key, replacement);
      writes++;
      return 1;
    },
  };
  function instance() {
    const documents = createJsonDocuments(state);
    const authorization = createHostedAuthorization(createMockAuthorization({ now: () => time,
      jwtSecret: "j".repeat(32), serverSecret: "s".repeat(32),
    }), documents);
    const store = createHostedCodeStore({ documents, now: () => time,
      initialCode: async language => language === "css" ? "/* seed */" : "// seed",
    });
    return { authorization, store };
  }
  return { records, state, instance, writes: () => writes, advance: ms => { time += ms; } };
}

async function invoke(handler, route, { method = "GET", body, headers = {}, query = {} } = {}) {
  const request = Readable.from(body === undefined ? [] : [typeof body === "string" ? body : JSON.stringify(body)]);
  request.url = `/api/mock?route=${encodeURIComponent(route)}`;
  request.query = query;
  request.method = method;
  request.headers = { ...headers };
  if (body !== undefined) request.headers["content-type"] = "application/json";
  const response = { statusCode: 200, headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    end(body) { this.raw = body; this.body = this.headers["Content-Type"].startsWith("application/json") ? JSON.parse(body) : body; },
  };
  await handler(request, response);
  return response;
}

test("Vercel API connects session, nonce, saves, source and history across cold instances", async () => {
  const shared = setup();
  const first = createVercelMockHandler(shared.instance);
  const second = createVercelMockHandler(shared.instance);
  const session = await invoke(first, "session");
  assert.equal(session.statusCode, 200);
  const headers = { authorization: `Bearer ${session.body.jwt}`, "x-haxcms-user-token": session.body.userToken };
  const login = await invoke(second, "authentication", { method: "POST", headers, body: { password: "demo123" } });
  assert.equal(login.statusCode, 200);
  headers["x-haxcms-reauthentication"] = login.body.nonce;
  for (const [handler, language, code] of [[first, "javascript", "// updated JS"], [second, "css", "body { color: blue; }"]]) {
    const saved = await invoke(handler, "save-code", { method: "POST", headers, body: { language, code } });
    assert.equal(saved.statusCode, 200);
    const source = await invoke(second, "code-source", { query: { language } });
    assert.equal(source.body, code);
    assert.equal(source.headers["Content-Type"], "text/plain; charset=utf-8");
    assert.equal(source.headers["Cache-Control"], "no-store");
    const history = await invoke(first, "code-history", { query: { language } });
    assert.equal(history.body.revisions.length, 2);
    assert.equal("code" in history.body.revisions[0], false);
    const revision = await invoke(second, `code-history/${saved.body.revision.id}`, { query: { language } });
    assert.equal(revision.body.revision.code, code);
  }
  const before = new Map(shared.records);
  shared.advance(60_000);
  const expired = await invoke(second, "save-code", { method: "POST", headers,
    body: { language: "javascript", code: "// expired" } });
  assert.equal(expired.body.code, "REAUTH_REQUIRED");
  assert.deepEqual(shared.records, before);
});

test("third failed password is shared across instances; cold starts cannot bypass cooldown", async () => {
  const shared = setup();
  const services = shared.instance();
  const session = services.authorization.session();
  const headers = { authorization: `Bearer ${session.jwt}`, "x-haxcms-user-token": session.userToken };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await invoke(createVercelMockHandler(shared.instance), "authentication", {
      method: "POST", headers, body: { password: "wrong" },
    });
    assert.equal(result.statusCode, attempt === 3 ? 429 : 401);
  }
  const blocked = await invoke(createVercelMockHandler(shared.instance), "authentication", {
    method: "POST", headers, body: { password: "demo123" },
  });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers["Retry-After"], "60");
  shared.advance(60_000);
  assert.equal((await invoke(createVercelMockHandler(shared.instance), "authentication", {
    method: "POST", headers, body: { password: "demo123" },
  })).statusCode, 200);
});

test("parallel password failures and saves resolve conflicts without losing counters or revisions", async () => {
  const shared = setup();
  const first = shared.instance();
  const session = first.authorization.session();
  const headers = { authorization: `Bearer ${session.jwt}`, "x-haxcms-user-token": session.userToken };
  const failures = await Promise.all(Array.from({ length: 3 }, async () => {
    try { await shared.instance().authorization.issueForRequest(headers, { password: "wrong" }); }
    catch (error) { return error.code; }
  }));
  assert.deepEqual(failures.sort(), ["AUTH_RATE_LIMITED", "PASSWORD_INVALID", "PASSWORD_INVALID"].sort());
  shared.advance(60_000);
  const { nonce } = await first.authorization.issueForRequest(headers, { password: "demo123" });
  headers["x-haxcms-reauthentication"] = nonce;
  await Promise.all(Array.from({ length: 6 }, (_, index) => shared.instance().store.save("javascript", `// ${index}`,
    () => first.authorization.verify(headers))));
  const history = await shared.instance().store.list("javascript");
  assert.equal(history.length, 7);
  assert.equal(new Set(history.map(item => item.id)).size, 7);
});

test("authorization is rechecked at commit and a rejected transaction creates no initial history", async () => {
  const shared = setup();
  const { authorization, store } = shared.instance();
  const session = authorization.session();
  const headers = { authorization: `Bearer ${session.jwt}`, "x-haxcms-user-token": session.userToken };
  headers["x-haxcms-reauthentication"] = (await authorization.issueForRequest(headers, { password: "demo123" })).nonce;
  const originalCAS = shared.state.compareAndSet;
  shared.state.compareAndSet = async (...args) => {
    if (args[0].startsWith("code:")) shared.advance(60_000);
    return originalCAS(...args);
  };
  await assert.rejects(store.save("css", "/* stale */", () => authorization.verify(headers)), error => error.code === "REAUTH_REQUIRED");
  assert.equal(shared.records.has("code:css"), false);
  assert.deepEqual(await store.list("css"), []);
});

test("missing configuration and provider failures return JSON and never fall back to process memory", async () => {
  const handler = createVercelMockHandler(() => createHostedServices({ env: {} }));
  const response = await invoke(handler, "session");
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, "DEMO_NOT_CONFIGURED");
  const state = createRedisState({ url: "https://redis.example", token: "private-provider-token",
    fetchImpl: async () => new Response('{"error":"private backend details"}', { status: 500 }),
  });
  await assert.rejects(state.get("code:css"), error => error.status === 503 && !error.message.includes("private"));
});

test("REST adapter sends bounded CAS commands with expiry guards and never puts credentials in URLs", async () => {
  const commands = [];
  const state = createRedisState({ url: "https://redis.example", token: "provider-token",
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://redis.example");
      assert.equal(options.headers.Authorization, "Bearer provider-token");
      const command = JSON.parse(options.body);
      commands.push(command);
      return new Response(JSON.stringify({ result: command[0] === "GET" ? null : 1 }));
    },
  });
  await state.get("code:css");
  await state.compareAndSet("code:css", null, "{}", 1000, { sessionExpiresAt: 2000, nonceExpiresAt: 1500 });
  assert.deepEqual(commands[1], ["EVAL", compareAndSetScript, "1", "haxcms-settings-panel:production:code:css", "", "{}", "1000", "2000", "1500"]);
});

test("Vercel adapter rejects malformed bodies and unknown routes without publishing code", async () => {
  const shared = setup();
  const handler = createVercelMockHandler(shared.instance);
  const unknown = await invoke(handler, "../../outside");
  assert.equal(unknown.statusCode, 404);
  const session = (await invoke(handler, "session")).body;
  const headers = { authorization: `Bearer ${session.jwt}`, "x-haxcms-user-token": session.userToken };
  assert.equal((await invoke(handler, "authentication", { method: "POST", headers, body: "broken JSON" })).statusCode, 400);
  assert.equal((await invoke(handler, "authentication", { method: "POST", headers, body: " ".repeat(4097) })).statusCode, 413);
  assert.equal((await invoke(handler, "save-code", { method: "POST", headers, body: { language: "css", code: "" } })).statusCode, 403);
  assert.equal(shared.writes(), 0);
});
