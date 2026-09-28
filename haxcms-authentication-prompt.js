import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import "@haxtheweb/simple-icon/lib/simple-icon-button-lite.js";

export class HaxcmsAuthenticationPrompt extends DDDSuper(LitElement) {

  static get tag() {
    return "haxcms-authentication-prompt";
  }

  constructor() {
    super();

    this.password = "";
    this.showPassword = false;
    this.opened = false;
    this.errorMessage = "";
    this.authenticating = false;
  }

  static get properties() {
    return {
      ...super.properties,
      password: { type: String },
      showPassword: { type: Boolean },
      opened: { type: Boolean, reflect: true },
      errorMessage: { type: String },
      authenticating: { type: Boolean },
    };
  }

  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          font-family: var(--ddd-font-navigation);
        }

        .overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.45);
          z-index: 1000;
        }

        .authentication-prompt {
          width: min(500px, calc(100vw - 32px));
          background: light-dark(var(--ddd-theme-default-white), var(--ddd-theme-default-coalyGray));
          border: 2px solid light-dark(var(--ddd-theme-default-black), var(--ddd-theme-default-white));
          border-radius: var(--ddd-radius-md);
          overflow: hidden;
          box-shadow: var(--ddd-boxShadow-md);
          color: light-dark(var(--ddd-theme-default-black), var(--ddd-theme-default-white));
        }

        .titlebar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--ddd-spacing-3);
          background: var(--ddd-theme-default-black);
          color: var(--ddd-theme-default-white);
        }

        .titlebar h3 {
          margin: 0;
          font-size: var(--ddd-font-size-m);
          font-family: var(--ddd-font-navigation);
          font-weight: var(--ddd-font-weight-bold);
        }

        .close-button {
          width: var(--ddd-spacing-10);
          height: var(--ddd-spacing-10);
          --simple-icon-color: var(--ddd-theme-default-white);
          --simple-icon-button-focus-color:var(--ddd-theme-default-skyBlue);
          --simple-icon-width: var(--ddd-font-size-m);
          --simple-icon-height: var(--ddd-font-size-m);
        }

        .prompt-content {
          padding: var(--ddd-spacing-4);
          background: light-dark(var(--ddd-theme-default-white), var(--ddd-theme-default-coalyGray));
        }

        .prompt-content p {
          margin: 0;
          padding-top: var(--ddd-spacing-1);
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-3xs);
          color: light-dark(var(--ddd-theme-default-black), var(--ddd-theme-default-white));
        }

        .password-input {
          display: flex;
          align-items: center;
          border-radius: var(--ddd-radius-sm);
          margin-top: var(--ddd-spacing-4);
          background: light-dark(var(--ddd-theme-default-limestoneMaxLight), var(--ddd-theme-default-black));
        }

        .password-input input {
          flex: 1;
          min-width: 0;
          padding: var(--ddd-spacing-3);
          border: none;
          outline: none;
          background: transparent;
          font-size: 16px;
          font-family: var(--ddd-font-primary);
          color: light-dark(var(--ddd-theme-default-black), var(--ddd-theme-default-white));
        }

        .password-input input::placeholder {
          color: light-dark(var(--ddd-theme-default-black), var(--ddd-theme-default-white));
          opacity: 0.7;
        }

        .show-password {
          cursor: pointer;
          padding: var(--ddd-spacing-3);
        }

        .error-message {
          margin-top: var(--ddd-spacing-2);
          font-size: var(--ddd-font-size-xs);
          font-family: var(--ddd-font-primary);
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          margin-top: var(--ddd-spacing-4);
        }

        .continue-button {
          font-family: var(--ddd-font-navigation);
          font-size: var(--ddd-font-size-xs);
          background-color: var(--ddd-theme-default-coalyGray);
          border: none;
          border-radius: var(--ddd-radius-xs);
          padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
          color: var(--ddd-theme-default-white);
        }

        .continue-button:hover {
          box-shadow: var(--ddd-boxShadow-sm);
          transform: translateY(-1px);
          transition: 0.3s all ease-in-out;
          cursor: pointer;
        }

        .continue-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      `,
    ];
  }

  render() {
    if (!this.opened) {
      return html``;
    }

    return html`
      <div
        class="overlay"
        role="presentation"
      >
        <div
          class="authentication-prompt"
          role="dialog"
          aria-modal="true"
          aria-labelledby="authentication-title"
          aria-describedby="authentication-description"
        >

          <div class="titlebar">
            <h3 id="authentication-title">
              Authentication Needed
            </h3>

            <simple-icon-button-lite
              class="close-button"
              icon="close"
              label="Close"
              @click=${this.closePrompt}
            >
            </simple-icon-button-lite>
          </div>

          <div class="prompt-content">

            <p id="authentication-description">
              Please enter your password to upload your file to the HAX site:
            </p>

            <div class="password-input">

              <input
                id="password"
                type=${this.showPassword ? "text" : "password"}
                .value=${this.password}
                @input=${this.passwordChanged}
                @keydown=${this.handleKeydown}
                placeholder="Enter Your Password"
                autocomplete="current-password"
                ?disabled=${this.authenticating}
              />

              <simple-icon-button-lite
                icon=${this.showPassword ? "visibility-off" : "visibility"}
                label=${this.showPassword ? "Hide password" : "Show password"}
                class="show-password"
                @click=${this.togglePassword}
                ?disabled=${this.authenticating}
              >
              </simple-icon-button-lite>
            </div>

            ${this.errorMessage
              ? html`
                  <div
                    class="error-message"
                    role="alert"
                  >
                    ${this.errorMessage}
                  </div>
                `
              : ""}

            <div class="actions">

              <button
                class="continue-button"
                type="button"
                @click=${this.continueAuthentication}
                ?disabled=${!this.password || this.authenticating}
              >
                ${this.authenticating
                  ? "Authenticating..."
                  : "Continue"}
              </button>

            </div>

          </div>
        </div>
      </div>
    `;
  }

  open() {
    this.password = "";
    this.showPassword = false;
    this.errorMessage = "";
    this.authenticating = false;
    this.opened = true;

    this.updateComplete.then(() => {
      this.shadowRoot
        ?.querySelector("#password")
        ?.focus();
    });
  }

  closePrompt() {
    this.password = "";
    this.showPassword = false;
    this.errorMessage = "";
    this.authenticating = false;
    this.opened = false;

    this.dispatchEvent(
      new CustomEvent("authentication-cancel", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  passwordChanged(event) {
    this.password = event.target.value;
    this.errorMessage = "";
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  handleKeydown(event) {
    if (
      event.key === "Enter" &&
      this.password &&
      !this.authenticating
    ) {
      this.continueAuthentication();
    }

    if (event.key === "Escape") {
      this.closePrompt();
    }
  }

  continueAuthentication() {
    if (!this.password || this.authenticating) {
      return;
    }

    this.authenticating = true;
    this.errorMessage = "";

    this.dispatchEvent(
      new CustomEvent("authentication-submit", {
        detail: {
          password: this.password,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  authenticationSucceeded() {
    this.password = "";
    this.showPassword = false;
    this.errorMessage = "";
    this.authenticating = false;
    this.opened = false;
  }

  authenticationFailed(
    message = "Authentication failed. Please check your password and try again.",
  ) {
    this.password = "";
    this.showPassword = false;
    this.authenticating = false;
    this.errorMessage = message;

    this.updateComplete.then(() => {
      this.shadowRoot
        ?.querySelector("#password")
        ?.focus();
    });
  }
}

globalThis.customElements.define(
  HaxcmsAuthenticationPrompt.tag,
  HaxcmsAuthenticationPrompt,
);