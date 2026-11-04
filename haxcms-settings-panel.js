/**
 * Copyright 2026 cjh6976-prog
 * @license Apache-2.0, see LICENSE for full text.
 */
import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";
import "@haxtheweb/simple-icon/lib/simple-icon-lite.js";
import "./haxcms-authentication-prompt.js";
import "./haxcms-code-history.js";

/**
 * `haxcms-settings-panel`
 * 
 * @demo index.html
 * @element haxcms-settings-panel
 */
export class HaxcmsSettingsPanel extends DDDSuper(I18NMixin(LitElement)) {

  static get tag() {
    return "haxcms-settings-panel";
  }

  constructor() {
    super();
    this.title = "";
    this.breadcrumbs = [];
    this.description = "";
    this.actionButton = "Save";
    this.panelVisible = true;
    this.selectedLanguage = "javascript";
    this._validationState = {};
    this._menuCollapsed = false;
    this._historyOpen = false;
    this._historyLanguage = "javascript";
    this.addEventListener("code-validation", this._handleCodeValidation);
    this.addEventListener("preview-state", this._handlePreviewState);
    this.addEventListener("language-change", this._handleLanguageChange);
  }

  // Lit reactive properties
  static get properties() {
    return {
      ...super.properties,
      title: { type: String },
      breadcrumbs: { type: Array },
      description: { type: String },
      actionButton: {type: String},
      panelVisible: {type: Boolean, reflect: true},
      selectedLanguage: { type: String },
      _validationState: { state: true },
      _previewSaveState: { state: true },
      _menuCollapsed: { state: true },
      _historyOpen: { state: true },
      _historyLanguage: { state: true }
    };
  }

  // Lit scoped styles
  static get styles() {
    return [super.styles,
    css`
      :host {
        --panel-surface: light-dark(var(--ddd-theme-default-white), var(--ddd-theme-default-coalyGray));
        --panel-rail: light-dark(var(--ddd-theme-default-limestoneMaxLight), color-mix(in srgb, var(--ddd-theme-default-coalyGray) 80%, var(--ddd-theme-default-black)));
        --panel-text: light-dark(var(--ddd-theme-default-coalyGray), var(--ddd-theme-default-white));
        --panel-muted: light-dark(var(--ddd-theme-default-slateGray), var(--ddd-theme-default-limestoneGray));
        --panel-line: light-dark(var(--ddd-theme-default-limestoneLight), color-mix(in srgb, var(--ddd-theme-default-white) 18%, transparent));
        --panel-selected: color-mix(in srgb, var(--ddd-theme-default-skyBlue) 16%, var(--panel-surface));
        display: block;
        height: calc(100dvh - 2 * var(--ddd-spacing-4));
        min-height: 0;
        margin: var(--ddd-spacing-4);
        box-shadow: 0 0 0 var(--ddd-spacing-6) var(--ddd-theme-default-black);
        color: var(--panel-text);
        font-family: var(--ddd-font-navigation);
        font-size: var(--ddd-font-size-4xs);
      }

      :host(:not([panelvisible])) {
        display: none;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      button {
        font: inherit;
        cursor: pointer;
      }

      button:disabled {
        cursor: default;
      }

      button:focus-visible {
        outline: 2px solid var(--ddd-theme-default-keystoneYellow);
        outline-offset: 3px;
      }

      simple-icon-lite {
        --simple-icon-width: var(--ddd-icon-xs, 24px);
        --simple-icon-height: var(--ddd-icon-xs, 24px);
        --simple-icon-color: currentColor;
        flex: none;
      }

      .panel {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        height: 100%;
        overflow: hidden;
        border-radius: var(--ddd-radius-md);
        background: var(--panel-surface);
        box-shadow: var(--ddd-boxShadow-lg);
      }

      .panel-titlebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ddd-spacing-4);
        min-height: var(--ddd-spacing-12);
        padding: 0 var(--ddd-spacing-3) 0 var(--ddd-spacing-4);
        background: var(--ddd-theme-default-potentialMidnight);
        color: var(--ddd-theme-default-white);
      }

      .breadcrumbs {
        display: flex;
        align-items: center;
        gap: var(--ddd-spacing-1);
        min-width: 0;
        font-size: var(--ddd-font-size-4xs);
        font-weight: var(--ddd-font-weight-bold);
        line-height: 1;
      }

      .breadcrumbs simple-icon-lite {
        --simple-icon-width: var(--ddd-icon-4xs, 16px);
        --simple-icon-height: var(--ddd-icon-4xs, 16px);
      }

      .breadcrumb-button, .breadcrumb-current {
        display: inline-flex;
        align-items: center;
        gap: var(--ddd-spacing-2);
        min-width: 0;
        font: inherit;
        line-height: inherit;
        color: inherit;
      }

      .breadcrumb-button {
        border: 0;
        padding: 0;
        background: transparent;
      }

      .breadcrumb-current {
        overflow: hidden;
      }

      .breadcrumb-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.35;
      }

      .breadcrumb-separator {
        color: currentColor;
        opacity: 0.55;
        font-weight: var(--ddd-font-weight-regular);
        margin: 0 var(--ddd-spacing-1);
      }

      .close-button {
        display: grid;
        place-items: center;
        width: var(--ddd-spacing-10);
        height: var(--ddd-spacing-10);
        padding: 0;
        border: 0;
        color: inherit;
        background: transparent;
        border-radius: var(--ddd-radius-xs);
      }

      .close-button simple-icon-lite {
        --simple-icon-width: var(--ddd-icon-sm, 40px);
        --simple-icon-height: var(--ddd-icon-sm, 40px);
      }

      .close-button:hover {
        color: var(--ddd-theme-skyBlue)
      }

      .panel-layout {
        display: grid;
        grid-template-columns: 192px minmax(0, 1fr);
        min-height: 0;
        container-type: inline-size;
        container-name: settings-panel;
        transition: grid-template-columns var(--ddd-duration-fast, 150ms) var(--ddd-timing-ease, ease);
      }

      .panel-layout.collapsed {
        grid-template-columns: 56px minmax(0, 1fr);
      }

      .section-rail {
        background: var(--panel-rail);
        border-right: 1px solid var(--panel-line);
        padding: var(--ddd-spacing-2);
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
      }

      .rail-button {
        display: flex;
        align-items: center;
        gap: var(--ddd-spacing-2);
        width: 100%;
        min-height: var(--ddd-spacing-8);
        padding: 0 var(--ddd-spacing-2);
        border: 0;
        border-radius: var(--ddd-radius-xs);
        background: transparent;
        color: var(--panel-text);
        text-align: left;
        white-space: nowrap;
        font-size: var(--ddd-font-size-5xs);
      }

      .rail-button simple-icon-lite {
        --simple-icon-width: var(--ddd-icon-4xs, 16px);
        --simple-icon-height: var(--ddd-icon-4xs, 16px);
      }

      .rail-button:hover {
        background: color-mix(in srgb, var(--panel-text) 6%, transparent);
      }

      .collapse-button {
        color: var(--panel-muted);
        font-size: var(--ddd-font-size-6xs);
        margin-bottom: var(--ddd-spacing-1);
      }

      .collapse-button:hover {
        color: var(--panel-text);
      }

      .collapse-button svg {
        width: var(--ddd-icon-4xs, 16px);
        height: var(--ddd-icon-4xs, 16px);
        flex: none;
        fill: currentColor;
      }

      .rail-label {
        color: var(--panel-muted);
        font-size: var(--ddd-font-size-6xs);
        font-weight: var(--ddd-font-weight-bold);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        margin: 0 var(--ddd-spacing-3) var(--ddd-spacing-2);
        width: var(--hax-ui-rail-width);
      }

      .rail-button[aria-current="page"] {
        background: var(--panel-selected);
        box-shadow: inset 4px 0 var(--ddd-theme-default-skyBlue);
        font-weight: var(--ddd-font-weight-bold);
      }

      .rail-button .change-dot {
        margin-left: auto;
      }

      .collapsed .rail-text, .collapsed .rail-label {
        display: none;
      }

      .collapsed .section-rail {
        padding-inline: var(--ddd-spacing-1);
        width: var(--hax-ui-rail-width-collapsed);
      }

      .collapsed .rail-button {
        justify-content: center;
        padding-inline: 0;
      }

      .collapsed .rail-button .change-dot {
        position: absolute;
        margin-left: var(--ddd-spacing-7);
        margin-top: calc(-1 * var(--ddd-spacing-5));
      }

      .panel-shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto minmax(0, 1fr) auto;
        min-width: 0;
        min-height: 0;
      }

      .panel-header {
        padding: var(--ddd-spacing-5) var(--ddd-spacing-6);
        border-bottom: 1px solid var(--panel-line);
      }

      .panel-title {
        margin: 0;
        font-size: var(--ddd-font-size-s);
        font-weight: var(--ddd-font-weight-bold);
        line-height: var(--ddd-lh-120);
      }

      .panel-description {
        margin-top: var(--ddd-spacing-2);
        color: var(--panel-muted);
        line-height: var(--ddd-lh-150);
      }

      .history-button {
        display: inline-flex;
        align-items: center;
        gap: var(--ddd-spacing-2);
        border: 1px solid var(--panel-muted);
        border-radius: var(--ddd-radius-xs);
        background: transparent;
        color: var(--panel-text);
      }

      .history-button simple-icon-lite {
        --simple-icon-width: var(--ddd-icon-3xs, 20px);
        --simple-icon-height: var(--ddd-icon-3xs, 20px);
      }

      .history-button:hover {
        background: var(--panel-selected);
      }

      .panel-content {
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: var(--ddd-spacing-4) var(--ddd-spacing-6) var(--ddd-spacing-5);
      }

      .panel-actions {
        display: flex;
        align-items: center;
        gap: var(--hax-ui-gap-lg, var(--ddd-spacing-3));
        flex-wrap: wrap;
        min-height: 56px;
        padding: var(--hax-ui-gap-md, var(--ddd-spacing-2)) var(--ddd-spacing-5);
        border-top: 1px solid var(--hax-ui-line, var(--panel-line));
        background: var(--hax-ui-surface, var(--panel-surface));
        font-family: var(--hax-ui-admin-font-family, var(--ddd-font-navigation));
        line-height: 1.4;
      }

      .draft-status {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: var(--hax-ui-gap-md, var(--ddd-spacing-2));
        margin-right: auto;
        color: var(--hax-ui-text-muted, light-dark(var(--ddd-theme-default-slateGray), color-mix(in srgb, var(--ddd-theme-default-white) 65%, transparent)));
        font-size: 13px;
      }

      .draft-status strong {
        color: var(--panel-text);
        font-weight: var(--ddd-font-weight-bold);
      }

      .change-dot {
        display: inline-block;
        flex: none;
        width: var(--ddd-spacing-2);
        height: var(--ddd-spacing-2);
        border-radius: var(--ddd-radius-circle);
        background: var(--ddd-theme-default-skyBlue);
      }

      .action-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--hax-ui-gap, var(--ddd-spacing-1));
        height: var(--hax-ui-row-height, 32px);
        min-height: var(--hax-ui-row-height, 32px);
        min-width: 0;
        padding: 0 var(--hax-ui-gap-lg, var(--ddd-spacing-3));
        font-family: var(--hax-ui-admin-font-family, var(--ddd-font-navigation));
        font-size: 13px;
        font-weight: var(--ddd-font-weight-medium, 500);
        border-radius: var(--hax-ui-radius, var(--ddd-radius-xs));
        white-space: nowrap;
      }

      .save-button, .history-button {
        min-width: 88px;
      }

      .discard-button {
        border: 1px solid transparent;
        color: var(--panel-text);
        background: transparent;
      }

      .save-button {
        border: 1px solid var(--panel-muted);
        color: var(--panel-text);
        background: transparent;
      }

      .save-button.has-changes {
        background: var(--hax-ui-primary, light-dark(var(--ddd-theme-default-nittanyNavy), var(--ddd-theme-default-linkLight)));
        color: var(--hax-ui-on-primary, light-dark(var(--ddd-theme-default-white), var(--ddd-theme-default-potentialMidnight)));
        border-color: var(--hax-ui-primary, light-dark(var(--ddd-theme-default-nittanyNavy), var(--ddd-theme-default-linkLight)));
        font-weight: var(--ddd-font-weight-bold, 700);
      }

      .save-button.has-changes:not(:disabled):hover {
        background: var(--hax-ui-primary-hover, light-dark(var(--ddd-theme-default-beaverBlue), var(--ddd-theme-default-skyLight)));
        border-color: var(--hax-ui-primary-hover, light-dark(var(--ddd-theme-default-beaverBlue), var(--ddd-theme-default-skyLight)));
      }

      .action-button:disabled {
        color: var(--panel-muted);
        background: transparent;
        border-color: var(--panel-line);
      }

      .discard-button:disabled {
        border-color: transparent;
      }

      .discard-button:not(:disabled):hover {
        background: var(--panel-selected);
      }

      .history-dialog {
        padding: 0;
        width: min(1100px, calc(100vw - var(--ddd-spacing-12)));
        max-width: none;
        max-height: calc(100dvh - var(--ddd-spacing-12));
        border: 1px solid var(--panel-line);
        border-radius: var(--ddd-radius-md);
        background: var(--panel-surface);
        color: var(--panel-text);
        box-shadow: var(--ddd-boxShadow-lg);
      }

      .history-dialog::backdrop {
        background: color-mix(in srgb, var(--ddd-theme-default-potentialMidnight) 80%, transparent);
      }

      .history-titlebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ddd-spacing-3);
        padding: var(--ddd-spacing-3) var(--ddd-spacing-5);
        background: var(--ddd-theme-default-potentialMidnight);
        color: var(--ddd-theme-default-white);
      }

      .history-titlebar p {
        margin: 0;
        font-weight: var(--ddd-font-weight-bold);
      }

      @media (prefers-reduced-motion: reduce) {
        .panel-layout {
          transition: none;
        }
      }

      @media (max-width: 900px) {
        .panel-header {
          padding-inline: var(--ddd-spacing-4);
        }

        .panel-content {
          padding-inline: var(--ddd-spacing-4);
        }
      }

      @media (max-width: 600px) {
        :host {
          margin: 0;
          height: 100dvh;
        }

        .panel {
          border-radius: 0;
        }

        .panel-layout, .panel-layout.collapsed {
          grid-template-columns: 56px minmax(0, 1fr);
        }

        .section-rail {
          padding: var(--ddd-spacing-2) var(--ddd-spacing-1);
          overflow-x: hidden;
        }

        .rail-text, .rail-label, .collapse-button {
          display: none;
        }

        .rail-button, .collapsed .rail-button {
          position: relative;
          justify-content: center;
          padding: 0;
        }

        .rail-button .change-dot, .collapsed .rail-button .change-dot {
          position: absolute;
          top: 3px;
          right: 6px;
          margin: 0;
        }

        .panel-titlebar {
          min-height: var(--ddd-spacing-12);
          padding: 0 var(--ddd-spacing-2);
          gap: var(--ddd-spacing-2);
        }

        .breadcrumbs {
          gap: var(--ddd-spacing-1);
          font-size: var(--ddd-font-size-4xs);
        }

        .breadcrumb-text {
          transform: none;
        }

        .panel-header {
          padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
        }

        .panel-title {
          font-size: var(--ddd-font-size-3xs);
        }

        .panel-description {
          font-size: var(--ddd-font-size-6xs);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .panel-content {
          padding-inline: var(--ddd-spacing-3);
        }

        .panel-actions .history-button simple-icon-lite {
          --simple-icon-width: var(--ddd-icon-3xs, 20px);
          --simple-icon-height: var(--ddd-icon-3xs, 20px);
        }

        .history-dialog {
          width: calc(100vw - var(--ddd-spacing-4));
          max-height: calc(100dvh - var(--ddd-spacing-4));
        }
      }

      @container settings-panel (max-width: 760px) {
        .panel-actions {
          gap: var(--hax-ui-gap-md, var(--ddd-spacing-2));
          padding: var(--hax-ui-gap-md, var(--ddd-spacing-2)) var(--hax-ui-gap-lg, var(--ddd-spacing-3));
          min-height: 52px;
        }

        .draft-status {
          flex: 1 0 auto;
          font-size: var(--hax-ui-admin-font-size-xs, 12px);
        }

        .draft-status strong {
          white-space: nowrap;
        }

        .panel-actions .action-button {
          padding: 0 var(--hax-ui-gap-md, var(--ddd-spacing-2));
        }
      }
    `];
  }

  // Lit render the HTML
  render() {
    const workspace = this.querySelector("haxcms-code-workspace");
    const dirty = !!workspace && workspace.hasUnsavedChanges(this.selectedLanguage);
    const changedLanguages = workspace
      ? ["javascript", "css"].filter(language => workspace.hasUnsavedChanges(language)) : [];
    const validation = this._validationState[this.selectedLanguage];
    const saveDisabled = !!workspace && (!dirty || !validation || validation.pending || !validation.valid ||
      !this._previewSaveState || !this._previewSaveState.canSave);
    const languageLabel = this.selectedLanguage === "css" ? "CSS" : "JavaScript";
    const saveHint = !dirty && workspace ? `No unsaved ${languageLabel} changes.`
      : saveDisabled ? ((validation && validation.message) || "Waiting for preview.")
      : `Save ${languageLabel} customization`;
    const crumbs = this.breadcrumbs.length ? this.breadcrumbs : [
      { label: "Settings", icon: "settings", screen: "settings" },
      { label: this.title || "JS/CSS", icon: "code" },
    ];
    return html`
      <div class="panel">
        <header class="panel-titlebar">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            ${crumbs.map((item, index) => html`
              ${index > 0 ? html`<span class="breadcrumb-separator" aria-hidden="true">/</span>` : ""}
              ${index === crumbs.length - 1 ? html`
                <span class="breadcrumb-current" aria-current="page">
                  <simple-icon-lite src=${this._getIconPath(item.icon)} aria-hidden="true"></simple-icon-lite>
                  <span class="breadcrumb-text">${item.label}</span>
                </span>` : html`
                <span class="breadcrumb-button">
                  <simple-icon-lite src=${this._getIconPath(item.icon)} aria-hidden="true"></simple-icon-lite>
                  <span class="breadcrumb-text">${item.label}</span>
                </span>`}
            `)}
          </nav>
          <button class="close-button" type="button" aria-label="Close settings" @click=${this._closePanel}>
            <simple-icon-lite src=${this._getIconPath("close")} aria-hidden="true"></simple-icon-lite>
          </button>
        </header>
        <div class=${this._menuCollapsed ? "panel-layout collapsed" : "panel-layout"}>
          <nav class="section-rail" aria-label="Settings sections">
            <button class="rail-button collapse-button" type="button"
              aria-label=${this._menuCollapsed ? "Expand menu" : "Collapse menu"}
              title=${this._menuCollapsed ? "Expand menu" : "Collapse menu"}
              aria-expanded=${!this._menuCollapsed} aria-controls="settings-rail-links"
              @click=${() => { this._menuCollapsed = !this._menuCollapsed; }}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d=${this._menuCollapsed
                  ? "M21 18H8v-2h13v2zm0-5H11v-2h10v2zm0-7v2H8V6h13zM3 15.59L6.58 12 3 8.41 4.41 7l5 5-5 5L3 15.59z"
                  : "M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5L21 15.59z"}></path>
              </svg>
              <span class="rail-text">${this._menuCollapsed ? "Expand menu" : "Collapse menu"}</span>
            </button>
            <p class="rail-label">Customization</p>
            <div id="settings-rail-links">
              <button class="rail-button" type="button" aria-current="page" aria-label="JS/CSS customization"
                @click=${this._focusLanguage}>
                <simple-icon-lite src=${this._getIconPath("code")} aria-hidden="true"></simple-icon-lite>
                <span class="rail-text">JS/CSS</span>
                ${changedLanguages.length ? html`<span class="change-dot" role="img" aria-label="Unsaved changes"></span>` : ""}
              </button>
            </div>
          </nav>
          <main class="panel-shell">
            <header class="panel-header">
              <h2 class="panel-title">${this.title || "JS/CSS"}</h2>
              <div class="panel-description">${this.description}</div>
            </header>
            <div class="panel-content"><slot></slot></div>
            <footer class="panel-actions">
              <span class="draft-status" role="status">
                ${dirty ? html`<span class="change-dot" aria-hidden="true"></span><strong>1 unsaved change</strong><span>${languageLabel}</span>`
                  : html`<span>${changedLanguages.length ? `No unsaved ${languageLabel} changes` : "No unsaved changes"}</span>`}
              </span>
              ${workspace ? html`
                <button class="action-button history-button" type="button" aria-haspopup="dialog" aria-controls="code-history-dialog" @click=${this._openHistory}>
                  <simple-icon-lite src=${this._getIconPath("history")} aria-hidden="true"></simple-icon-lite>
                  History
                </button>` : ""}
              ${workspace ? html`<button type="button" class="action-button discard-button" ?disabled=${!dirty}
                title=${`Discard unsaved ${languageLabel} changes`} @click=${this._discardChanges}>Discard</button>` : ""}
              <button type="button" class=${dirty ? "action-button save-button has-changes" : "action-button save-button"}
                ?disabled=${saveDisabled} title=${saveHint} @click=${() => this._openAuthenticationPrompt(false)}>${this.actionButton}</button>
            </footer>
          </main>
        </div>
        <dialog class="history-dialog" id="code-history-dialog" aria-label="Customization history"
          @cancel=${this._closeHistory} @close=${this._historyClosed}>
          <div class="history-titlebar">
            <p>Settings / JS/CSS / History</p>
            <button class="close-button" type="button" aria-label="Close history" autofocus @click=${this._closeHistory}>
              <simple-icon-lite src=${this._getIconPath("close")} aria-hidden="true"></simple-icon-lite>
            </button>
          </div>
          ${this._historyOpen ? html`
            <haxcms-code-history .language=${this._historyLanguage}
              @history-language-change=${event => { this._historyLanguage = event.detail.language; }}
              @load-code-revision=${this._loadHistoryRevision}></haxcms-code-history>` : ""}
        </dialog>
        <haxcms-authentication-prompt
          @authentication-success=${this.handleAuthenticationSuccess}
          @authentication-cancel=${this.handleAuthenticationCancel}></haxcms-authentication-prompt>
      </div>`;
  }

  _focusLanguage() {
    const workspace = this.querySelector("haxcms-code-workspace");
    if (workspace) workspace.focusLanguage();
  }

  async _discardChanges() {
    const workspace = this.querySelector("haxcms-code-workspace");
    if (workspace) await workspace.discardDraft(this.selectedLanguage);
  }

  _getIconPath(icon) {
    const icons = {
      menu: new URL("./icons/menu.svg", import.meta.url).href,
      history: new URL("./icons/history.svg", import.meta.url).href,
      settings: new URL("./icons/settings.svg", import.meta.url).href,
      code: new URL("./icons/code.svg", import.meta.url).href,
      close: new URL("./icons/close.svg", import.meta.url).href,
      visibility: new URL("./icons/visibility.svg", import.meta.url).href,
    };

    return icons[icon] || "";
  }

  updated(changedProperties) {
    super.updated(changedProperties);

    if (
      changedProperties.has("panelVisible") &&
      this.panelVisible
    ) {
      this._openAuthenticationPrompt(true);
    }
  }

  _closePanel() {
    this._closeHistory();
    this.panelVisible = false;
    this.dispatchEvent(
      new CustomEvent("close-panel", {
        bubbles: true,
        composed: true,
      })
    );
  }

  async _openHistory() {
    if (!this.querySelector("haxcms-code-workspace")) return;
    this._historyLanguage = this.selectedLanguage;
    this._historyOpen = true;
    await this.updateComplete;
    const dialog = this.shadowRoot.querySelector(".history-dialog");
    if (!dialog.open) dialog.showModal();
  }

  _closeHistory(event) {
    if (event) event.preventDefault();
    const dialog = this.shadowRoot.querySelector(".history-dialog");
    if (dialog && dialog.open) dialog.close();
    this._historyOpen = false;
  }

  _historyClosed() {
    this._historyOpen = false;
    const button = this.shadowRoot.querySelector(".history-button");
    if (button) button.focus();
  }

  async _loadHistoryRevision(event) {
    const workspace = this.querySelector("haxcms-code-workspace");
    const { language, revision } = event.detail;
    if (workspace && await workspace.loadHistoryRevision(language, revision)) {
      workspace.selectedLanguage = language;
      this._setLanguage(language);
      this._closeHistory();
    }
  }

  _openAuthenticationPrompt(required = false) {
    if (!required && !this._validateCodeForSave()) return;
    const prompt = this.shadowRoot.querySelector(
      "haxcms-authentication-prompt"
    );

    if (prompt) {
      prompt.open(required);
    }
  } 

  async handleAuthenticationSuccess(event) {
    const prompt = this.shadowRoot.querySelector("haxcms-authentication-prompt");
    await prompt.updateComplete;

    if (!event.detail.required && this._validateCodeForSave()) {
      this.dispatchEvent (
        new CustomEvent("save-request", {
          detail: {language: this.selectedLanguage},
          bubbles: true,
          composed: true,
          })
      );
    }
  }

  _handleCodeValidation(event) {
    if (event.target !== this.querySelector("haxcms-code-workspace")) return;
    const { language } = event.detail;
    if (language !== "javascript" && language !== "css") return;
    this._validationState = { ...this._validationState, [language]: event.detail };
  }

  _validateCodeForSave() {
    const workspace = this.querySelector("haxcms-code-workspace");
    if (!workspace) return true;
    return workspace.validateDraft(this.selectedLanguage) && workspace.canSavePreview;
  }

  _handlePreviewState(event) {
    if (event.target !== this.querySelector("haxcms-code-workspace")) return;
    this._previewSaveState = event.detail;
  }

  async handleAuthenticationCancel() {
    const prompt = this.shadowRoot.querySelector("haxcms-authentication-prompt");

    await prompt.updateComplete;

    if (this.panelVisible) {
      const actionButton = this.shadowRoot.querySelector(".save-button");
      if (actionButton) {
        actionButton.focus();
      }
    }
  }

  _handleLanguageChange(event) {
    if (event.target !== this.querySelector("haxcms-code-workspace")) return;
    const language = event.detail.language;
    if (language === "javascript" || language === "css") this.selectedLanguage = language;
  }

  _setLanguage(language) {
    this.selectedLanguage = language;
    const workspace = this.querySelector("haxcms-code-workspace");
    if (workspace) workspace.selectedLanguage = language;

    this.dispatchEvent(
      new CustomEvent("language-change", {
        detail: {language},
        bubbles: true,
        composed: true,
      })
    );
  }

  _handleBreadcrumbClick(item) {
    this.dispatchEvent(
      new CustomEvent("breadcrumb-click", {
        detail: {
          screen: item.screen,
        },
        bubbles: true,
        composed: true,
      })
    )
  }

  /**
   * haxProperties integration via file reference
   */
  static get haxProperties() {
    return new URL(`./lib/${this.tag}.haxProperties.json`, import.meta.url)
      .href;
  }
}

globalThis.customElements.define(HaxcmsSettingsPanel.tag, HaxcmsSettingsPanel);
