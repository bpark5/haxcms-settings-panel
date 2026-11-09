import { html, fixture, fixtureCleanup, expect, waitUntil } from "@open-wc/testing";
import "../haxcms-settings-panel.js";
import "../haxcms-code-workspace.js";
import { MockAuthorizationClient, saveMockCode } from "../lib/mock-authorization-client.js";

describe("Local save authorization flow", () => {
  let originalFetch;
  let time;
  let authentications;
  let saves;
  let rejectNextSave;
  let panel;
  let workspace;
  let prompt;
  let authorization;
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    time = Date.now();
    authentications = 0;
    saves = [];
    rejectNextSave = false;
    globalThis.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : input, document.baseURI);
      if (["/mock-site/custom.js", "/mock-site/custom.css"].includes(url.pathname)) return new Response("");
      return originalFetch(input, options);
    };
    authorization = new MockAuthorizationClient({ now: () => time, fetchImpl: async (url, options) => {
      if (url === "/mock-session") return json({ success: true, jwt: "signed-demo-jwt", userToken: "demo-token" });
      expect(options.headers.Authorization).to.equal("Bearer signed-demo-jwt");
      expect(options.headers["X-HAXCMS-User-Token"]).to.equal("demo-token");
      if (url === "/mock-authentication") {
        authentications++;
        return json({ success: true, nonce: `nonce-${authentications}`, expiresAt: time + 60_000, expiresInSeconds: 60 });
      }
      expect(url).to.equal("/mock-save-code");
      expect(options.headers["X-HAXCMS-Reauthentication"]).to.equal(`nonce-${authentications}`);
      saves.push(JSON.parse(options.body));
      if (rejectNextSave) {
        rejectNextSave = false;
        return json({ success: false, code: "REAUTH_REQUIRED", message: "Expired" }, 403);
      }
      return json({ success: true });
    } });
    panel = await fixture(html`
      <haxcms-settings-panel .authorization=${authorization}>
        <haxcms-code-workspace>
          <code-editor language="javascript"></code-editor>
          <code-editor language="css"></code-editor>
        </haxcms-code-workspace>
      </haxcms-settings-panel>
    `);
    workspace = panel.querySelector("haxcms-code-workspace");
    prompt = panel.shadowRoot.querySelector("haxcms-authentication-prompt");
    await ready();
  });
  afterEach(() => {
    fixtureCleanup();
    globalThis.fetch = originalFetch;
  });
  async function ready() {
    await waitUntil(() => workspace.canSavePreview, "Draft preview should be ready", { timeout: 5000 });
    await panel.updateComplete;
  }
  async function login() {
    await prompt.updateComplete;
    prompt.password = "demo123";
    prompt.continueAuthentication();
    await waitUntil(() => !prompt.opened && !prompt.authenticating);
  }
  async function edit(language, code) {
    const editor = workspace.querySelector(`code-editor[language="${language}"]`);
    editor.value = code;
    editor.dispatchEvent(new CustomEvent("value-changed"));
    await ready();
    return editor;
  }

  it("reuses opening authentication for JS and CSS, then prompts at exactly one minute", async () => {
    const events = [];
    panel.addEventListener("save-request", event => events.push(event.detail));
    expect(prompt.opened).to.equal(true);
    await login();
    expect(events).to.have.length(0);
    await edit("javascript", "// first draft");
    panel.shadowRoot.querySelector(".save-button").click();
    expect(events).to.deep.equal([{ language: "javascript", code: "// first draft" }]);
    expect(prompt.opened).to.equal(false);
    panel._setLanguage("css");
    await edit("css", ".page-title { color: purple; }");
    panel.shadowRoot.querySelector(".save-button").click();
    expect(events).to.have.length(2);
    expect(authentications).to.equal(1);
    time += 60_000;
    const editor = await edit("css", ".page-title { color: blue; }");
    panel.shadowRoot.querySelector(".save-button").click();
    expect(prompt.opened).to.equal(true);
    expect(events).to.have.length(2);
    prompt.closePrompt();
    expect(editor.value).to.equal(".page-title { color: blue; }");
    expect(workspace.querySelector('code-editor[language="javascript"]').value).to.equal("// first draft");
    panel.shadowRoot.querySelector(".save-button").click();
    await login();
    expect(events).to.have.length(3);
    expect(events[2].code).to.equal(".page-title { color: blue; }");
    expect(authentications).to.equal(2);
  });

  it("reauthenticates a server rejection, retries the submitted snapshot, and preserves newer edits", async () => {
    await login();
    const editor = await edit("javascript", "// submitted draft");
    await edit("css", "/* other draft */");
    rejectNextSave = true;
    const snapshot = { language: "javascript", code: "// submitted draft" };
    const saving = saveMockCode({ authorization, ...snapshot,
      reauthenticate: () => panel.requestReauthentication(snapshot) });
    await waitUntil(() => prompt.opened);
    await edit("javascript", "// newer draft");
    await login();
    const result = await saving;
    expect(result.success).to.equal(true);
    workspace.markSaved(snapshot.language, snapshot.code);
    expect(saves).to.deep.equal([snapshot, snapshot]);
    expect(editor.value).to.equal("// newer draft");
    expect(workspace.hasUnsavedChanges("javascript")).to.equal(true);
    expect(workspace.querySelector('code-editor[language="css"]').value).to.equal("/* other draft */");
  });

  it("cancelling server-requested reauthentication leaves both drafts and saved state intact", async () => {
    await login();
    await edit("javascript", "// keep JS");
    await edit("css", "/* keep CSS */");
    rejectNextSave = true;
    const snapshot = { language: "javascript", code: "// keep JS" };
    const saving = saveMockCode({ authorization, ...snapshot,
      reauthenticate: () => panel.requestReauthentication(snapshot) });
    await waitUntil(() => prompt.opened);
    prompt.closePrompt();
    expect(await saving).to.equal(null);
    expect(saves).to.have.length(1);
    expect(workspace._savedDrafts).to.deep.equal({ javascript: "", css: "" });
    expect(workspace.querySelector('code-editor[language="javascript"]').value).to.equal("// keep JS");
    expect(workspace.querySelector('code-editor[language="css"]').value).to.equal("/* keep CSS */");
  });
});
