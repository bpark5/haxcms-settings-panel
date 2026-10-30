import { parseJavaScript, javaScriptSyntaxError } from "./validate-javascript-syntax.js";
import { analyze } from "eslint-scope";
import globals from "globals";

const browserGlobals = new Set(Object.keys({ ...globals.browser, ...globals.es2025 }));

/** Parse without executing. Match the classic scripts used by the preview. */
export function validateJavaScript(code) {
  try {
    const ast = parseJavaScript(code);
    const scopes = analyze(ast, {
      ecmaVersion: 2025,
      sourceType: "script",
      optimistic: true,
      ignoreEval: true,
    });
    const unresolved = scopes.globalScope.through
      .filter(reference => !browserGlobals.has(reference.identifier.name))
      .sort((a, b) => a.identifier.start - b.identifier.start);
    if (unresolved.length) {
      const identifier = unresolved[0].identifier;
      return {
        valid: true,
        severity: "warning",
        line: identifier.loc.start.line,
        column: identifier.loc.start.column + 1,
        message: `JavaScript scope warning at line ${identifier.loc.start.line}, column ${identifier.loc.start.column + 1}: "${identifier.name}" is not defined in this draft or the known browser globals. It may be supplied by another site script. Preview and Save are allowed; safety is not established.`,
      };
    }
    return { valid: true, message: "No syntax errors or scope warnings found. Runtime errors observed in the preview are reported separately." };
  } catch (error) {
    return javaScriptSyntaxError(error);
  }
}
