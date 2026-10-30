// This function runs inside the sandbox, before any draft JavaScript.
function runPreview({ javascript, css, runId }) {
  const report = (message) => {
    globalThis.parent.postMessage({ type: "preview-error", runId, message: String(message).slice(0, 2000) }, "*");
  };
  globalThis.addEventListener("error", (event) => report(event.message || "A preview resource failed to load."), true);
  globalThis.addEventListener("unhandledrejection", (event) => report(event.reason));

  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);

  const script = document.createElement("script");
  script.textContent = `${javascript}\n//# sourceURL=custom-preview.js`;
  document.body.append(script);
  globalThis.setTimeout(() => {
    globalThis.parent.postMessage({ type: "preview-ready", runId }, "*");
  }, 0);
}

/** Build a fresh fixture document; drafts are serialized as data, not HTML. */
export function createPreviewDocument(markup, stylesheet, fixtureUrl, drafts, runId) {
  const preview = new DOMParser().parseFromString(markup, "text/html");
  for (const script of preview.querySelectorAll("script")) script.remove();
  for (const link of preview.querySelectorAll('link[rel="stylesheet"]')) link.remove();

  const base = preview.createElement("base");
  base.href = fixtureUrl;
  preview.head.prepend(base);

  const style = preview.createElement("style");
  style.textContent = stylesheet;
  preview.head.append(style);

  const bootstrap = preview.createElement("script");
  const data = JSON.stringify({ ...drafts, runId }).replace(/</g, "\\u003c");
  bootstrap.textContent = `(${runPreview.toString()})(${data});`;
  preview.body.append(bootstrap);
  return `<!doctype html>\n${preview.documentElement.outerHTML}`;
}
