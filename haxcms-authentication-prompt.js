import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import "@haxtheweb/simple-icon/lib/simple-icon-button-lite.js";
import "@haxtheweb/simple-fields/lib/simple-fields-field.js";

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
    this.required = false;
  }

  static get properties() {
    return {
      ...super.properties,
      password: { type: String },
      showPassword: { type: Boolean },
      opened: { type: Boolean, reflect: true },
      errorMessage: { type: String },
      authenticating: { type: Boolean },
      required: { type: Boolean }
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
          padding: var(--ddd-spacing-4);
          box-sizing: border-box;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.45);
          z-index: 1000;
        }

          .authentication-prompt {
          width: min(500px, 100%);
          max-height: calc(100dvh - var(--ddd-spacing-8));
          display: flex;
          flex-direction: column;
          background: light-dark(
            var(--ddd-theme-default-white),
            var(--ddd-theme-default-coalyGray)
          );
          border: 2px solid light-dark(
            var(--ddd-theme-default-black),
            var(--ddd-theme-default-white)
          );
          border-radius: var(--ddd-radius-md);
          overflow: hidden;
          box-shadow: var(--ddd-boxShadow-md);
          color: light-dark(
            var(--ddd-theme-default-black),
            var(--ddd-theme-default-white)
          );
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
          overflow-y: auto;
          background: light-dark(var(--ddd-theme-default-white), var(--ddd-theme-default-coalyGray));
        }

        .prompt-content p {
          margin: 0;
          padding-top: var(--ddd-spacing-1);
          font-family: var(--ddd-font-primary);
          font-size: var(--ddd-font-size-xs);
          line-height: 1.5;
          color: light-dark(var(--ddd-theme-default-black), var(--ddd-theme-default-white));
        }

        .password-input {
          display: flex;
          align-items: center;
          width: 100%;
          margin-top: var(--ddd-spacing-3);
          gap: var(--ddd-spacing-2);
        }

        .password-input simple-fields-field {
          flex: 1;
          min-width: 0;
          border-radius: var(--ddd-radius-sm);
          overflow: hidden;

          --simple-fields-font-family: var(--ddd-font-primary);
          --simple-fields-font-size: var(--ddd-font-size-3xs);
          --simple-fields-placeholder-font-style: normal;
          --simple-fields-field-margin: 0;
          
          --simple-fields-accent-color: var(--ddd-theme-default-skyBlue);

          --simple-fields-background-color: light-dark(
            var(--ddd-theme-default-limestoneMaxLight),
            var(--ddd-theme-default-black)
          );
          --simple-fields-border-color: light-dark(
            var(--ddd-theme-default-black),
            var(--ddd-theme-default-white)
          );
        }

        .password-input simple-fields-field::part(option-input) {
          box-sizing: border-box;
          padding-top: var(--ddd-spacing-3);
          padding-bottom: var(--ddd-spacing-2);
          padding-left: var(--ddd-spacing-3);
          padding-right: var(--ddd-spacing-3);
          font-size: var(--ddd-font-size-3xs);
          border-radius: var(--ddd-radius-sm);
        }

        .password-input simple-fields-field::part(label) {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
          border: 0;
        }

        .password-input simple-fields-field::part(option-input)::placeholder {
          color: light-dark(var(--ddd-theme-default-black), var(--ddd-theme-default-white));
          opacity: 0.6;
        }

        .show-password {
          flex: 0 0 auto;
          cursor: pointer;
          margin-bottom: 0;

          --simple-icon-color: light-dark(
            var(--ddd-theme-default-black),
            var(--ddd-theme-default-white)
          );
        }

        .error-message {
          margin-top: var(--ddd-spacing-2);
          font-size: var(--ddd-font-size-xs);
          line-height: 1.5;
          font-family: var(--ddd-font-primary);
          color: var(--ddd-theme-default-original87Pink);
          font-weight: var(--ddd-font-weight-bold);
        }

       .actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--ddd-spacing-3);
          margin-top: var(--ddd-spacing-4);
        }

        
        .continue-button,
        .back-button {
          min-height: 44px;
          font-family: var(--ddd-font-navigation);
          font-size: var(--ddd-font-size-xs);
          font-weight: var(--ddd-font-weight-medium);
          border-radius: var(--ddd-radius-xs);
          padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
          cursor: pointer;
        }

        
        .continue-button {
          background-color: var(--ddd-theme-default-skyBlue);
          color: var(--ddd-theme-default-white);
          border: none;
        }

       
        .back-button {
          background-color: transparent;
          color: light-dark(
            var(--ddd-theme-default-black),
            var(--ddd-theme-default-white)
          );
          border: 2px solid currentColor;
        }


        .continue-button:hover,
        .back-button:hover {
          box-shadow: var(--ddd-boxShadow-sm);
          transform: translateY(-1px);
          transition: 0.3s all ease-in-out;
        }

        
        .continue-button:focus-visible,
        .back-button:focus-visible {
          outline: 3px solid var(--ddd-theme-default-skyBlue);
          outline-offset: 2px;
        }

        
        .continue-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
          transform: none;
          box-shadow: none;
        }

        @media (max-width: 480px) {
          .overlay {
            padding: var(--ddd-spacing-2);
          }
          .authentication-prompt {
            width: 100%;
            max-height: calc(100dvh - var(--ddd-spacing-4));
          }
          .prompt-content {
            padding: var(--ddd-spacing-2);
          }
        }
        @media (max-height: 500px) and (orientation: landscape) {
          .overlay {
            align-items: flex-start;
            padding: var(--ddd-spacing-2);
          }
          .authentication-prompt {
            max-height: calc(100dvh - var(--ddd-spacing-4));
          }
          .titlebar {
            padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
          }
          .prompt-content {
            padding: var(--ddd-spacing-2);
          }
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
          aria-busy=${this.authenticating ? "true" : "false"}
          @keydown=${this.handleDialogKeydown}
        >

          <div class="titlebar">
            <h3 id="authentication-title">
              Authentication Needed
            </h3>

              ${!this.required
               ? html`
              <simple-icon-button-lite
                class="close-button"
                icon="close"
                label="Close"
                @click=${this.closePrompt}
              >
              </simple-icon-button-lite>
                 `
                 : ""}
          </div>

          <div class="prompt-content">

            <p id="authentication-description">
              Please enter your password to upload your file to the HAX site:
            </p>

            <div class="password-input">

              <simple-fields-field
                id="password"
                type=${this.showPassword ? "text" : "password"}
                value=${this.password}
                @value-changed=${this.passwordChanged}
                @keydown=${this.handleKeydown}
                label="Password"
                placeholder="Enter Your Password"
                autocomplete="current-password"
                aria-describedby=${this.errorMessage 
                  ? "authentication-description authentication-error" 
                  : "authentication-description"} 
                aria-invalid=${this.errorMessage ? "true" : "false"}
                ?disabled=${this.authenticating}
              >
              </simple-fields-field>

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
                  id="authentication-error"
                    class="error-message"
                    role="alert"
                  >
                    ${this.errorMessage}
                  </div>
                `
              : ""}

      <div class="actions">

  ${this.required
    ? html`
        <button
          class="back-button"
          type="button"
          @click=${this.goBack}
        >
          Back
        </button>
      `
    : html`<span></span>`}

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

  open(required = false) {
    this.password = "";
    this.showPassword = false;
    this.errorMessage = "";
    this.authenticating = false;
    this.required = required;
    this.opened = true;

    this.updateComplete.then(() => {
      this.shadowRoot
        ?.querySelector("#password")
        ?.focus();
    });
  }
        goBack() {
        this.password = "";
        this.showPassword = false;
        this.errorMessage = "";
        this.authenticating = false;
        this.opened = false;

        this.dispatchEvent(
          new CustomEvent("breadcrumb-click", {
            detail: {
              screen: "settings",
            },
            bubbles: true,
            composed: true,
          })
        );
      }

  closePrompt() {
    if (this.required) {
      return;
    }
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
    this.password = event.detail?.value ?? event.target.value ?? "";
    this.errorMessage = "";
  }

  togglePassword() {
  const currentPassword = this.password;

  this.showPassword = !this.showPassword;

  this.updateComplete.then(() => {
    const passwordField = this.shadowRoot?.querySelector("#password");

    if (passwordField) {
      passwordField.value = currentPassword;
    }
  });
    }
    handleDialogKeydown(event) { 
        if (event.key !== "Tab") { 
          return; 
        } 

        const dialog = this.shadowRoot?.querySelector( 
          ".authentication-prompt", 
        ); 

        if (!dialog) { 
          return; 
        } 

        const focusableElements = [ 
          ...dialog.querySelectorAll( 
            "simple-fields-field, simple-icon-button-lite, button:not([disabled])", 
          ), 
        ].filter((element) => !element.hasAttribute("disabled")); 

        if (focusableElements.length === 0) { 
          return; 
        } 

        const firstElement = focusableElements[0]; 
        const lastElement = focusableElements[focusableElements.length - 1]; 
        const activeElement = this.shadowRoot.activeElement; 

        if (event.shiftKey && activeElement === firstElement) { 
          event.preventDefault(); 
          lastElement.focus(); 
        } 
        else if (!event.shiftKey && activeElement === lastElement) { 
          event.preventDefault(); 
          firstElement.focus(); 
        } 
      } 

  handleKeydown(event) {
    if (
      event.key === "Enter" &&
      this.password &&
      !this.authenticating
    ) {
      this.continueAuthentication();
    }

    if (event.key === "Escape" && !this.required) {
      this.closePrompt();
    }
  }

  continueAuthentication() {
    if (!this.password || this.authenticating) {
      return;
    }

    this.authenticating = true;
    this.errorMessage = "";
    
    this.authenticate(this.password);
  }

  authenticate(password) {
    fetch("./mock-authentication-responses.json")
    .then((resp) => resp.json())
    .then((data) => {
      if (password === "demo123") {
        this.authenticationSucceeded();
      }
      else {
        this.authenticationFailed(data.failure.message);
      }
    })

    .catch(() => {
      this.authenticationFailed("Authentication request failed.");
    });
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