import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCSS } from "../lib/validate-css.js";

test("accepts empty CSS, custom properties, media queries, nesting and strings", () => {
  for (const css of [
    "",
    ":root { --accent: #123; } .card { color: var(--accent); }",
    "@media (min-width: 768px) { .card { display: grid; } }",
    '.card { &:hover { color: red; } content: "}"; }',
    '.card { background: url("image(1).png"); }',
  ]) assert.equal(validateCSS(css).valid, true, css);
});

test("reports recovered parser errors with one-based locations", () => {
  const result = validateCSS(".card {\n  color red;\n}");
  assert.equal(result.valid, false);
  assert.equal(result.line, 2);
  assert.ok(result.column > 0);
  assert.match(result.message, /Colon is expected/);
});

test("rejects unclosed and mismatched blocks without confusing string contents", () => {
  for (const css of [".card { color: red;", ".card { color: rgb(1, 2, 3; }", ".card ] {}"])
    assert.equal(validateCSS(css).valid, false, css);
});

test("does not claim property/value validation or fetch CSS imports", () => {
  assert.equal(validateCSS(".card { unknown-property: nonsense; }").valid, true);
  assert.equal(validateCSS('@import url("https://example.invalid/site.css");').valid, true);
  assert.match(validateCSS("").message, /safety are not checked/);
});

test("clearing CSS is valid and parser errors do not persist across drafts", () => {
  assert.equal(validateCSS(".card { color red; }").valid, false);
  assert.equal(validateCSS(".card { color: purple; }").valid, true);
  assert.equal(validateCSS("").valid, true);
});
