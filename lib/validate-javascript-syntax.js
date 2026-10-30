import { parse } from "acorn";

/** Parse classic-script syntax consistently in the editor and save handler. */
export function parseJavaScript(code) {
  return parse(code, {
    ecmaVersion: "latest",
    sourceType: "script",
    locations: true,
    ranges: true,
  });
}

export function javaScriptSyntaxError(error) {
  if (!(error instanceof SyntaxError)) throw error;
  return {
    valid: false,
    line: error.loc.line,
    column: error.loc.column + 1,
    message: `JavaScript syntax error at line ${error.loc.line}, column ${error.loc.column + 1}: ${error.message}`,
  };
}

/** Validate syntax without executing code or checking site-supplied globals. */
export function validateJavaScriptSyntax(code) {
  try {
    parseJavaScript(code);
    return { valid: true };
  } catch (error) {
    return javaScriptSyntaxError(error);
  }
}
