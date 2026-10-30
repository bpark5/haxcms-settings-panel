import { parse } from "acorn";
import { analyze } from "eslint-scope";
import globals from "globals";

const browserGlobals = new Set(Object.keys({ ...globals.browser, ...globals.es2025 }));

/** Parse without executing. Match the classic scripts used by the preview. */
export function validateJavaScript(code) {
  try {
    const ast = parse(code, {
      ecmaVersion: "latest",
      sourceType: "script",
      locations: true,
      ranges: true,
    });
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
        valid: false,
        line: identifier.loc.start.line,
        column: identifier.loc.start.column + 1,
        message: `JavaScript error at line ${identifier.loc.start.line}, column ${identifier.loc.start.column + 1}: "${identifier.name}" is not defined.`,
      };
    }
    return { valid: true, message: "No syntax or undefined-variable errors found. Runtime behavior is not checked." };
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return {
      valid: false,
      line: error.loc.line,
      column: error.loc.column + 1,
      message: `JavaScript syntax error at line ${error.loc.line}, column ${error.loc.column + 1}: ${error.message}`,
    };
  }
}
