// This function runs inside the sandbox, before any draft JavaScript.
async function runPreview({ javascript, css, runId, componentCode }) {
  const report = (message) => {
    globalThis.parent.postMessage({ type: "preview-error", runId, message: String(message).slice(0, 2000) }, "*");
  };
  globalThis.addEventListener("error", (event) => report(event.message || "A preview resource failed to load."), true);
  globalThis.addEventListener("unhandledrejection", (event) => report(event.reason));

  try {
    const components = document.createElement("script");
    components.textContent = componentCode;
    document.head.append(components);
    let timeout;
    try {
      await Promise.race([
        customElements.whenDefined("ddd-card"),
        new Promise((resolve, reject) => {
          timeout = setTimeout(() => reject(new Error("Unable to initialize ddd-card.")), 10000);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
    await Promise.all(Array.from(document.querySelectorAll("ddd-card"), card => card.updateComplete));
  } catch (error) {
    report(`Component loading failed: ${error.message}`);
    return;
  }

  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);

  // Evaluate a separate module in this opaque-origin iframe. Awaiting import
  // waits for module evaluation, including top-level await, without wrapping
  // the draft in a function or exposing its declarations on window.
  const moduleUrl = URL.createObjectURL(new Blob(
    [`${javascript}\n//# sourceURL=custom-preview.js`],
    { type: "text/javascript" },
  ));
  try {
    await import(moduleUrl);
  } catch (error) {
    report(error?.message ?? error);
    return;
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
  globalThis.setTimeout(() => {
    globalThis.parent.postMessage({ type: "preview-ready", runId }, "*");
  }, 0);
}

/** Build a fresh fixture document; drafts are serialized as data, not HTML. */
export function createPreviewDocument(markup, stylesheet, fixtureUrl, drafts, runId, componentCode) {
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
  const data = JSON.stringify({ ...drafts, runId, componentCode }).replace(/</g, "\u003c");
  bootstrap.textContent = `(${runPreview.toString()})(${data});`;
  preview.body.append(bootstrap);
  return `<!doctype html>\n${preview.documentElement.outerHTML}`;
}
