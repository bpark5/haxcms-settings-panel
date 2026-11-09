import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCipheriv, createHmac, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { createMockAuthorization } from "../lib/mock-reauthentication.mjs";
import { createMockAuthentication, createMockSaveCode } from "../web-dev-server.config.mjs";
import { createMockCodeStore } from "../lib/mock-code-store.mjs";

function setup() {
  let time = 1_800_000_000_000;
  const jwtSecret = randomBytes(32);
  const serverSecret = randomBytes(32);
  const auth = createMockAuthorization({ now: () => time, jwtSecret, serverSecret });
  const session = auth.session();
  const headers = { authorization: `Bearer ${session.jwt}`, "x-haxcms-user-token": session.userToken };
  return { auth, headers, jwtSecret, serverSecret,
    advance: amount => { time += amount; }, now: () => time };
}
const errorCode = code => error => error.code === code;
function request(headers, payload = { language: "css", code: ".title { color: red; }" }, overrides = {}) {
  return { path: "/mock-save-code", method: "POST", headers, set() {}, is: () => true,
    req: [Buffer.from(JSON.stringify(payload))], ...overrides };
}

test("password, signed JWT and matching user token are all required", () => {
  const { auth, headers, jwtSecret, now } = setup();
  assert.throws(() => auth.issue({}, "demo123"), errorCode("SESSION_INVALID"));
  assert.throws(() => auth.issue({ ...headers, "x-haxcms-user-token": "made-up" }, "demo123"), errorCode("USER_TOKEN_INVALID"));
  assert.throws(() => auth.issue(headers, "wrong"), errorCode("PASSWORD_INVALID"));
  const token = headers.authorization.slice(7);
  const [head, body, signature] = token.split(".");
  assert.throws(() => auth.identity({ ...headers, authorization: `Bearer ${head}.${body}.${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}` }), errorCode("SESSION_INVALID"));
  for (const claims of [
    { ...jwt.decode(token), user: "someone-else" },
    { ...jwt.decode(token), exp: Math.floor(now() / 1000) },
    { ...jwt.decode(token), iat: Math.floor(now() / 1000) + 1 },
  ]) {
    const other = jwt.sign(claims, jwtSecret, { algorithm: "HS256" });
    assert.throws(() => auth.identity({ ...headers, authorization: `Bearer ${other}` }), errorCode("SESSION_INVALID"));
  }
  const wrongAlgorithm = jwt.sign(jwt.decode(token), jwtSecret, { algorithm: "HS512" });
  assert.throws(() => auth.identity({ ...headers, authorization: `Bearer ${wrongAlgorithm}` }), errorCode("SESSION_INVALID"));
});

test("nonce is reusable across languages and payloads until exactly 60 seconds, without renewal", async () => {
  const state = setup();
  const issued = state.auth.issue(state.headers, "demo123");
  assert.equal(issued.expiresAt, state.now() + 60_000);
  assert.notEqual(state.auth.issue(state.headers, "demo123").nonce, issued.nonce);
  const headers = { ...state.headers, "x-haxcms-reauthentication": issued.nonce };
  const writes = [];
  const save = createMockSaveCode(async (language, code, beforeWrite) => {
    beforeWrite(); writes.push({ language, code });
  }, state.auth);
  for (const [elapsed, language, code] of [[0, "css", ""], [30_000, "javascript", "console.log('new');"], [29_999, "css", "body { color: blue; }"]]) {
    state.advance(elapsed);
    const context = request(headers, { language, code });
    await save(context);
    assert.equal(context.status, 200);
  }
  state.advance(1);
  const expired = request(headers);
  await save(expired);
  assert.equal(expired.status, 403);
  assert.equal(expired.body.code, "REAUTH_REQUIRED");
  assert.equal(writes.length, 3);
});

test("malformed, tampered, wrong-key and future nonces fail closed", () => {
  const state = setup();
  const nonce = state.auth.issue(state.headers, "demo123").nonce;
  const parts = nonce.split(".");
  const ciphertext = Buffer.from(parts[2], "base64url");
  ciphertext[0] ^= 1;
  const tampered = [...parts];
  tampered[2] = ciphertext.toString("base64url");
  const other = createMockAuthorization();
  const session = other.session();
  const otherHeaders = { authorization: `Bearer ${session.jwt}`, "x-haxcms-user-token": session.userToken,
    "x-haxcms-reauthentication": nonce };
  assert.throws(() => other.verify(otherHeaders), errorCode("REAUTH_REQUIRED"));
  for (const value of [undefined, "", "v1.bad.bad.bad", "a".repeat(2049), tampered.join(".")]) {
    assert.throws(() => state.auth.verify({ ...state.headers, "x-haxcms-reauthentication": value }), errorCode("REAUTH_REQUIRED"));
  }
  // Server-key fixtures prove claim validation independently of tag validation.
  const purpose = "haxcms-local-reauthentication-v1";
  const key = createHmac("sha256", state.serverSecret).update(`${purpose}:${state.headers["x-haxcms-user-token"]}`).digest();
  for (const overrides of [{ issued_at: state.now() + 1 }, { issued_at: "1800000000000" },
    { issued_at: null }, { user: "another-account" }, { purpose: "another-purpose" }, { version: 2 }]) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(purpose));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify({
      version: 1, purpose, user: "demo", issued_at: state.now(), ...overrides,
    })), cipher.final()]);
    const forged = ["v1", iv.toString("base64url"), ciphertext.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
    assert.throws(() => state.auth.verify({ ...state.headers, "x-haxcms-reauthentication": forged }), errorCode("REAUTH_REQUIRED"));
  }
});

test("expired JWT blocks a save even with a freshly issued nonce", () => {
  const state = setup();
  state.advance(899_999);
  const nonce = state.auth.issue(state.headers, "demo123").nonce;
  state.advance(1);
  assert.throws(() => state.auth.verify({ ...state.headers, "x-haxcms-reauthentication": nonce }), errorCode("SESSION_INVALID"));
});

test("local generator handles methods, JSON, bounds and wrong passwords", async () => {
  const { auth, headers } = setup();
  const route = createMockAuthentication(auth);
  const session = request({}, {}, { path: "/mock-session", method: "GET" });
  await route(session);
  assert.equal(session.status, 200);
  assert.equal(session.body.userToken, headers["x-haxcms-user-token"]);
  for (const [overrides, status, code] of [
    [{ method: "GET" }, 405], [{ headers: {} }, 401, "SESSION_INVALID"],
    [{ is: () => false }, 415], [{ req: [Buffer.from("bad json")] }, 400],
    [{ req: [Buffer.alloc(4097)] }, 413],
  ]) {
    const context = request(headers, {}, { path: "/mock-authentication", ...overrides });
    await route(context);
    assert.equal(context.status, status);
    if (code) assert.equal(context.body.code, code);
  }
  for (const password of ["wrong", "demo123"]) {
    const context = request(headers, { password }, { path: "/mock-authentication" });
    await route(context);
    assert.equal(context.status, password === "demo123" ? 200 : 401);
    assert.equal(!!context.body.nonce, password === "demo123");
  }
});

test("authorization failures, including expiry in the queue, write neither active code nor history", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "hax-auth-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "custom.css"), "/* original */");
  const store = createMockCodeStore({ root });
  const state = setup();
  const nonce = state.auth.issue(state.headers, "demo123").nonce;
  const headers = { ...state.headers, "x-haxcms-reauthentication": nonce };
  let queued;
  const inQueue = new Promise(resolve => { queued = resolve; });
  const save = createMockSaveCode((language, code, check) => {
    const pending = store.save(language, code, check);
    queued();
    return pending;
  }, state.auth);
  for (const bad of [{}, { ...headers, "x-haxcms-user-token": "wrong" },
    { ...headers, "x-haxcms-reauthentication": "invalid" }]) {
    const context = request(bad);
    await save(context);
    assert.ok(context.status >= 400);
  }
  // Hold a read in the same queue; expire the authorized save while it waits.
  let release;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const blocker = store.save("css", "/* never written */", () => new Promise((resolve, reject) => {
    release = () => reject(new Error("cancel blocker")); started();
  })).catch(() => {});
  await ready;
  const context = request(headers);
  const saving = save(context);
  await inQueue;
  state.advance(60_000);
  release();
  await Promise.all([blocker, saving]);
  assert.equal(context.body.code, "REAUTH_REQUIRED");
  assert.equal(await readFile(path.join(root, "custom.css"), "utf8"), "/* original */");
  assert.deepEqual(await readdir(root), ["custom.css"]);
});
