import { test } from "node:test";
import assert from "node:assert/strict";
import { createMockSaveCode } from "../web-dev-server.config.mjs";
import { mockAuthorization } from "../lib/mock-reauthentication.mjs";

const session = mockAuthorization.session();
const identityHeaders = { authorization: `Bearer ${session.jwt}`, "x-haxcms-user-token": session.userToken };
const authorizedHeaders = { ...identityHeaders, "x-haxcms-reauthentication": mockAuthorization.issue(identityHeaders, "demo123").nonce };

function request(payload, overrides = {}) {
  return {
    path: "/mock-save-code",
    method: "POST",
    is: type => type === "application/json",
    set() {},
    headers: { ...authorizedHeaders },
    req: [Buffer.from(JSON.stringify(payload))],
    ...overrides,
  };
}

test("saves each language to its fixed file, including clearing CSS", async () => {
  const writes = [];
  const save = createMockSaveCode(async (...args) => writes.push(args));
  for (const [language, code] of [
    ["css", ".page-title { color: purple; }"],
    ["javascript", "console.log('saved');"],
    ["css", ""],
    ["javascript", ""],
    ["javascript", "siteProvidedGlobal();"],
    ["javascript", "await Promise.resolve();"],
  ]) {
    const context = request({ language, code, path: "../../elsewhere" });
    await save(context);
    assert.equal(context.status, 200);
    assert.equal(context.body.success, true);
    const [destinationLanguage, text] = writes.at(-1);
    assert.equal(destinationLanguage, language);
    assert.equal(text, code);
  }
  assert.equal(writes.length, 6);
});

test("rejects invalid syntax before writing either saved file", async () => {
  let writes = 0;
  const save = createMockSaveCode(async () => writes++);
  for (const [language, code] of [
    ["javascript", "const broken = ;"],
    ["javascript", "import x from './x.js';"],
    ["javascript", "export default 1;"],
    ["javascript", "function later() { return import('./x.js'); }"],
    ["javascript", "with (window) {}"],
    ["css", ".page-title { color red; }"],
    ["css", ".page-title { color: red;"],
  ]) {
    const context = request({ language, code });
    await save(context);
    assert.equal(context.status, 422);
    assert.equal(context.body.success, false);
    assert.equal(context.body.language, language);
    assert.match(context.body.message, /syntax error/);
    assert.ok(context.body.line >= 1);
    assert.ok(context.body.column >= 1);
  }
  assert.equal(writes, 0);
});

test("rejects invalid languages, malformed payloads, methods and oversized bodies", async () => {
  let writes = 0;
  const save = createMockSaveCode(async () => writes++);
  for (const payload of [null, {}, { language: "../custom.css", code: "" }, { language: "__proto__", code: "" }, { language: "css", code: 1 }]) {
    const context = request(payload);
    await save(context);
    assert.equal(context.status, 400);
  }
  for (const [overrides, status] of [
    [{ method: "GET" }, 405],
    [{ is: () => false }, 415],
    [{ req: [Buffer.from("not json")] }, 400],
    [{ req: [Buffer.alloc(1024 * 1024 + 1)] }, 413],
  ]) {
    const context = request({}, overrides);
    await save(context);
    assert.equal(context.status, status);
  }
  assert.equal(writes, 0);
});

test("reports failed persistence without claiming success", async () => {
  const save = createMockSaveCode(async () => { throw new Error("write failed"); });
  const context = request({ language: "css", code: "" });
  await save(context);
  assert.equal(context.status, 500);
  assert.equal(context.body.success, false);
});
