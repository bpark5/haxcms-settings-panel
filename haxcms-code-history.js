import { html, css } from "lit";
import { haxUiStyles } from "./lib/hax-ui-styles.js";
import { DDD } from "@haxtheweb/d-d-d/d-d-d.js";

/** Inspect saved code as text. Only an explicit action loads an editor draft. */
export class HaxcmsCodeHistory extends DDD {
  static get properties() {
    return {
      ...super.properties,
      language: { type: String },
      _revisions: { state: true },
      _selected: { state: true },
      _loading: { state: true },
      _error: { state: true },
    };
  }

  constructor() {
    super();
    this.language = "javascript";
    this._revisions = [];
    this._selected = null;
    this._loading = false;
    this._error = "";
    this._requestId = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    // Lit does not re-run updated() just because an element reconnects.
    if (this.hasUpdated) this.refresh();
  }

  updated(changed) {
    super.updated(changed);
    // updated() runs only in the browser, unlike willUpdate() during SSR.
    if (this.isConnected && changed.has("language")) this.refresh();
  }

  disconnectedCallback() {
    this._requestId++;
    this._loading = false;
    if (this._controller) this._controller.abort();
    super.disconnectedCallback();
  }

  async _read(id = "") {
    if (!this.isConnected) return;
    if (this._controller) this._controller.abort();
    const controller = new AbortController();
    this._controller = controller;
    const requestId = ++this._requestId;
    const language = this.language;
    this._loading = true;
    this._error = "";
    this._selected = null;
    try {
      const suffix = id ? `/${encodeURIComponent(id)}` : "";
      const response = await fetch(`/mock-code-history${suffix}?language=${encodeURIComponent(language)}`, {
        signal: controller.signal, cache: "no-store",
      });
      if (!(response.headers.get("content-type") || "").includes("application/json")) {
        throw new Error("History is available through the local development server. Restart it and try again.");
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load history.");
      if (requestId !== this._requestId || language !== this.language || !this.isConnected) return;
      if (id) this._selected = result.revision;
      else this._revisions = result.revisions;
    } catch (error) {
      if (!controller.signal.aborted && requestId === this._requestId) this._error = error.message;
    } finally {
      if (requestId === this._requestId) this._loading = false;
    }
  }

  refresh() {
    this._revisions = [];
    return this._read();
  }

  _loadDraft() {
    if (!this._selected || this._loading) return;
    this.dispatchEvent(new CustomEvent("load-code-revision", {
      detail: { language: this.language, revision: this._selected },
      bubbles: true, composed: true,
    }));
  }

  _chooseLanguage(language) {
    this.language = language;
    this.dispatchEvent(new CustomEvent("history-language-change", {
      detail: { language }, bubbles: true, composed: true,
    }));
  }

  static get styles() {
    return [super.styles, haxUiStyles, css`
      :host {
        display: flex;
        flex-direction: column;
        max-height: calc(100dvh - var(--ddd-spacing-24));
        min-height: 0;
        font-family: var(--hax-ui-admin-font-family);
        font-size: var(--hax-ui-admin-font-size);
        color: var(--hax-ui-text);
        background: var(--hax-ui-surface);
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      [hidden] {
        display: none !important;
      }

      .page-header {
        flex: none;
        padding: var(--ddd-spacing-4) var(--ddd-spacing-5) var(--hax-ui-gap-lg);
        border-bottom: 1px solid var(--hax-ui-line);
      }

      h3 {
        margin: 0;
        font-size: 22px;
        font-weight: var(--ddd-font-weight-bold);
        line-height: 1.2;
      }

      h4 {
        margin: 0 0 var(--hax-ui-gap-md);
        font-size: var(--hax-ui-admin-font-size);
        font-weight: var(--ddd-font-weight-bold);
      }

      p {
        margin: var(--hax-ui-gap) 0 0;
        font-size: var(--hax-ui-admin-font-size);
        line-height: 1.5;
        color: var(--hax-ui-text-muted);
      }

      .toolbar {
        display: flex;
        flex: none;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--hax-ui-gap-md);
        padding: var(--hax-ui-gap-lg) var(--ddd-spacing-5);
        border-bottom: 1px solid var(--hax-ui-line);
      }

      button {
        min-height: var(--hax-ui-row-height);
        padding: 0 var(--hax-ui-gap-lg);
        border: 1px solid var(--hax-ui-line-strong);
        border-radius: var(--hax-ui-radius);
        background: var(--hax-ui-surface);
        color: var(--hax-ui-text);
        font-family: var(--hax-ui-admin-font-family);
        font-size: 13px;
        font-weight: var(--ddd-font-weight-medium, 500);
        cursor: pointer;
      }

      button:not(:disabled):hover {
        background: var(--hax-ui-hover);
      }

      button:focus-visible {
        outline: var(--hax-ui-focus-width) solid var(--hax-ui-focus);
        outline-offset: 2px;
      }

      button:disabled {
        cursor: default;
        color: var(--hax-ui-text-muted);
      }

      .language-tabs {
        display: inline-grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 192px;
        max-width: 100%;
        border: 1px solid var(--hax-ui-line-strong);
        border-radius: var(--hax-ui-radius);
        overflow: hidden;
      }

      .language-tabs button {
        min-width: 0;
        min-height: 0;
        height: calc(var(--hax-ui-row-height) - 2px);
        padding: 0 10px;
        border: 0;
        border-radius: 0;
      }

      .language-tabs button + button {
        border-left: 1px solid var(--hax-ui-line-strong);
      }

      .language-tabs button[aria-pressed="true"] {
        background: var(--hax-ui-accent-soft);
        box-shadow: inset 0 -3px 0 var(--hax-ui-accent-strong);
        font-weight: var(--ddd-font-weight-bold);
      }

      .language-tabs button:focus-visible {
        outline-offset: -2px;
      }

      .feedback {
        flex: none;
        margin: 0;
        padding: var(--hax-ui-gap-lg) var(--ddd-spacing-5);
      }

      .columns {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
        gap: var(--ddd-spacing-4);
        min-height: 0;
        overflow: auto;
        overscroll-behavior: contain;
        padding: var(--ddd-spacing-4) var(--ddd-spacing-5);
      }

      ul {
        display: flex;
        flex-direction: column;
        gap: var(--hax-ui-gap-md);
        list-style: none;
        margin: 0;
        padding: 0;
      }

      li button {
        width: 100%;
        padding: var(--hax-ui-gap-md) var(--hax-ui-gap-lg);
        text-align: left;
        overflow-wrap: anywhere;
        line-height: 1.5;
      }

      li button[aria-pressed="true"] {
        background: var(--hax-ui-selected);
        border-color: var(--hax-ui-accent-strong);
        font-weight: var(--ddd-font-weight-bold);
      }

      .source {
        min-width: 0;
      }

      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        overflow: auto;
        max-height: 24rem;
        margin: var(--hax-ui-gap-md) 0 0;
        padding: var(--hax-ui-gap-lg);
        border: 1px solid var(--hax-ui-line);
        border-radius: var(--hax-ui-radius);
        font-family: var(--ddd-font-mono);
        font-size: 13px;
        line-height: 1.5;
        color: var(--hax-ui-text);
        background: var(--hax-ui-sunken);
      }

      .history-actions {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--hax-ui-gap-lg);
        min-height: var(--hax-ui-action-bar-height);
        padding: var(--hax-ui-gap-md) var(--ddd-spacing-5);
        border-top: 1px solid var(--hax-ui-line);
      }

      .history-actions p {
        margin: 0;
        font-size: 13px;
      }

      .load-revision {
        min-width: 88px;
      }

      .load-revision:not(:disabled) {
        background: var(--hax-ui-primary);
        border-color: var(--hax-ui-primary);
        color: var(--hax-ui-on-primary);
        font-weight: var(--ddd-font-weight-bold);
      }

      .load-revision:not(:disabled):hover {
        background: var(--hax-ui-primary-hover);
        border-color: var(--hax-ui-primary-hover);
      }

      .error {
        color: var(--hax-ui-danger);
      }

      @media (max-width: 768px) {
        .columns {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      @media (max-width: 600px), (max-width: 900px) and (max-height: 500px) {
        h3 {
          font-size: 18px;
        }

        .page-header p {
          font-size: var(--hax-ui-admin-font-size-xs);
        }

        .page-header, .toolbar, .columns, .history-actions {
          padding: var(--hax-ui-gap-md) var(--hax-ui-gap-lg);
        }
      }
    `];
  }

  render() {
    const label = this.language === "css" ? "CSS" : "JavaScript";
    return html`
      <div class="page-header">
        <h3>${label} history</h3>
        <p>Inspect a saved version, then load it as an editor draft to validate and preview. Save is still required to keep it.</p>
      </div>
      <div class="toolbar" role="group" aria-label="History view controls">
        <div class="language-tabs" role="group" aria-label="History language">
          <button type="button" aria-pressed=${this.language === "javascript" ? "true" : "false"}
            @click=${() => this._chooseLanguage("javascript")}>JavaScript</button>
          <button type="button" aria-pressed=${this.language === "css" ? "true" : "false"}
            @click=${() => this._chooseLanguage("css")}>CSS</button>
        </div>
        <button type="button" @click=${() => this.refresh()} ?disabled=${this._loading}>Refresh history</button>
      </div>
      <p role="status" class="feedback" ?hidden=${!this._loading}>Loading history…</p>
      <p role="alert" class="feedback error" ?hidden=${!this._error}>${this._error}</p>
      <div class="columns" aria-busy=${this._loading ? "true" : "false"}>
        <div>
          <h4>Saved versions</h4>
          ${!this._loading && !this._error && !this._revisions.length
            ? html`<p>No saved history yet. The current file will be preserved on the first save.</p>` : ""}
          <ul aria-label=${`${label} saved versions`}>
            ${this._revisions.map((revision, index) => html`
              <li><button type="button" ?disabled=${this._loading}
                aria-pressed=${this._selected && this._selected.id === revision.id ? "true" : "false"}
                @click=${() => this._read(revision.id)}>
                Version ${this._revisions.length - index} · ${new Date(revision.createdAt).toLocaleString()}
                ${revision.kind === "preserved" ? " · Preserved file" : ""}
                ${revision.isCurrent ? " · Current saved version" : ""}
              </button></li>
            `)}
          </ul>
        </div>
        <div class="source">
          <h4>Version details</h4>
          ${this._selected ? html`
            <p>Revision ${this._selected.id.slice(0, 8)}</p>
            <pre aria-label="Revision source">${this._selected.code === "" ? "(Empty customization)" : this._selected.code}</pre>
          ` : html`<p>Choose a version to view its source.</p>`}
        </div>
      </div>
      <div class="history-actions">
        <p role="status">${this._selected ? "Version selected. Loading changes only the draft." : "No version selected."}</p>
        <button class="load-revision" type="button" @click=${this._loadDraft}
          ?disabled=${!this._selected || this._loading}>Load into editor</button>
      </div>
    `;
  }
}

globalThis.customElements.define("haxcms-code-history", HaxcmsCodeHistory);
