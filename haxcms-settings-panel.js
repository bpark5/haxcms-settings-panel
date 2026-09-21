/**
 * Copyright 2026 cjh6976-prog
 * @license Apache-2.0, see LICENSE for full text.
 */
import { LitElement, html, css } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";
import { I18NMixin } from "@haxtheweb/i18n-manager/lib/I18NMixin.js";

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
    this.t = this.t || {};
    this.t = {
      ...this.t,
      title: "Title",
    };
    this.registerLocalization({
      context: this,
      localesPath:
        new URL("./locales/haxcms-settings-panel.ar.json", import.meta.url).href +
        "/../",
    });
  }

  // Lit reactive properties
  static get properties() {
    return {
      ...super.properties,
      title: { type: String },
      breadcrumbs: { type: Array },
      description: { type: String },
    };
  }

  // Lit scoped styles
  static get styles() {
    return [super.styles,
    css`
      :host {
        display: block;
        color: var(--ddd-theme-primary);
        background-color: var(--ddd-theme-accent);
        font-family: var(--ddd-font-navigation);
      }
      .wrapper {
        margin: var(--ddd-spacing-2);
        padding: var(--ddd-spacing-4);
      }
      h3 span {
        font-size: var(--haxcms-settings-panel-label-font-size, var(--ddd-font-size-s));
      }

      .panel-titlebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ddd-spacing-2);
      }

      .close-button {
        padding: var(--ddd-spacing-2);
        border: none;
        background: none;
        font-size: var(--ddd-font-size-xxs);
        cursor: pointer;
      }
    `];
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
    <button class="close-button">x</button>
  </div>

  <div class = "panel-shell">
    <div class = "panel-header">
      <h2>${this.title}</h2>
      <div class="description">
        ${this.description}
      </div>
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