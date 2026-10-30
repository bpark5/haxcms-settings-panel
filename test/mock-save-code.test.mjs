import { test } from "node:test";
import assert from "node:assert/strict";
import { createMockSaveCode } from "../web-dev-server.config.mjs";

function request(payload, overrides = {}) {
  return {
    path: "/mock-save-code",
    method: "POST",
    is: type => type === "application/json",
    set() {},
    req: [Buffer.from(JSON.stringify(payload))],
    ...overrides,
  };
}

test("saves each language to its fixed file, including clearing CSS", async () => {
  const writes = [];
  const save = createMockSaveCode(async (...args) => writes.push(args));
  for (const [language, code, file] of [
    ["css", ".page-title { color: purple; }", "custom.css"],
    ["javascript", "console.log('saved');", "custom.js"],
    ["css", "", "custom.css"],
    ["javascript", "", "custom.js"],
    ["javascript", "siteProvidedGlobal();", "custom.js"],
  ]) {
    const context = request({ language, code, path: "../../elsewhere" });
    await save(context);
    assert.equal(context.status, 200);
    assert.equal(context.body.success, true);
    const [destination, text, encoding] = writes.at(-1);
    assert.ok(destination.pathname.endsWith(`/mock-site/${file}`));
    assert.equal(text, code);
    assert.equal(encoding, "utf8");
  }
  assert.equal(writes.length, 5);
});

test("rejects invalid syntax before writing either saved file", async () => {
  let writes = 0;
  const save = createMockSaveCode(async () => writes++);
  for (const [language, code] of [
    ["javascript", "const broken = ;"],
    ["javascript", "import x from './x.js';"],
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
