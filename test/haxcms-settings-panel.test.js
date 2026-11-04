import { html, fixture, expect } from '@open-wc/testing';
import "../haxcms-settings-panel.js";

describe("HaxcmsSettingsPanel test", () => {
  let element;
  beforeEach(async () => {
    element = await fixture(html`
      <haxcms-settings-panel
        title="title"
      ></haxcms-settings-panel>
    `);
  });

  it("basic will it blend", async () => {
    expect(element).to.exist;
  });

  it("passes the a11y audit", async () => {
    await expect(element).shadowDom.to.be.accessible();
  });

  it("collapses and expands navigation without replacing the editor slot", async () => {
    element.shadowRoot.querySelector("haxcms-authentication-prompt").opened = false;
    const slot = element.shadowRoot.querySelector("slot");
    const toggle = element.shadowRoot.querySelector(".collapse-button");
    toggle.click();
    await element.updateComplete;
    expect(toggle.getAttribute("aria-expanded")).to.equal("false");
    expect(toggle.getAttribute("aria-label")).to.equal("Expand menu");
    expect(element.shadowRoot.querySelector("slot")).to.equal(slot);
    toggle.click();
    await element.updateComplete;
    expect(toggle.getAttribute("aria-expanded")).to.equal("true");
    expect(element.shadowRoot.querySelector("slot")).to.equal(slot);
  });
});
