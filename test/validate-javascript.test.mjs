import { test } from "node:test";
import assert from "node:assert/strict";
import { validateJavaScript } from "../lib/validate-javascript.js";

test("accepts empty and modern classic scripts without executing them", () => {
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

test("uses classic script syntax, matching the current preview plan", () => {
  assert.equal(validateJavaScript("import x from './x.js';").valid, false);
  assert.equal(validateJavaScript("return 1;").valid, false);
});

test("does not claim to detect runtime problems", () => {
  assert.equal(validateJavaScript("document.querySelector('#missing').remove();").valid, true);
});

test("rejects the screenshot's bare undeclared identifier and unknown calls", () => {
  for (const code of ["vhhgcvhgccgfcg", "unknownFunction();", "const x = missing + 1;"]) {
    const result = validateJavaScript(code);
    assert.equal(result.valid, false);
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

test("rejects out-of-scope references and reports their location", () => {
  const result = validateJavaScript("function f(value) { return value; }\nvalue;");
  assert.equal(result.valid, false);
  assert.equal(result.line, 2);
  assert.equal(result.column, 1);
});
