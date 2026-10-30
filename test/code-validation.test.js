import { html, fixture, expect } from "@open-wc/testing";
import "../haxcms-code-workspace.js";
import "../haxcms-settings-panel.js";

describe("JavaScript validation integration", () => {
  async function setup() {
    const panel = await fixture(html`
      <haxcms-settings-panel .panelVisible=${false}>
        <haxcms-code-workspace>
          <code-editor language="javascript"></code-editor>
          <code-editor language="css"></code-editor>
        </haxcms-code-workspace>
      </haxcms-settings-panel>
    `);
    return {
      panel,
      workspace: panel.querySelector("haxcms-code-workspace"),
      editor: panel.querySelector('code-editor[language="javascript"]'),
    };
  }

  it("blocks invalid JavaScript saves and permits a corrected draft", async () => {
    const { panel, workspace, editor } = await setup();
    editor.value = "const broken = ;";
    expect(panel._validateCodeForSave()).to.equal(false);
    await workspace.updateComplete;
    expect(workspace.shadowRoot.querySelector('.validation-status').textContent).to.include("line 1");
    editor.value = "const fixed = 1;";
    expect(panel._validateCodeForSave()).to.equal(true);
    editor.value = "vhhgcvhgccgfcg";
    expect(panel._validateCodeForSave()).to.equal(false);
    await workspace.updateComplete;
    expect(workspace.shadowRoot.querySelector('.validation-status').textContent).to.include('"vhhgcvhgccgfcg" is not defined');
    panel.selectedLanguage = "css";
    editor.value = "const broken = ;";
    expect(panel._validateCodeForSave()).to.equal(true);
  });

  it("captures non-bubbling editor changes and cancels timers when removed", async () => {
    const { panel, workspace, editor } = await setup();
    editor.value = "const broken = ;";
    editor.dispatchEvent(new CustomEvent("value-changed"));
    await workspace.updateComplete;
    expect(workspace.shadowRoot.querySelector('.validation-status').textContent).to.include("Checking");
    await new Promise(resolve => setTimeout(resolve, 850));
    await workspace.updateComplete;
    expect(workspace.shadowRoot.querySelector('.validation-status').textContent).to.include("syntax error");
    editor.dispatchEvent(new CustomEvent("value-changed"));
    let notifications = 0;
    workspace.addEventListener("code-validation", () => notifications++);
    panel.remove();
    await new Promise(resolve => setTimeout(resolve, 850));
    expect(notifications).to.equal(0);
  });
});
