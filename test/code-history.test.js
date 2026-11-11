import { html, fixture, fixtureCleanup, expect, waitUntil } from "@open-wc/testing";
import "../haxcms-code-history.js";
import "../haxcms-code-workspace.js";
import "../haxcms-settings-panel.js";

describe("Customization history", () => {
  let originalFetch;
  let originalConfirm;
  let requests;
  const versions = {
    javascript: [
      { id: "js-old", createdAt: "2026-11-01T12:00:00Z", kind: "save", code: "document.querySelector('#page-title').textContent = 'Restored title';" },
      { id: "js-source", createdAt: "2026-11-01T11:00:00Z", kind: "preserved", code: '<img src=x onerror="parent.historyExecuted = true">' },
    ],
    css: [{ id: "css-empty", createdAt: "2026-11-01T12:00:00Z", kind: "preserved", code: "" }],
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalConfirm = globalThis.confirm;
    requests = [];
    globalThis.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : input, document.baseURI);
      requests.push(url.pathname);
      if (url.pathname === "/mock-save-code") throw new Error("History must not save automatically.");
      if (url.pathname.startsWith("/mock-code-history")) {
        const language = url.searchParams.get("language");
        const entries = versions[language];
        const id = url.pathname.split("/")[2];
        const payload = id
          ? { success: true, revision: entries.find(item => item.id === id) }
          : { success: true, revisions: entries.map(({ code, ...metadata }) => metadata) };
        return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json" } });
      }
      if ((url.pathname === "/mock-code-source" || ["/mock-site/custom.js", "/mock-site/custom.css"].includes(url.pathname))) return new Response("");
      return originalFetch(input, options);
    };
  });

  afterEach(() => {
    fixtureCleanup();
    globalThis.fetch = originalFetch;
    globalThis.confirm = originalConfirm;
  });

  async function openHistory(workspace) {
    const panel = workspace.closest("haxcms-settings-panel");
    panel.selectedLanguage = workspace.selectedLanguage;
    await panel.updateComplete;
    panel.shadowRoot.querySelector(".history-button").click();
    await waitUntil(() => panel.shadowRoot.querySelector(".history-dialog").open);
    const history = panel.shadowRoot.querySelector("haxcms-code-history");
    await waitUntil(() => !history._loading && history._revisions.length > 0);
    return history;
  }

  async function select(history, id) {
    await history._read(id);
    await history.updateComplete;
  }

  async function setup() {
    const panel = await fixture(html`
      <haxcms-settings-panel>
        <haxcms-code-workspace>
          <code-editor language="javascript"></code-editor>
          <code-editor language="css"></code-editor>
        </haxcms-code-workspace>
      </haxcms-settings-panel>
    `);
    panel.shadowRoot.querySelector("haxcms-authentication-prompt").opened = false;
    const workspace = panel.querySelector("haxcms-code-workspace");
    await waitUntil(() => workspace.canSavePreview, "Initial preview should run", { timeout: 5000 });
    return workspace;
  }

  it("renders revision source as text without executing it or changing the draft", async () => {
    const workspace = await setup();
    const history = await openHistory(workspace);
    await select(history, "js-source");
    expect(history.shadowRoot.querySelector("pre").textContent).to.equal(versions.javascript[1].code);
    expect(history.shadowRoot.querySelector("img")).to.equal(null);
    expect(workspace._readDrafts().javascript).to.equal("");
    expect(requests).not.to.include("/mock-save-code");
  });

  it("loads a revision as a draft and previews it without saving or replacing the other language", async () => {
    const workspace = await setup();
    const history = await openHistory(workspace);
    await select(history, "js-old");
    history.shadowRoot.querySelector(".load-revision").click();
    await waitUntil(() => workspace._readDrafts().javascript === versions.javascript[0].code);
    await waitUntil(() => workspace.canSavePreview, "Loaded draft should be validated and run", { timeout: 5000 });
    expect(workspace._readDrafts().css).to.equal("");
    expect(workspace._savedDrafts.javascript).to.equal("");
    expect(workspace._historyNotice).to.include("Nothing has been saved");
    const panel = workspace.closest("haxcms-settings-panel");
    await panel.updateComplete;
    expect(panel.shadowRoot.querySelector(".draft-status").textContent).to.include("1 unsaved change");
    expect(panel.shadowRoot.querySelector(".history-dialog").open).to.equal(false);
    expect(requests).not.to.include("/mock-save-code");
  });

  it("allows cancellation of unsaved-draft replacement and loads empty CSS exactly", async () => {
    const workspace = await setup();
    const css = workspace.querySelector('code-editor[language="css"]');
    css.value = "body { color: red; }";
    workspace.selectedLanguage = "css";
    css.dispatchEvent(new CustomEvent("value-changed"));
    const history = await openHistory(workspace);
    await select(history, "css-empty");
    let confirmations = 0;
    globalThis.confirm = () => { confirmations++; return false; };
    await workspace.loadHistoryRevision("css", versions.css[0]);
    expect(css.value).to.equal("body { color: red; }");
    expect(confirmations).to.equal(1);
    globalThis.confirm = () => true;
    await workspace.loadHistoryRevision("css", versions.css[0]);
    expect(css.value).to.equal("");
    expect(workspace._readDrafts().javascript).to.equal("");
    expect(requests).not.to.include("/mock-save-code");
  });

  it("tracks the saved snapshot rather than edits typed while a save is pending", async () => {
    const workspace = await setup();
    const editor = workspace.querySelector('code-editor[language="javascript"]');
    editor.value = "// newer unsaved draft";
    editor.dispatchEvent(new CustomEvent("value-changed"));
    workspace.markSaved("javascript", "// older submitted draft");
    await workspace.updateComplete;
    expect(editor.value).to.equal("// newer unsaved draft");
    expect(workspace._savedDrafts.javascript).to.equal("// older submitted draft");
    const panel = workspace.closest("haxcms-settings-panel");
    await panel.updateComplete;
    expect(panel.shadowRoot.querySelector(".draft-status").textContent).to.include("1 unsaved change");
  });

  it("ignores history responses from the previous language", async () => {
    const history = await fixture(html`<haxcms-code-history></haxcms-code-history>`);
    await waitUntil(() => !history._loading && history._revisions.length > 0);
    const fetch = globalThis.fetch;
    let resolveOld;
    globalThis.fetch = (url, options) => {
      if (String(url).includes("/js-old")) return new Promise(resolve => { resolveOld = resolve; });
      return fetch(url, options);
    };
    const old = history._read("js-old");
    history.language = "css";
    await history.updateComplete;
    await waitUntil(() => !history._loading && history._revisions.length > 0 && history._revisions[0].id === "css-empty");
    resolveOld(new Response(JSON.stringify({ success: true, revision: versions.javascript[0] }), {
      headers: { "Content-Type": "application/json" },
    }));
    await old;
    expect(history._selected).to.equal(null);
    expect(history._revisions[0].id).to.equal("css-empty");
  });

  it("does not fetch during server-render lifecycle work and refreshes on reconnect", async () => {
    const history = document.createElement("haxcms-code-history");
    history.willUpdate(new Map([["language", undefined]]));
    expect(requests).not.to.include("/mock-code-history");
    const container = await fixture(html`<div></div>`);
    container.append(history);
    await waitUntil(() => !history._loading && history._revisions.length > 0);
    const before = requests.filter(path => path === "/mock-code-history").length;
    history.remove();
    container.append(history);
    await waitUntil(() => !history._loading && history._revisions.length > 0);
    expect(requests.filter(path => path === "/mock-code-history").length).to.equal(before + 1);
  });

  it("ignores a pending history response after disconnect and a newer reconnect response", async () => {
    const history = await fixture(html`<haxcms-code-history></haxcms-code-history>`);
    await waitUntil(() => !history._loading && history._revisions.length > 0);
    const fetch = globalThis.fetch;
    let resolveOld;
    globalThis.fetch = () => new Promise(resolve => { resolveOld = resolve; });
    const pending = history.refresh();
    const parent = history.parentNode;
    history.remove();
    globalThis.fetch = fetch;
    parent.append(history);
    await waitUntil(() => !history._loading && history._revisions.length > 0);
    resolveOld(new Response(JSON.stringify({ success: true, revisions: [] }), {
      headers: { "Content-Type": "application/json" },
    }));
    await pending;
    expect(history._revisions[0].id).to.equal("js-old");
  });

  it("updates the mounted Monaco editor when loading an empty revision", async function () {
    this.timeout(20000);
    await import("@haxtheweb/code-editor/code-editor.js");
    const workspace = await setup();
    const editor = workspace.querySelector('code-editor[language="css"]');
    await waitUntil(() => editor.ready, "Monaco should initialize", { timeout: 15000 });
    workspace.selectedLanguage = "css";
    await workspace.loadHistoryRevision("css", { code: "body { color: purple; }" });
    globalThis.confirm = () => true;
    await workspace.loadHistoryRevision("css", { code: "" });
    const monaco = editor.shadowRoot.querySelector("#codeeditor");
    await monaco.updateComplete;
    expect(editor.value).to.equal("");
    expect(monaco.value).to.equal("");
    expect(requests).not.to.include("/mock-save-code");
  });

  it("restores previously loaded text after typing in the actual Monaco model", async function () {
    this.timeout(20000);
    await import("@haxtheweb/code-editor/code-editor.js");
    const workspace = await setup();
    const editor = workspace.querySelector('code-editor[language="javascript"]');
    await waitUntil(() => editor.ready, "Monaco should initialize", { timeout: 15000 });
    const monaco = editor.shadowRoot.querySelector("#codeeditor");
    const model = monaco.iframe.contentWindow.monaco.editor.getModels()[0];
    const oldCode = versions.javascript[0].code;
    await workspace.loadHistoryRevision("javascript", { code: oldCode });
    await waitUntil(() => model.getValue() === oldCode);
    const newCode = 'document.querySelector("#page-title").textContent = "Version B";';
    // Typing updates the iframe model and wrapper, but not monaco-element.value.
    model.setValue(newCode);
    await waitUntil(() => editor.value === newCode);
    workspace.markSaved("javascript", newCode);
    expect(monaco.value).to.equal(oldCode);

    const history = await openHistory(workspace);
    await select(history, "js-old");
    history.shadowRoot.querySelector(".load-revision").click();
    await waitUntil(() => model.getValue() === oldCode, "The visible Monaco model should restore version A");
    await waitUntil(() => workspace.canSavePreview, "Restored source should run in the preview", { timeout: 5000 });
    expect(editor.value).to.equal(oldCode);
    expect(workspace.hasUnsavedChanges("javascript")).to.equal(true);
    expect(workspace._savedDrafts.javascript).to.equal(newCode);
    expect(requests).not.to.include("/mock-save-code");
  });

  it("keeps a restored revision after the demo language handler updates editor visibility", async function () {
    this.timeout(20000);
    await import("@haxtheweb/code-editor/code-editor.js");
    const workspace = await setup();
    const panel = workspace.closest("haxcms-settings-panel");
    const editor = workspace.querySelector('code-editor[language="javascript"]');
    await waitUntil(() => editor.ready, "Monaco should initialize", { timeout: 15000 });
    const monaco = editor.shadowRoot.querySelector("#codeeditor");
    const model = monaco.iframe.contentWindow.monaco.editor.getModels()[0];
    const saved = 'document.querySelector("#page-title").textContent = "Version B";';
    editor.editorValue = saved;
    await waitUntil(() => model.getValue() === saved && editor.value === saved);
    workspace.markSaved("javascript", saved);
    panel.addEventListener("language-change", event => {
      for (const item of workspace.querySelectorAll("code-editor")) {
        item.hidden = item.language !== event.detail.language;
      }
    });
    const history = await openHistory(workspace);
    await select(history, "js-old");
    history.shadowRoot.querySelector(".load-revision").click();
    await waitUntil(() => !panel.shadowRoot.querySelector(".history-dialog").open);
    await waitUntil(() => workspace.canSavePreview, "Restored preview should settle", { timeout: 5000 });
    expect(model.getValue()).to.equal(versions.javascript[0].code);
    expect(editor.value).to.equal(versions.javascript[0].code);
    expect(workspace.hasUnsavedChanges()).to.equal(true);
  });

  it("opens from the panel action bar, closes on cancel, and restores focus", async () => {
    const workspace = await setup();
    const panel = workspace.closest("haxcms-settings-panel");
    await openHistory(workspace);
    const dialog = panel.shadowRoot.querySelector(".history-dialog");
    expect(dialog.matches(":modal")).to.equal(true);
    expect(workspace.shadowRoot.querySelector(".history-controls")).to.equal(null);
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    await waitUntil(() => !dialog.open);
    await waitUntil(() => panel.shadowRoot.activeElement === panel.shadowRoot.querySelector(".history-button"));
    expect(workspace._readDrafts()).to.deep.equal({ javascript: "", css: "" });
  });

  it("switches history languages independently and keeps the popup open on canceled replacement", async () => {
    const workspace = await setup();
    const panel = workspace.closest("haxcms-settings-panel");
    const history = await openHistory(workspace);
    history._chooseLanguage("css");
    await history.updateComplete;
    await waitUntil(() => !history._loading && history._revisions.length > 0 && history._revisions[0].id === "css-empty");
    expect(panel.selectedLanguage).to.equal("javascript");
    const css = workspace.querySelector('code-editor[language="css"]');
    css.value = "body { color: purple; }";
    globalThis.confirm = () => false;
    await panel._loadHistoryRevision({ detail: { language: "css", revision: versions.css[0] } });
    expect(panel.shadowRoot.querySelector(".history-dialog").open).to.equal(true);
    expect(css.value).to.equal("body { color: purple; }");
    globalThis.confirm = () => true;
    await panel._loadHistoryRevision({ detail: { language: "css", revision: versions.css[0] } });
    expect(panel.selectedLanguage).to.equal("css");
    expect(workspace.selectedLanguage).to.equal("css");
    expect(panel.shadowRoot.querySelector(".history-dialog").open).to.equal(false);
    expect(requests).not.to.include("/mock-save-code");
  });

  for (const language of ["javascript", "css"]) {
    it(`discards only the selected ${language} draft in the visible Monaco editor without saving`, async function () {
      this.timeout(20000);
      await import("@haxtheweb/code-editor/code-editor.js");
      const workspace = await setup();
      const panel = workspace.closest("haxcms-settings-panel");
      panel._setLanguage(language);
      workspace.selectedLanguage = language;
      const editor = workspace.querySelector(`code-editor[language="${language}"]`);
      await waitUntil(() => editor.ready, "Monaco should initialize", { timeout: 15000 });
      const model = editor.shadowRoot.querySelector("#codeeditor").iframe.contentWindow.monaco.editor.getModels()[0];
      const saved = language === "javascript" ? "// saved JavaScript" : "body { color: purple; }";
      editor.editorValue = saved;
      await waitUntil(() => model.getValue() === saved && editor.value === saved);
      workspace.markSaved(language, saved);
      const otherLanguage = language === "javascript" ? "css" : "javascript";
      const other = workspace.querySelector(`code-editor[language="${otherLanguage}"]`);
      other.value = "/* keep this other draft */";
      other.dispatchEvent(new CustomEvent("value-changed"));
      model.setValue(language === "javascript" ? "// unsaved JavaScript" : "body { color: red; }");
      await waitUntil(() => workspace.hasUnsavedChanges(language));
      await waitUntil(() => workspace.canSavePreview, "Draft preview should settle", { timeout: 5000 });
      await panel.updateComplete;
      expect(panel.shadowRoot.querySelector(".save-button").disabled).to.equal(false);
      panel.shadowRoot.querySelector(".discard-button").click();
      await waitUntil(() => model.getValue() === saved && !workspace.hasUnsavedChanges(language));
      await panel.updateComplete;
      expect(other.value).to.equal("/* keep this other draft */");
      expect(panel.shadowRoot.querySelector(".save-button").disabled).to.equal(true);
      expect(panel.shadowRoot.querySelector(".discard-button").disabled).to.equal(true);
      expect(requests).not.to.include("/mock-save-code");
    });
  }
});
