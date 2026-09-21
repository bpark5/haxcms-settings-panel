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
});
