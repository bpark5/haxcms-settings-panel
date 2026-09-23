import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";

export class HaxcmsAuthenticationPrompt extends DDDSuper(LitElement) {

  static get tag() {
    return "haxcms-authentication-prompt";
  }

  constructor() {
    super();

    this.password = "";
    this.showPassword = false;
    this.opened = true;
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
          background: white;
          border: 2px solid #444;
          border-radius: var(--ddd-radius-sm);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          color: black;
        }

        .titlebar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--ddd-spacing-4);
          border-bottom: 1px solid #ccc;
        }

        .titlebar h3 {
          margin: 0;
          font-size: var(--ddd-font-size-m);
        }

        .close-button {
          border: none;
          background: none;
          cursor: pointer;
          font-size: 24px;
          line-height: 1;
        }

        .prompt-content {
          padding: var(--ddd-spacing-4);
        }

        .prompt-content p {
          margin-top: 0;
        }

        .password-input {
          display: flex;
          align-items: center;
          border: 1px solid #777;
          border-radius: var(--ddd-radius-xs);
          margin-top: var(--ddd-spacing-4);
          background: white;
        }

        .password-input:focus-within {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }

        .password-input input {
          flex: 1;
          min-width: 0;
          padding: var(--ddd-spacing-3);
          border: none;
          outline: none;
          background: transparent;
          font-size: 16px;
        }

        .show-password {
          border: none;
          background: none;
          cursor: pointer;
          padding: var(--ddd-spacing-3);
        }

        .error-message {
          margin-top: var(--ddd-spacing-2);
          font-size: var(--ddd-font-size-xs);
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          margin-top: var(--ddd-spacing-4);
        }

        .continue-button {
          padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
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

            <button
              class="close-button"
              type="button"
              @click=${this.closePrompt}
              aria-label="Close authentication prompt"
            >
              ×
            </button>
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
                placeholder="Password"
                autocomplete="current-password"
                ?disabled=${this.authenticating}
              />

              <button
                class="show-password"
                type="button"
                @click=${this.togglePassword}
                aria-label=${this.showPassword
                  ? "Hide password"
                  : "Show password"}
                ?disabled=${this.authenticating}
              >
                ${this.showPassword ? "Hide" : "Show"}
              </button>

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