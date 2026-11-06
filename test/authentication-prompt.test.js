import { html, fixture, expect, waitUntil } from "@open-wc/testing";
import "../haxcms-authentication-prompt.js";
import { setViewport } from "@web/test-runner-commands";

describe("Authentication prompt", () => {
  let prompt;
  beforeEach(async () => {
    prompt = await fixture(html`<haxcms-authentication-prompt></haxcms-authentication-prompt>`);
    prompt.username = "admin";
    prompt.open(false);
    await prompt.updateComplete;
    await prompt.shadowRoot.querySelector("#password").updateComplete;
  });
  afterEach(async () => { await setViewport({ width: 1024, height: 768 }); });

  it("shows the supplied account in the HAX login design", () => {
    const root = prompt.shadowRoot;
    expect(root.querySelector(".titlebar").textContent).to.include("Login to HAX");
    expect(root.querySelector("rpg-character").getAttribute("seed")).to.equal("admin");
    expect(root.querySelector(".welcome").textContent).to.include("Welcome back, admin!");
    expect(root.querySelector(".continue-button").disabled).to.equal(true);
  });

  it("keeps the password when toggling visibility and cancels without saving", async () => {
    prompt.password = "test-value";
    await prompt.updateComplete;
    prompt.shadowRoot.querySelector(".show-password").click();
    await prompt.updateComplete;
    expect(prompt.password).to.equal("test-value");
    expect(prompt.shadowRoot.querySelector(".show-password").getAttribute("aria-pressed")).to.equal("true");
    let cancelled = false;
    prompt.addEventListener("authentication-cancel", () => cancelled = true);
    prompt.shadowRoot.querySelector(".close-button").click();
    expect(cancelled).to.equal(true);
    expect(prompt.opened).to.equal(false);
    expect(prompt.password).to.equal("");
  });

  it("required mode returns to settings through its secondary action", async () => {
    prompt.open(true);
    await prompt.updateComplete;
    expect(prompt.shadowRoot.querySelector(".welcome").textContent).to.include("Welcome back, admin!");
    let screen;
    prompt.addEventListener("breadcrumb-click", event => screen = event.detail.screen);
    prompt.shadowRoot.querySelector(".close-button").click();
    expect(screen).to.equal("settings");
    expect(prompt.opened).to.equal(false);
  });

  it("shows failure feedback and passes accessibility checks", async () => {
    prompt.authenticationFailed("Incorrect password. Try again.");
    await prompt.updateComplete;
    expect(prompt.shadowRoot.querySelector('[role="alert"]').textContent).to.include("Incorrect password");
    await expect(prompt).shadowDom.to.be.accessible();
  });

  it("shows verification status with disabled controls", async () => {
    prompt.password = "test-value";
    prompt.authenticating = true;
    await prompt.updateComplete;
    expect(prompt.shadowRoot.querySelector('[role="dialog"]').getAttribute("aria-busy")).to.equal("true");
    expect(prompt.shadowRoot.querySelector(".continue-button").textContent).to.include("Authenticating");
    expect(prompt.shadowRoot.querySelector(".authentication-status")).to.equal(null);
    expect(prompt.shadowRoot.querySelector(".continue-button").disabled).to.equal(true);
    expect(prompt.shadowRoot.querySelector(".show-password").disabled).to.equal(true);
  });

  it("keeps the dialog and actions inside a phone viewport", async () => {
    await setViewport({ width: 360, height: 640 });
    const dialog = prompt.shadowRoot.querySelector('[role="dialog"]');
    const bounds = dialog.getBoundingClientRect();
    expect(bounds.left).to.be.at.least(0);
    expect(bounds.right).to.be.at.most(360);
    expect(bounds.bottom).to.be.at.most(640);
    const action = prompt.shadowRoot.querySelector('.continue-button').getBoundingClientRect();
    expect(action.bottom).to.be.at.most(640);
    expect(dialog.scrollWidth).to.be.at.most(dialog.clientWidth);
    await expect(prompt).shadowDom.to.be.accessible();
  });

  it("keeps enabled actions and errors accessible in dark mode", async () => {
    prompt.style.colorScheme = "dark";
    prompt.password = "test-value";
    prompt.errorMessage = "Incorrect password. Please try again.";
    await prompt.updateComplete;
    await expect(prompt).shadowDom.to.be.accessible();
  });

  it("updates the greeting and character when the hosting app supplies another account", async () => {
    prompt.username = "chris";
    await prompt.updateComplete;
    expect(prompt.shadowRoot.querySelector('.welcome').textContent).to.include("Welcome back, chris!");
    expect(prompt.shadowRoot.querySelector('rpg-character').getAttribute('seed')).to.equal("chris");
    expect(prompt.shadowRoot.textContent).not.to.include("Welcome back, admin!");
  });

  it("opens directly to the password without requiring a username", async () => {
    prompt.username = "";
    prompt.open(true);
    await prompt.updateComplete;
    expect(prompt.opened).to.equal(true);
    expect(prompt.shadowRoot.querySelector('#username')).to.equal(null);
    expect(prompt.shadowRoot.querySelector('.switch-account')).to.equal(null);
    const password = prompt.shadowRoot.querySelector('#password');
    expect(password).not.to.equal(null);
    expect(prompt.shadowRoot.activeElement).to.equal(password);
    expect(prompt.shadowRoot.querySelector('.welcome').textContent).to.include("Enter your HAX account password");
    expect(prompt.shadowRoot.querySelector('.continue-button').disabled).to.equal(true);
  });

  it("still verifies the password, rejects incorrect input, and allows a retry without a username", async () => {
    const originalFetch = globalThis.fetch;
    const submitted = [];
    globalThis.fetch = async (url, options) => {
      expect(url).to.equal('/api/mock-authentication');
      const body = JSON.parse(options.body);
      submitted.push(body);
      const success = body.password === 'demo123';
      return new Response(JSON.stringify({ success, message: 'Incorrect password. Please try again.' }), {
        status: success ? 200 : 401,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    try {
      prompt.username = '';
      prompt.open(true);
      await prompt.updateComplete;
      let result;
      prompt.addEventListener('authentication-success', event => result = event.detail);
      for (const value of ['wrong-password', 'demo123']) {
        const input = prompt.shadowRoot.querySelector('#password');
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await prompt.updateComplete;
        prompt.shadowRoot.querySelector('.continue-button').click();
        await waitUntil(() => !prompt.authenticating);
        if (value === 'wrong-password') {
          expect(prompt.opened).to.equal(true);
          expect(prompt.errorMessage).to.include('Incorrect password');
          expect(result).to.equal(undefined);
          expect(prompt.shadowRoot.querySelector('#username')).to.equal(null);
        }
      }
      expect(prompt.opened).to.equal(false);
      expect(prompt.password).to.equal('');
      expect(result).to.deep.equal({ required: true });
      expect(submitted).to.deep.equal([{ password: 'wrong-password' }, { password: 'demo123' }]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
