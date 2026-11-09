import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createMockAuthorization } from "../lib/mock-reauthentication.mjs";
import { createMockAuthentication, createMockSaveCode } from "../web-dev-server.config.mjs";
import { createMockCodeStore } from "../lib/mock-code-store.mjs";

// Reproducible mutation-based fuzzing, with seed shown in test names.
const seed = 0x484158;
function randomSource() {
  let state = seed;
  return max => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) % max;
  };
}
function setup() {
  let time = 1_800_000_000_000;
  const auth = createMockAuthorization({ now: () => time });
  const session = auth.session();
  const headers = { authorization: `Bearer ${session.jwt}`, "x-haxcms-user-token": session.userToken };
  const { nonce } = auth.issue(headers, "demo123");
  headers["x-haxcms-reauthentication"] = nonce;
  return { auth, headers, nonce, advance: ms => { time += ms; } };
}
function context(headers, body, overrides = {}) {
  const responseHeaders = {};
  return { path: "/mock-authentication", method: "POST", headers,
    is: () => true, set: (name, value) => { responseHeaders[name] = value; }, responseHeaders,
    req: [Buffer.from(body)], ...overrides };
}
function rejected(operation, code) {
  assert.throws(operation, error => error.status >= 400 && error.status < 500 && (!code || error.code === code));
}

test(`seed ${seed}: 900 mutated JWTs, user tokens and nonces fail closed`, () => {
  const { auth, headers, nonce } = setup();
  const random = randomSource();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  for (let iteration = 0; iteration < 300; iteration++) {
    const parts = nonce.split(".");
    const part = 1 + random(3);
    const position = random(parts[part].length);
    const original = parts[part][position];
    const replacement = alphabet[(alphabet.indexOf(original) + 1 + random(63)) % 64];
    parts[part] = parts[part].slice(0, position) + replacement + parts[part].slice(position + 1);
    rejected(() => auth.verify({ ...headers, "x-haxcms-reauthentication": parts.join(".") }), "REAUTH_REQUIRED");
    const jwtParts = headers.authorization.slice(7).split(".");
    const signature = jwtParts[2];
    // Change the first signature character so decoded signature bytes differ.
    jwtParts[2] = alphabet[(alphabet.indexOf(signature[0]) + 1 + random(63)) % 64] + signature.slice(1);
    rejected(() => auth.verify({ ...headers, authorization: `Bearer ${jwtParts.join(".")}` }), "SESSION_INVALID");
    const token = headers["x-haxcms-user-token"];
    const index = random(token.length);
    const changed = token.slice(0, index) + (token[index] === "a" ? "b" : "a") + token.slice(index + 1);
    rejected(() => auth.verify({ ...headers, "x-haxcms-user-token": changed }), "USER_TOKEN_INVALID");
  }
  auth.verify(headers);
});

test("malformed types, oversized headers and nonce structures never escape as server errors", () => {
  const { auth, headers } = setup();
  const values = [null, undefined, true, false, 0, 1, [], {}, ["a", "b"], "", "\u0000", "a".repeat(100_000)];
  for (const value of values) {
    rejected(() => auth.identity(value));
    rejected(() => auth.verify({ ...headers, authorization: value }), "SESSION_INVALID");
    rejected(() => auth.verify({ ...headers, "x-haxcms-user-token": value }), "USER_TOKEN_INVALID");
    rejected(() => auth.verify({ ...headers, "x-haxcms-reauthentication": value }), "REAUTH_REQUIRED");
  }
  for (const nonce of ["v1.a.b.c", "v2.a.b.c", "v1.====.====.====", "v1.a.b.c.extra", "v1.💥.b.c"]) {
    rejected(() => auth.verify({ ...headers, "x-haxcms-reauthentication": nonce }), "REAUTH_REQUIRED");
  }
});

test(`seed ${seed}: 250 malformed authentication bodies never issue a nonce`, async () => {
  const { auth, headers } = setup();
  const route = createMockAuthentication(auth);
  const random = randomSource();
  const bodies = ["null", "[]", "{}", "true", "0", '"demo123"', '{"password":null}',
    '{"password":[]}', '{"password":{}}', '{"password":"demo123","user":"admin"}',
    '{"password":"demo123","__proto__":{"admin":true}}', '{"password":"',
    JSON.stringify({ password: "💥".repeat(1024) })];
  for (let iteration = 0; iteration < 250; iteration++) {
    const body = iteration % 2 ? bodies[random(bodies.length)]
      : Array.from({ length: 1 + random(128) }, () => String.fromCharCode(random(128))).join("") + "\u0000";
    const request = context(headers, body);
    await route(request);
    assert.ok(request.status >= 400 && request.status < 500, `case ${iteration}: ${request.status}`);
    assert.equal(request.body.success, false);
    assert.equal(request.body.nonce, undefined);
  }
});

test(`seed ${seed}: 250 malformed saves leave active files and history untouched`, async t => {
  const root = await mkdtemp(path.join(tmpdir(), "hax-fuzz-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "custom.js"), "// preserve JS");
  await writeFile(path.join(root, "custom.css"), "/* preserve CSS */");
  const store = createMockCodeStore({ root });
  const { auth, headers } = setup();
  let writes = 0;
  const route = createMockSaveCode((language, code, check) => {
    writes++;
    return store.save(language, code, check);
  }, auth);
  const random = randomSource();
  const bodies = ["null", "[]", "{}", '{"language":"__proto__","code":""}',
    '{"language":"../../outside","code":""}', '{"language":"css","code":{}}',
    '{"language":"javascript","code":"const invalid = ;"}',
    '{"language":"css","code":"body { color red; }"}', "[".repeat(100)];
  for (let iteration = 0; iteration < 250; iteration++) {
    const request = context(headers, bodies[random(bodies.length)], { path: "/mock-save-code" });
    await route(request);
    assert.ok([400, 422].includes(request.status), `case ${iteration}: ${request.status}`);
    assert.equal(request.body.success, false);
  }
  assert.equal(writes, 0);
  assert.equal(await readFile(path.join(root, "custom.js"), "utf8"), "// preserve JS");
  assert.equal(await readFile(path.join(root, "custom.css"), "utf8"), "/* preserve CSS */");
  assert.deepEqual((await readdir(root)).sort(), ["custom.css", "custom.js"]);
});

test("third wrong password starts a 60-second cooldown that survives a fresh demo JWT", async () => {
  const { auth, headers, advance } = setup();
  const route = createMockAuthentication(auth);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const request = context(headers, JSON.stringify({ password: "wrong" }));
    await route(request);
    assert.equal(request.status, attempt === 3 ? 429 : 401);
    assert.equal(request.body.nonce, undefined);
    if (attempt === 3) {
      assert.equal(request.responseHeaders["Retry-After"], "60");
      assert.equal(request.body.retryAfterSeconds, 60);
    }
  }
  const fresh = auth.session();
  const newHeaders = { authorization: `Bearer ${fresh.jwt}`, "x-haxcms-user-token": fresh.userToken };
  rejected(() => auth.issue(newHeaders, "demo123"), "AUTH_RATE_LIMITED");
  advance(59_999);
  rejected(() => auth.issue(newHeaders, "demo123"), "AUTH_RATE_LIMITED");
  advance(1);
  assert.equal(auth.issue(newHeaders, "demo123").success, true);
});

test("successful verification resets failures; a request flood cannot repeatedly force password hashing", () => {
  const { auth, headers, advance } = setup();
  for (let cycle = 0; cycle < 2; cycle++) {
    rejected(() => auth.issue(headers, "wrong"), "PASSWORD_INVALID");
    rejected(() => auth.issue(headers, "wrong"), "PASSWORD_INVALID");
    auth.issue(headers, "demo123");
  }
  // 1 setup issuance + 6 above + 13 = 20 password checks in this minute.
  for (let i = 0; i < 13; i++) auth.issue(headers, "demo123");
  rejected(() => auth.issue(headers, "demo123"), "AUTH_RATE_LIMITED");
  advance(60_000);
  assert.equal(auth.issue(headers, "demo123").success, true);
});
