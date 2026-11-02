import { test } from "node:test";
import assert from "node:assert/strict";
import { validateJavaScript } from "../lib/validate-javascript.js";
import { validateJavaScriptSyntax } from "../lib/validate-javascript-syntax.js";

test("accepts empty and modern module drafts without executing them", () => {
  assert.equal(validateJavaScript("").valid, true);
  assert.equal(validateJavaScript("window.example?.run(); throw new Error('not executed');").valid, true);
});

test("reports an actionable, one-based syntax error location", () => {
  const result = validateJavaScript("const good = 1;\nconst bad = ;");
  assert.equal(result.valid, false);
  assert.equal(result.line, 2);
  assert.equal(result.column, 13);
  assert.match(result.message, /line 2, column 13/);
});

test("uses module syntax and strict mode in both validation paths", () => {
  for (const validate of [validateJavaScript, validateJavaScriptSyntax]) {
    assert.equal(validate("await Promise.resolve(); const context = this;").valid, true);
    for (const code of ["return 1;", "with (window) {}", "const value = 1; delete value;"]) {
      assert.equal(validate(code).valid, false, code);
    }
  }
});

test("rejects imports and exports, including dynamic imports inside functions", () => {
  for (const validate of [validateJavaScript, validateJavaScriptSyntax]) {
    for (const code of [
      "import './other.js';",
      "import value from './other.js';",
      "export const value = 1;",
      "export default 1;",
      "export * from './other.js';",
      "export {};",
      "import('./other.js');",
      "async function later() { return await import('./other.js'); }",
    ]) {
      const result = validate(`// draft\n${code}`);
      assert.equal(result.valid, false, code);
      assert.equal(result.line, 2);
      assert.ok(result.column >= 1);
      assert.match(result.message, /Imports and exports are not supported/);
    }
    assert.equal(validate(`
      // import('./other.js');
      const label = "export default";
      const object = { import() { return label; } };
      object.import();
    `).valid, true);
  }
});

test("static validation leaves runtime failures to the preview", () => {
  for (const code of [
    "document.querySelector('#missing').remove();",
    "throw new Error('runtime only');",
    "Promise.reject(new Error('runtime only'));",
  ]) {
    const result = validateJavaScript(code);
    assert.equal(result.valid, true);
    assert.match(result.message, /Runtime errors observed in the preview are reported separately/);
  }
});

test("warns about undeclared identifiers without blocking preview or saving", () => {
  for (const code of ["vhhgcvhgccgfcg", "unknownFunction();", "const x = missing + 1;"]) {
    const result = validateJavaScript(code);
    assert.equal(result.valid, true);
    assert.equal(result.severity, "warning");
    assert.match(result.message, /is not defined/);
  }
});

test("respects declarations, function parameters, destructuring, and browser globals", () => {
  for (const code of [
    "var message = 'hello'; console.log(message);",
    "function show(value) { return value; } show(1);",
    "const { title } = document; console.log(title);",
    "document.querySelector('button').addEventListener('click', event => console.log(event.target));",
    "const obj = { name: 'example' }; console.log(obj.name);",
    "setTimeout(() => console.log(Math.random()), 100);",
  ]) assert.equal(validateJavaScript(code).valid, true, code);
});

test("warns about out-of-scope references and reports their location", () => {
  const result = validateJavaScript("function f(value) { return value; }\nvalue;");
  assert.equal(result.valid, true);
  assert.equal(result.severity, "warning");
  assert.equal(result.line, 2);
  assert.equal(result.column, 1);
});
