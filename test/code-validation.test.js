import { html, fixture, fixtureCleanup, expect, waitUntil } from "@open-wc/testing";
import "../haxcms-code-workspace.js";
import "../haxcms-settings-panel.js";

describe("Draft preview and Save validation", () => {
  let originalFetch;
  let saveRequests;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    saveRequests = 0;
    globalThis.fetch = (input, options) => {
      const url = new URL(input instanceof Request ? input.url : input, document.baseURI);
      // Do not execute or change customizations saved during manual testing.
      if (["/mock-site/custom.js", "/mock-site/custom.css"].includes(url.pathname)) {
        return Promise.resolve(new Response("", { status: 200 }));
      }
      if (url.pathname === "/mock-save-code") {
        saveRequests++;
        throw new Error("Preview tests must not write saved files.");
      }
      return originalFetch(input, options);
    };
  });

  afterEach(() => {
    fixtureCleanup();
    globalThis.fetch = originalFetch;
  });

  async function setup() {
    const panel = await fixture(html`
      <haxcms-settings-panel .panelVisible=${false}>
        <haxcms-code-workspace>
          <code-editor language="javascript"></code-editor>
          <code-editor language="css"></code-editor>
        </haxcms-code-workspace>
      </haxcms-settings-panel>
    `);
    const workspace = panel.querySelector("haxcms-code-workspace");
    const state = {
      panel, workspace,
      javascript: workspace.querySelector('code-editor[language="javascript"]'),
      css: workspace.querySelector('code-editor[language="css"]'),
      save: panel.shadowRoot.querySelector(".action-button"),
    };
    await ready(state);
    return state;
  }

  async function ready({ panel, workspace }) {
    await waitUntil(() => workspace.canSavePreview, "Current preview should become ready", { timeout: 5000 });
    await panel.updateComplete;
  }

  function edit(state, language, code) {
    state[language].value = code;
    state[language].dispatchEvent(new CustomEvent("value-changed"));
  }

  async function runtimeFailure(state, message) {
    await waitUntil(() => (state.workspace._runtimeError || "").includes(message), "Runtime error should be reported", { timeout: 5000 });
    await state.panel.updateComplete;
    expect(state.save.disabled).to.equal(true);
    expect(state.panel._validateCodeForSave()).to.equal(false);
  }

  it("automatically applies both drafts in a fresh sandbox without saving", async () => {
    const state = await setup();
    const oldFrame = state.workspace.shadowRoot.querySelector("iframe");
    let observed;
    const listener = event => {
      const frame = state.workspace.shadowRoot.querySelector("iframe");
      if (event.source === frame.contentWindow && event.data.type === "draft-result") observed = event.data;
    };
    globalThis.addEventListener("message", listener);
    try {
      edit(state, "css", ".page-title { color: rgb(102, 51, 153); }");
      edit(state, "javascript", `
        document.querySelector('#page-title').textContent = 'Draft title';
        parent.postMessage({ type: 'draft-result',
          title: document.querySelector('#page-title').textContent,
          color: getComputedStyle(document.querySelector('#page-title')).color
        }, '*');
      `);
      await state.panel.updateComplete;
      expect(state.save.disabled).to.equal(true);
      await waitUntil(() => observed, "Draft should execute without Save", { timeout: 5000 });
      await ready(state);
      expect(observed.title).to.equal("Draft title");
      expect(observed.color).to.equal("rgb(102, 51, 153)");
      const frame = state.workspace.shadowRoot.querySelector("iframe");
      expect(frame).not.to.equal(oldFrame);
      expect(frame.getAttribute("sandbox")).to.equal("allow-scripts");
      expect(state.save.disabled).to.equal(false);
      expect(saveRequests).to.equal(0);
    } finally {
      globalThis.removeEventListener("message", listener);
    }
  });

  for (const [language, invalid] of [
    ["javascript", "const broken = ;"],
    ["css", ".page-title { color red; }"],
  ]) {
    it(`preserves the preview and disables Save for invalid ${language}`, async () => {
      const state = await setup();
      state.panel._setLanguage(language);
      state.workspace.selectedLanguage = language;
      const previous = state.workspace._previewDocument;
      const oldFrame = state.workspace.shadowRoot.querySelector("iframe");
      let saveEvents = 0;
      state.panel.addEventListener("save-request", () => saveEvents++);
      edit(state, language, invalid);
      await state.panel.updateComplete;
      expect(state.save.disabled).to.equal(true);
      await waitUntil(() => (state.workspace._validationMessages[language] || "").includes("syntax error"));
      expect(state.workspace._previewDocument).to.equal(previous);
      expect(state.workspace.shadowRoot.querySelector("iframe")).to.equal(oldFrame);
      expect(state.workspace._previewStale).to.equal(true);
      state.save.click();
      expect(saveEvents).to.equal(0);
      expect(state.panel._validateCodeForSave()).to.equal(false);
      edit(state, language, language === "css" ? ".page-title { color: purple; }" : "console.log('fixed');");
      await ready(state);
      expect(state.save.disabled).to.equal(false);
      expect(saveRequests).to.equal(0);
    });
  }

  it("allows scope warnings when the flagged reference is not executed", async () => {
    const state = await setup();
    edit(state, "javascript", "function later() { return siteProvidedGlobal; }");
    await ready(state);
    expect(state.workspace._validationMessages.javascript).to.include("scope warning");
    expect(state.workspace._runtimeError || "").to.equal("");
    expect(state.save.disabled).to.equal(false);
    expect(state.panel._validateCodeForSave()).to.equal(true);
  });

  for (const code of [
    "throw new Error('immediate failure');",
    "Promise.reject(new Error('immediate failure'));",
  ]) {
    it(`blocks Save for an observed error: ${code}`, async () => {
      const state = await setup();
      edit(state, "javascript", code);
      await runtimeFailure(state, "immediate failure");
      state.panel._setLanguage("css");
      state.workspace.selectedLanguage = "css";
      await state.panel.updateComplete;
      expect(state.save.disabled).to.equal(true);
      expect(state.panel._validateCodeForSave()).to.equal(false);
      let saves = 0;
      state.panel.addEventListener("save-request", () => saves++);
      await state.panel.handleAuthenticationSuccess({ detail: { required: false } });
      expect(saves).to.equal(0);
      edit(state, "javascript", "console.log('recovered');");
      await ready(state);
      expect(state.workspace._runtimeError).to.equal("");
      expect(state.save.disabled).to.equal(false);
    });
  }

  it("disables an initially enabled Save when a delayed error arrives", async () => {
    const state = await setup();
    edit(state, "javascript", "setTimeout(() => { throw new Error('delayed failure'); }, 1000);");
    await ready(state);
    expect(state.save.disabled).to.equal(false);
    await runtimeFailure(state, "delayed failure");
  });

  it("reports interaction failures from the real sandboxed frame", async () => {
    const state = await setup();
    edit(state, "javascript", `
      document.querySelector('#preview-action').addEventListener('click', () => {
        throw new Error('button failure');
      });
      addEventListener('message', event => {
        if (event.source === parent && event.data === 'test-click') {
          document.querySelector('#preview-action').click();
        }
      });
    `);
    await ready(state);
    expect(state.save.disabled).to.equal(false);
    state.workspace.shadowRoot.querySelector("iframe").contentWindow.postMessage("test-click", "*");
    await runtimeFailure(state, "button failure");
  });

  it("ignores stale run messages and messages outside the current iframe", async () => {
    const state = await setup();
    const oldSource = state.workspace.shadowRoot.querySelector("iframe").contentWindow;
    const oldRun = state.workspace._previewRun;
    edit(state, "javascript", "console.log('new run');");
    await ready(state);
    const currentSource = state.workspace.shadowRoot.querySelector("iframe").contentWindow;
    for (const [source, runId] of [
      [oldSource, oldRun], [currentSource, oldRun], [globalThis, state.workspace._previewRun],
    ]) {
      globalThis.dispatchEvent(new MessageEvent("message", {
        source, data: { type: "preview-error", runId, message: "stale failure" },
      }));
    }
    expect(state.workspace._runtimeError || "").to.equal("");
    expect(state.workspace.canSavePreview).to.equal(true);
  });
});
