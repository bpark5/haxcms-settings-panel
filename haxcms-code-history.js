import { html, css } from "lit";
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
    this._loading = false;
    this._error = "";
    this._requestId = 0;
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    if (changed.has("language")) this.refresh();
  }

  disconnectedCallback() {
    this._requestId++;
    this._controller?.abort();
    super.disconnectedCallback();
  }

  async _read(id = "") {
    this._controller?.abort();
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
      if (!response.headers.get("content-type")?.includes("application/json")) {
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
    return [super.styles, css`
      :host {
        display: block;
        font-family: var(--ddd-font-primary);
        color: light-dark(var(--ddd-theme-default-black), var(--ddd-theme-default-white));
        background: light-dark(var(--ddd-theme-default-white), var(--ddd-theme-default-coalyGray));
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--ddd-spacing-2);
        padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
        border-top: var(--ddd-border-xs);
        border-bottom: var(--ddd-border-xs);
        background: light-dark(var(--ddd-theme-default-limestoneMaxLight), var(--ddd-theme-default-black));
      }

      .page-header {
        padding: var(--ddd-spacing-4);
      }

      .language-tabs {
        display: flex;
        gap: var(--ddd-spacing-1);
      }

      h4 {
        margin: var(--ddd-spacing-0) var(--ddd-spacing-0) var(--ddd-spacing-2);
        font-family: var(--ddd-font-navigation);
        font-size: var(--ddd-font-size-3xs);
      }

      .feedback {
        padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
      }

      h3 {
        margin: var(--ddd-spacing-0);
        font-family: var(--ddd-font-primary);
        font-size: var(--ddd-font-size-m);
        font-weight: var(--ddd-font-weight-bold);
      }

      p {
        margin: var(--ddd-spacing-0);
        padding-top: var(--ddd-spacing-1);
        font-family: var(--ddd-font-primary);
        font-size: var(--ddd-font-size-3xs);
        line-height: var(--ddd-lh-150);
      }

      [hidden] {
        display: none !important;
      }

      .columns {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
        gap: var(--ddd-spacing-4);
        padding: var(--ddd-spacing-4);
      }

      ul {
        display: flex;
        flex-direction: column;
        gap: var(--ddd-spacing-2);
        list-style: none;
        margin: var(--ddd-spacing-0);
        padding: var(--ddd-spacing-0);
      }

      button {
        font-family: var(--ddd-font-navigation);
        font-size: var(--ddd-font-size-4xs);
        border: none;
        border-radius: var(--ddd-radius-sm);
        padding: var(--ddd-spacing-1) var(--ddd-spacing-2);
        background: light-dark(var(--ddd-theme-default-limestoneMaxLight), var(--ddd-theme-default-black));
        color: light-dark(var(--ddd-theme-default-black), var(--ddd-theme-default-white));
        cursor: pointer;
      }

      li button {
        width: 100%;
        text-align: left;
        overflow-wrap: anywhere;
        line-height: var(--ddd-lh-150);
      }

      button[aria-pressed="true"] {
        background: var(--ddd-theme-default-skyBlue);
        color: var(--ddd-theme-default-white);
        font-weight: var(--ddd-font-weight-bold);
      }

      button:not(:disabled):hover {
        box-shadow: var(--ddd-boxShadow-sm);
      }

      button:focus-visible {
        outline: 2px solid light-dark(var(--ddd-theme-default-black), var(--ddd-theme-default-white));
        outline-offset: 2px;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .source {
        min-width: 0;
      }

      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        overflow: auto;
        max-height: 24rem;
        margin: var(--ddd-spacing-2) var(--ddd-spacing-0) var(--ddd-spacing-4);
        padding: var(--ddd-spacing-3);
        border: var(--ddd-border-xs);
        border-radius: var(--ddd-radius-xs);
        font-family: var(--ddd-font-mono);
        font-size: var(--ddd-font-size-4xs);
        line-height: var(--ddd-lh-150);
        background: light-dark(var(--ddd-theme-default-limestoneMaxLight), var(--ddd-theme-default-black));
      }

      .load-revision {
        font-size: var(--ddd-font-size-xs);
        font-weight: var(--ddd-font-weight-medium);
        border-radius: var(--ddd-radius-xs);
        padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
        background: var(--ddd-theme-default-skyBlue);
        color: var(--ddd-theme-default-white);
      }

      .history-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--ddd-spacing-3);
        padding: var(--ddd-spacing-4);
        border-top: var(--ddd-border-xs);
      }

      .history-actions p {
        padding-top: var(--ddd-spacing-0);
      }

      .error {
        color: light-dark(var(--ddd-theme-default-original87Pink), var(--ddd-theme-default-white));
      }

      @media (max-width: 768px) {
        .columns {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      @media (max-width: 600px), (max-width: 900px) and (max-height: 500px) {
        h3 {
          font-size: var(--ddd-font-size-s);
        }

        p, pre {
          font-size: var(--ddd-font-size-4xs);
        }

        button {
          font-size: var(--ddd-font-size-5xs);
        }

        .load-revision {
          font-size: var(--ddd-font-size-2xs);
          padding: var(--ddd-spacing-1) var(--ddd-spacing-3);
        }

        .columns {
          gap: var(--ddd-spacing-3);
        }

        .page-header, .toolbar, .columns, .history-actions {
          padding: var(--ddd-spacing-3);
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
                aria-pressed=${this._selected?.id === revision.id ? "true" : "false"}
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
