import { LitElement, html } from "lit";
import { authenticationStyles } from "./lib/authentication-styles.js";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import "@haxtheweb/simple-icon/lib/simple-icon-lite.js";
import "@haxtheweb/rpg-character/rpg-character.js";

export class HaxcmsAuthenticationPrompt extends DDDSuper(LitElement) {

  static get tag() {
    return "haxcms-authentication-prompt";
  }

  constructor() {
    super();

    this.username = "";
    this._usernameDraft = "";
    this.password = "";
    this.showPassword = false;
    this.opened = false;
    this.errorMessage = "";
    this.authenticating = false;
    this.required = false;
    this.authController = null;
  }

  static get properties() {
    return {
      ...super.properties,
      username: { type: String },
      _usernameDraft: { state: true },
      password: { type: String },
      showPassword: { type: Boolean },
      opened: { type: Boolean, reflect: true },
      errorMessage: { type: String },
      authenticating: { type: Boolean },
      required: { type: Boolean }
    };
  }

  static get styles() {
    return [super.styles, authenticationStyles];
  }

  render() {
    if (!this.opened) return html``;
    return html`
      <div class="overlay" role="presentation">
        <div class="authentication-prompt" role="dialog" aria-modal="true"
          aria-labelledby="authentication-title" aria-describedby="authentication-description"
          aria-busy=${this.authenticating ? "true" : "false"}
          @keydown=${this.handleDialogKeydown}>
          <div class="titlebar">
            <h3 id="authentication-title">
              <simple-icon-lite src=${this._getIconPath("key")} aria-hidden="true"></simple-icon-lite>
              Login to HAX
            </h3>
            <button class="close-button" type="button"
              aria-label=${this.required ? "Back to settings" : "Close"} @click=${this.handleClose}>
              <simple-icon-lite src=${this._getIconPath("close")} aria-hidden="true"></simple-icon-lite>
            </button>
          </div>
          <div class="prompt-content">
            <rpg-character seed=${this.username || "hax"} height="95" width="75" aria-hidden="true"></rpg-character>
            ${this.username ? html`
            <p id="authentication-description" class="welcome">
              Welcome back, ${this.username}!
              <button class="switch-account" type="button" @click=${this._changeAccount}>Not you?</button>
            </p>
            <div class="password-input">
              <input id="password" type=${this.showPassword ? "text" : "password"}
                .value=${this.password} @input=${this.passwordChanged} @keydown=${this.handleKeydown}
                aria-label="Password" placeholder="Enter your password" autocomplete="current-password"
                aria-describedby=${this.errorMessage ? "authentication-description authentication-error" : "authentication-description"}
                aria-invalid=${this.errorMessage ? "true" : "false"} ?disabled=${this.authenticating}>
              <button type="button" class="show-password" @click=${this.togglePassword}
                aria-label=${this.showPassword ? "Hide password" : "Show password"}
                aria-pressed=${this.showPassword ? "true" : "false"} ?disabled=${this.authenticating}>
                <simple-icon-lite src=${this._getIconPath(this.showPassword ? "visibility" : "visibility-off")} aria-hidden="true"></simple-icon-lite>
              </button>
            </div>
            ${this.errorMessage ? html`<p id="authentication-error" class="error-message" role="alert">${this.errorMessage}</p>` : ""}
            <button class="continue-button" type="button" @click=${this.continueAuthentication}
              ?disabled=${!this.password || this.authenticating}>
              <simple-icon-lite src=${this._getIconPath("login")} aria-hidden="true"></simple-icon-lite>
              ${this.authenticating ? "Authenticating..." : "Login"}
            </button>
            ` : html`
              <p id="authentication-description" class="welcome">Enter your username to continue.</p>
              <input id="username" aria-label="Username" autocomplete="username" placeholder="Enter your username"
                .value=${this._usernameDraft}
                @input=${event => this._usernameDraft = event.target.value}
                @keydown=${event => { if (event.key === "Enter") this._selectAccount(); }}>
              <button class="continue-button" type="button" @click=${this._selectAccount}
                ?disabled=${!this._usernameDraft.trim()}>Next</button>
            `}
            <p class="authentication-status" role="status" aria-live="polite">
              ${this.authenticating ? "Authenticating..." : ""}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  _getIconPath(icon) {
    const icons = {
      key: new URL("./icons/key.svg", import.meta.url).href,
      login: new URL("./icons/login.svg", import.meta.url).href,
      close: new URL("./icons/close.svg", import.meta.url).href,
      visibility: new URL("./icons/visibility.svg", import.meta.url).href,
      "visibility-off": new URL("./icons/visibility-off.svg", import.meta.url).href,
      lock: new URL("./icons/lock.svg", import.meta.url).href,
    };

    return icons[icon] || "";
  }

  _selectAccount() {
    const username = this._usernameDraft.trim();
    if (!username) return;
    this.username = username;
    this.password = "";
    this.errorMessage = "";
    this.dispatchEvent(new CustomEvent("username-change", {
      detail: { username }, bubbles: true, composed: true,
    }));
    this.updateComplete.then(() => this.shadowRoot.querySelector("#password").focus());
  }

  _changeAccount() {
    if (this.authController) this.authController.abort();
    this.authController = null;
    this.authenticating = false;
    this.password = "";
    this.showPassword = false;
    this.errorMessage = "";
    this.username = "";
    this._usernameDraft = "";
    this.dispatchEvent(new CustomEvent("username-change", {
      detail: { username: "" }, bubbles: true, composed: true,
    }));
    this.updateComplete.then(() => this.shadowRoot.querySelector("#username").focus());
  }

  open(required = false) {
    if (this.authController) {
      this.authController.abort();
    }
    this.authController = null;
    this.password = "";
    this.showPassword = false;
    this.errorMessage = "";
    this.authenticating = false;
    this.required = required;
    this.opened = true;

    this.updateComplete.then(() => {
      if (this.shadowRoot) {
        const passwordField = this.shadowRoot.querySelector("#password, #username");

        if (passwordField) {
          passwordField.focus();
        }
      }
    });
  }
  goBack() {
    if (this.authController) {
      this.authController.abort();
    }
    this.authController = null;

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

  handleClose() {
    if (this.required) {
      this.goBack();
    } else {
      this.closePrompt();
    }
  } 

  closePrompt() {
    if (this.required) {
      return;
    }

    if (this.authController) {
      this.authController.abort();
    }
    this.authController = null;

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
    this.password = event.detail && event.detail.value !== undefined
    ? event.detail.value
    : event.target.value || "";
    if (this.password) {
      this.errorMessage = "";
    }

  }

  togglePassword() {
  const currentPassword = this.password;

  this.showPassword = !this.showPassword;

  this.updateComplete.then(() => {
    const passwordField = this.shadowRoot
    ? this.shadowRoot.querySelector("#password")
    : null;

    if (passwordField) {
      passwordField.value = currentPassword;
    }
  });
    }
    handleDialogKeydown(event) { 
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!this.required) {
          this.closePrompt();
        }
        return;
      }
        if (event.key !== "Tab") { 
          return; 
        } 

        const dialog = this.shadowRoot
        ? this.shadowRoot.querySelector(".authentication-prompt")
        : null;

        if (!dialog) { 
          return; 
        } 

        const focusableElements = [ 
          ...dialog.querySelectorAll( 
            "input:not([disabled]), button:not([disabled])",
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
    if (this.authController) {
      this.authController.abort();
    }

    const controller = new AbortController();
    this.authController = controller;

    fetch("/api/mock-authentication", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok && response.status !== 401) {
          throw new Error("Authentication server error. Please try again later.")
        }
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted || !this.opened) {
          return;
        }

        if (data.success) {
          this.authenticationSucceeded();
        } else {
          this.authenticationFailed(
            data.message
          );
        }
      })
      .catch((error) => {
        if (controller.signal.aborted || !this.opened) {
          return;
        }
        console.error("Error during authentication:", error);
        this.authenticationFailed(
          "Unable to complete authentication. Please try again later."
        );
      })
      .finally(() => {
        if (this.authController === controller) {
          this.authController = null;
        }
      });
  }

  authenticationSucceeded() {
    this.password = "";
    this.showPassword = false;
    this.errorMessage = "";
    this.authenticating = false;
    this.opened = false;

    this.dispatchEvent(
      new CustomEvent("authentication-success", {
        detail: { required: this.required},
        bubbles: true,
        composed: true,
      }),
    );
  }
      


  authenticationFailed(
    message = "Authentication failed. Please check your password and try again.",
  ) {
    this.password = "";
    this.showPassword = false;
    this.authenticating = false;
    this.errorMessage = message;
  
    this.updateComplete.then(() => {
      if (this.shadowRoot) {
        const passwordField = this.shadowRoot.querySelector("#password");

        if (passwordField) {
          passwordField.focus();
        }
      }
    });
  }
}


globalThis.customElements.define(
  HaxcmsAuthenticationPrompt.tag,
  HaxcmsAuthenticationPrompt,
);
