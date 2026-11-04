import { parse } from "acorn";

/** Parse module syntax while keeping user imports/exports out of scope. */
export function parseJavaScript(code) {
  const ast = parse(code, {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
    ranges: true,
  });

  // Inspect nodes, not text: reject nested dynamic imports without rejecting
  // comments, strings, or ordinary properties/functions named "import".
  const pending = [ast];
  const unsupported = new Set([
    "ImportDeclaration", "ImportExpression", "ExportNamedDeclaration",
    "ExportDefaultDeclaration", "ExportAllDeclaration",
  ]);
  while (pending.length) {
    const node = pending.pop();
    if (unsupported.has(node.type)) {
      const error = new SyntaxError("Imports and exports are not supported in custom JavaScript.");
      error.loc = node.loc.start;
      throw error;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child.type === "string") pending.push(child);
        }
      } else if (value && typeof value.type === "string") {
        pending.push(value);
      }
    }
  }
  return ast;
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
