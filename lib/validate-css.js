import { parse, tokenize, tokenTypes } from "css-tree";

/** Check stylesheet syntax without applying or rewriting the user's CSS. */
export function validateCSS(code) {
  let firstError;
  const blocks = [];
  const closingTokens = new Map([
    [tokenTypes.Function, tokenTypes.RightParenthesis],
    [tokenTypes.LeftParenthesis, tokenTypes.RightParenthesis],
    [tokenTypes.LeftSquareBracket, tokenTypes.RightSquareBracket],
    [tokenTypes.LeftCurlyBracket, tokenTypes.RightCurlyBracket],
  ]);

  // CSS parsers can silently close blocks at EOF. Report unfinished drafts
  // explicitly, using CSS tokens so brackets inside strings/URLs are ignored.
  tokenize(code, (type, start) => {
    let message;
    if (closingTokens.has(type)) {
      blocks.push({ expected: closingTokens.get(type), start });
    } else if ([tokenTypes.RightParenthesis, tokenTypes.RightSquareBracket, tokenTypes.RightCurlyBracket].includes(type)) {
      const block = blocks.pop();
      if (!block || block.expected !== type) message = "Unexpected closing bracket.";
    } else if (type === tokenTypes.BadString || type === tokenTypes.BadUrl) {
      message = "Malformed string or URL.";
    }
    if (message && !firstError) firstError = { offset: start, message };
  });

  if (!firstError && blocks.length) {
    firstError = { offset: blocks[0].start, message: "Unclosed block or function." };
  }

  try {
    parse(code, {
      positions: true,
      onParseError(error) {
        if (!firstError) firstError = error;
      },
    });
  } catch (error) {
    if (error.name !== "SyntaxError") throw error;
    if (!firstError) firstError = error;
  }

  if (firstError) {
    if (firstError.line === undefined) {
      const lines = code.slice(0, firstError.offset).split(/\r\n|[\r\n\f]/);
      firstError.line = lines.length;
      firstError.column = lines[lines.length - 1].length + 1;
    }
    return {
      valid: false,
      line: firstError.line,
      column: firstError.column,
      message: `CSS syntax error at line ${firstError.line}, column ${firstError.column}: ${firstError.message}`,
    };
  }

  return {
    valid: true,
    message: "No CSS syntax errors found. Property values, browser support, and safety are not checked.",
  };
}
