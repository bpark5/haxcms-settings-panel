/**
 * Copyright 2026 cjh6976-prog
 * @license Apache-2.0, see LICENSE for full text.
 */
import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";
import "@haxtheweb/simple-icon/lib/simple-icon-button-lite.js";
import "./haxcms-authentication-prompt.js";

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
    this.actionButton = "";
    this.panelVisible = true;
    this.selectedLanguage = "javascript";
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
      selectedLanguage: { type: String }
    };
  }

  // Lit scoped styles
  static get styles() {
    return [super.styles,
    css`
      :host {
        display: block;
        margin: var(--ddd-spacing-4);
      }

      :host(:not([panelvisible])) {
        display: none;
      }

      .panel-titlebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ddd-spacing-3);
        background: var(--ddd-theme-default-black);
        margin-bottom: 0;
      }

      .breadcrumbs {
        font-family: var(--ddd-font-navigation);
        font-size: var(--ddd-font-size-m);
        font-weight: var(--ddd-font-weight-bold);
        color: var(--ddd-theme-default-white);
        display: flex;
        align-items: center;
        gap: var(--ddd-spacing-2);
      }

      .breadcrumb-item {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .breadcrumb-icon {
        --simple-icon-width: var(--ddd-font-size-m);
        --simple-icon-height: var(--ddd-font-size-m);
      }

      .breadcrumb-separator {
        display: inline-flex;
        align-items: center;
      }

      .close-button {
        width: var(--ddd-spacing-10);
        height: var(--ddd-spacing-10);
        cursor: pointer;
        color: var(--ddd-theme-default-white);
        --simple-icon-color: var(--ddd-theme-default-white);
        --simple-icon-button-focus-color: var(--ddd-theme-default-skyBlue);
        --simple-icon-width: var(--ddd-font-size-l);
        --simple-icon-height: var(--ddd-font-size-l);
      }

      .panel-shell {
        margin-top: 0;
        padding-top: 0;
        background: light-dark(var(--ddd-theme-default-white), var(--ddd-theme-default-coalyGray));
      }

      .panel-header {
        padding: var(--ddd-spacing-4);
      }

      .panel-title-wrapper {
        display: flex;
        align-items: center;
        gap: var(--ddd-spacing-2);
      }

      .panel-title-icon {
        --simple-icon-width: var(--ddd-font-size-l);
        --simple-icon-height: var(--ddd-font-size-l);
      }

      .panel-title {
        margin: 0;
        font-family: var(--ddd-font-primary);
        font-size: var(--ddd-font-size-m);
        font-weight: var(--ddd-font-weight-bold);
      }

      .panel-description {
        margin: 0;
        padding-top: var(--ddd-spacing-1);
        font-family: var(--ddd-font-primary);
        font-size: var(--ddd-font-size-3xs);
        color: light-dark(var(--ddd-theme-default-black), var(--ddd-theme-default-white));

      }

      .panel-content {
        padding-right: var(--ddd-spacing-4);
        padding-left: var(--ddd-spacing-4);
      }

      .panel-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: var(--ddd-spacing-4);
        margin-top: 0;
      }

      .editor-controls {
        display: flex;
        justify-content: flex-end;
        padding-right: var(--ddd-spacing-4);
        border: none;
      }

      .language-toggle {
        display: inline-flex;
        overflow: hidden;
        border-radius: var(--ddd-radius-sm);
        background: light-dark(var(--ddd-theme-default-limestoneMaxLight), var(--ddd-theme-default-black));
      }

      .language-toggle button {
        border: none;
        padding: var(--ddd-spacing-1) var(--ddd-spacing-2);
        font-family: var(--ddd-font-navigation);
        font-size: var(--ddd-font-size-4xs);
        background: transparent;
        color: light-dark(var(--ddd-theme-default-black),var(--ddd-theme-default-white));
        opacity: 0.55;
        cursor: pointer;
      }

      .language-toggle button.active {
        background: var(--ddd-theme-default-skyBlue);
        color: var(--ddd-theme-default-white);
        opacity: 1;
      }

      .action-button {
        font-family: var(--ddd-font-navigation);
        font-size: var(--ddd-font-size-xs);
        background-color: var(--ddd-theme-default-coalyGray);
        border: none;
        border-radius: var(--ddd-radius-xs);
        padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
        color: var(--ddd-theme-default-white);
      }

      .action-button:hover {
        box-shadow: var(--ddd-boxShadow-sm);
        transform: translateY(-1px);
        transition: 0.3s all ease-in-out;
        cursor: pointer;
      }
    `];
  }

  

  // Lit render the HTML
  render() {
    const currentBreadcrumb = this.breadcrumbs[this.breadcrumbs.length - 1];
    return html`
    <div class="panel">
      <div class= "panel-titlebar">
        <nav class="breadcrumbs">
          ${this.breadcrumbs.map((item, index) => html`
            <span class ="breadcrumb-item">
              <simple-icon-lite class = "breadcrumb-icon" icon="${item.icon}"></simple-icon-lite>
              <span class = "breadcrumb-text">${item.label}</span>
            </span>
            ${index < this.breadcrumbs.length - 1 
              ? html`<span class = "breadcrumb-separator"> > </span>` 
              : ""}
          `)}
        </nav>
        <simple-icon-button-lite id = "close" class="close-button" icon = "close" label = "Close" @click=${this._closePanel}></simple-icon-button-lite>
      </div>
      <div class = "panel-shell">
        <div class = "panel-header">
          <div class = "panel-title-wrapper">
            <simple-icon-lite class = "panel-title-icon" icon="${currentBreadcrumb?.icon || ""}"></simple-icon-lite>
            <h2 class = "panel-title">${this.title}</h2>
          </div>
          <div class= "panel-description">
            ${this.description}
          </div>
        </div>
        <div class = "editor-controls">
          <div class = "language-toggle">
            <button class = ${this.selectedLanguage === "javascript" ? "active" : ""} 
            @click=${() => this._setLanguage("javascript")}>JavaScript</button>
            <button class = ${this.selectedLanguage === "css" ? "active" : ""} 
            @click=${() => this._setLanguage("css")}>CSS</button>
            </div>
        </div>
        <div class = "panel-content">
          <slot></slot>
        </div>
        <div class = "panel-actions">
          <button class = "action-button" @click=${this._openAuthenticationPrompt}>${this.actionButton}</button>
        </div>
      </div>
      <haxcms-authentication-prompt></haxcms-authentication-prompt>
    </div>`;
  }

  _closePanel() {
    this.panelVisible = false;
    this.dispatchEvent(
      new CustomEvent("close-panel", {
        bubbles: true,
        composed: true,
      })
    );
  }

  _openAuthenticationPrompt() {
    const prompt = this.shadowRoot.querySelector("haxcms-authentication-prompt");

    prompt?.open();
  }

  _setLanguage(language) {
    this.selectedLanguage = language;

    this.dispatchEvent(
      new CustomEvent("language-change", {
        detail: {language},
        bubbles: true,
        composed: true,
      })
    );
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