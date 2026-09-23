/**
 * Copyright 2026 cjh6976-prog
 * @license Apache-2.0, see LICENSE for full text.
 */
import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";
import "@haxtheweb/simple-icon/lib/simple-icon-button-lite.js";

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
  }

  // Lit reactive properties
  static get properties() {
    return {
      ...super.properties,
      title: { type: String },
      breadcrumbs: { type: Array },
      description: { type: String },
      actionButton: {type: String},
      panelVisible: {type: Boolean, reflect: true}
    };
  }

  // Lit scoped styles
  static get styles() {
    return [super.styles,
    css`
      :host {
        display: block;
      }

      :host(:not([panelVisible])) {
        display: none;
      }

      .panel {
        padding: var(--ddd-spacing-4);
      }

      .panel-titlebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ddd-spacing-3);
        background: var(--ddd-theme-default-black);
        margin-bottom: 0;
      }

      .breadcrumbs span {
        font-family: var(--ddd-font-navigation);
        font-size: var(--ddd-font-size-m);
        font-weight: var(--ddd-font-weight-bold);
      }

      .close-button {
        width: var(--ddd-spacing-10);
        height: var(--ddd-spacing-10);
        cursor: pointer;
      }

      .close-button:hover::part(icon){
        color: var(--ddd-theme-default--skyBlue);
      }

      .panel-shell {
        margin-top: 0;
        padding-top: 0;
        background: light-dark(var(--ddd-theme-default-white), var(--ddd-theme-default-coalyGray));
      }

      .panel-header {
        padding: var(--ddd-spacing-4);
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
      }

      .action-button {
        font-family: var(--ddd-font-navigation);
        font-size: var(--ddd-font-size-xs);
        background: light-dark(var(--ddd-theme-default-skyBlue), none);
        border: none;
        padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
      }

      .action-button:hover, .action-button:focus {
        box-shadow: var(--ddd-boxShadow-sm);
        transform: translateY(-1px);
        transition: 0.3s all ease-in-out;
        cursor: pointer;
      }
    `];
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

  // Lit render the HTML
  render() {
    return html`
    <div class="panel">
      <div class=panel-titlebar>
        <nav class="breadcrumbs">
          ${this.breadcrumbs.map((item, index) => html`
            <span>${item}</span>
              ${index < this.breadcrumbs.length - 1 ? html`<span> > </span>` : ""}
          `)}
        </nav>
        <simple-icon-button-lite id = "close" class="close-button" icon = "close" label = "Close" @click=${this._closePanel}></simple-icon-button-lite>
      </div>
      <div class = "panel-shell">
        <div class = "panel-header">
          <h2 class = "panel-title">${this.title}</h2>
          <div class= "panel-description">
            ${this.description}
          </div>
        </div>
        <div class = "panel-content">
          <slot></slot>
        </div>
        <div class = "panel-actions">
          <button class = "action-button">${this.actionButton}</button>
        </div>
      </div>
    </div>`;
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