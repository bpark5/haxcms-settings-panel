import { html, css } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { DDD } from "@haxtheweb/d-d-d/d-d-d.js";
import { DDDVariables } from "@haxtheweb/d-d-d/lib/DDDStyles.js";
import { validateJavaScript } from "./lib/validate-javascript.js";
import { validateCSS } from "./lib/validate-css.js";
import { createPreviewDocument } from "./lib/create-preview-document.js";

/** Layout for persistent code editors and the isolated sample site. */
export class HaxcmsCodeWorkspace extends DDD {

  static get properties() {
    return {
      ...super.properties,
      _previewDocument: { state: true },
      _previewError: { state: true },
      _runtimeError: { state: true },
      _previewStale: { state: true },
      _validationMessages: { state: true },
      selectedLanguage: { type: String },
    };
  }

  constructor() {
    super();
    this.selectedLanguage = "javascript";
    this._validationMessages = {};
    this._validationTimers = {};
    this._drafts = { javascript: "", css: "" };
    this._editedLanguages = new Set();
    this._previewRun = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this._onEditorChange ||= this._scheduleValidation.bind(this);
    // code-editor emits a non-bubbling value-changed event.
    this.addEventListener("value-changed", this._onEditorChange, true);
    this._onPreviewMessage ||= this._handlePreviewMessage.bind(this);
    globalThis.addEventListener("message", this._onPreviewMessage);
    this._notifyPreviewState();
    this._loadPreview();
  }

  disconnectedCallback() {
    Object.values(this._validationTimers).forEach(clearTimeout);
    this.removeEventListener("value-changed", this._onEditorChange, true);
    globalThis.removeEventListener("message", this._onPreviewMessage);
    this._previewRun++;
    super.disconnectedCallback();

    if (this._previewController) {
      this._previewController.abort();
    }
  }

  /** Validate the selected language before saving without modifying its draft. */
  validateDraft(language = this.selectedLanguage) {
    if (language !== "javascript" && language !== "css") return false;
    clearTimeout(this._validationTimers[language]);
    delete this._validationTimers[language];
    const editor = this.querySelector(`code-editor[language="${language}"]`);
    if (!editor) return true;
    const validator = language === "css" ? validateCSS : validateJavaScript;
    const result = validator(editor.value ?? "");
    this._validationMessages = { ...this._validationMessages, [language]: result.message };
    this.dispatchEvent(new CustomEvent("code-validation", {
      detail: { language, ...result },
      bubbles: true,
      composed: true,
    }));
    this._updatePreview();
    return result.valid;
  }

  validateJavaScriptDraft() {
    return this.validateDraft("javascript");
  }

  _scheduleValidation(event) {
    for (const language of ["javascript", "css"]) {
      const editor = this.querySelector(`code-editor[language="${language}"]`);
      if (!editor || !event.composedPath().includes(editor)) continue;
      const value = editor.value ?? "";
      if (this._drafts[language] === value) continue;
      this._drafts[language] = value;
      this._editedLanguages.add(language);
      this._previewStale = true;
      this._notifyPreviewState();
      clearTimeout(this._validationTimers[language]);
      const label = language === "css" ? "CSS" : "JavaScript";
      this._validationMessages = { ...this._validationMessages, [language]: `Checking ${label}…` };
      this.dispatchEvent(new CustomEvent("code-validation", {
        detail: { language, valid: false, pending: true, message: `Checking ${label}…` },
        bubbles: true,
        composed: true,
      }));
      this._validationTimers[language] = setTimeout(() => this.validateDraft(language), 750);
    }
  }

  _validateEditors() {
    this.validateDraft("javascript");
    this.validateDraft("css");
  }

  _readDrafts() {
    return Object.fromEntries(["javascript", "css"].map((language) => {
      const editor = this.querySelector(`code-editor[language="${language}"]`);
      return [language, editor ? editor.value ?? "" : this._drafts[language]];
    }));
  }

  _updatePreview() {
    if (!this._fixture || Object.keys(this._validationTimers).length) return;
    const drafts = this._readDrafts();
    if (!validateJavaScript(drafts.javascript).valid || !validateCSS(drafts.css).valid) {
      this._previewStale = true;
      this._notifyPreviewState();
      return;
    }
    const snapshot = JSON.stringify(drafts);
    if (snapshot === this._appliedDrafts) {
      this._previewStale = false;
      this._notifyPreviewState();
      return;
    }
    this._previewRun++;
    this._runtimeError = "";
    this._previewReady = false;
    this._previewDocument = createPreviewDocument(
      this._fixture.markup,
      `${DDDVariables.cssText}\n${this._fixture.stylesheet}`,
      this._fixture.url,
      drafts,
      this._previewRun,
    );
    this._appliedDrafts = snapshot;
    this._previewStale = false;
    this._notifyPreviewState();
  }

  /** Save requires the current drafts to have run without an observed error. */
  get canSavePreview() {
    return !!this._previewReady && !this._runtimeError && !this._previewError &&
      !this._previewStale && this._appliedDrafts === JSON.stringify(this._readDrafts());
  }

  _notifyPreviewState() {
    this.dispatchEvent(new CustomEvent("preview-state", {
      detail: {
        canSave: this.canSavePreview,
        message: this._runtimeError || this._previewError || "Waiting for the current draft preview to run.",
      },
      bubbles: true,
      composed: true,
    }));
  }

  _handlePreviewMessage(event) {
    const frame = this.shadowRoot.querySelector("iframe");
    const data = event.data;
    if (!frame || event.source !== frame.contentWindow || !data) return;
    if (data.runId !== this._previewRun) return;
    if (data.type === "preview-ready") {
      this._previewReady = true;
    } else if (data.type === "preview-error" && typeof data.message === "string") {
      this._runtimeError = `Preview runtime error: ${data.message.slice(0, 2000)}`;
    } else {
      return;
    }
    this._notifyPreviewState();
  }

  async _loadPreview() {
    if (this._previewController) this._previewController.abort();
    const controller = new AbortController();
    this._previewController = controller;
    this._previewError = "";

    try {
      const fixtureUrl = new URL("./mock-site/preview.html", globalThis.document.baseURI);
      const urls = [fixtureUrl, ...["preview.css", "custom.js", "custom.css"].map(name => new URL(name, fixtureUrl))];
      const [markup, stylesheet, javascript, css] = await Promise.all(urls.map(async (url) => {
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`Preview asset returned HTTP ${response.status}.`);
        return response.text();
      }));
      if (controller.signal.aborted || this._previewController !== controller) return;

      this._fixture = { markup, stylesheet, url: fixtureUrl.href };
      // Initialize from saved files, without overwriting typing during loading.
      for (const [language, code] of Object.entries({ javascript, css })) {
        const editor = this.querySelector(`code-editor[language="${language}"]`);
        if (this._editedLanguages.has(language) || (editor && editor.value)) continue;
        this._drafts[language] = code;
        if (editor) {
          editor.value = code;
          editor.editorValue = code;
        }
      }
      this._validateEditors();
    } catch (error) {
      if (!controller.signal.aborted && this._previewController === controller) {
        this._previewError = "Unable to load the sample site. Reload to try again.";
        this._notifyPreviewState();
      }
    }
  }

  static get styles() {
    return [super.styles,
    css`
      :host {
        display: block;
        font-family: var(--ddd-font-primary);
        color: light-dark(var(--ddd-theme-default-coalyGray), var(--ddd-theme-default-white));
      }

      .workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: var(--ddd-spacing-4);
        margin-top: var(--ddd-spacing-4);
      }

      .editor-section, .preview-section, .preview-status {
        min-width: 0;
        border: var(--ddd-border-sm);
        border-radius: var(--ddd-radius-sm);
        overflow: hidden;
      }

      .heading {
        padding: var(--ddd-spacing-3) var(--ddd-spacing-4);
        border-bottom: var(--ddd-border-sm);
      }

      .validation-status, .preview-draft-status, .preview-runtime-status {
        grid-column: 1 / -1;
        margin: 0;
        padding: var(--ddd-spacing-3);
        overflow-wrap: anywhere;
      }

      .editor-title, .preview-title {
        margin: 0;
        font-family: var(--ddd-font-navigation);
        font-size: var(--ddd-font-size-4xs);
        font-weight: var(--ddd-font-weight-bold);
        line-height: var(--ddd-lh-150);
      }

      .editor-description, .preview-description {
        margin: var(--ddd-spacing-1) 0 0;
        font-family: var(--ddd-font-primary);
        font-size: var(--ddd-font-size-5xs);
        line-height: var(--ddd-lh-150);
      }

      .editor, iframe {
        height: 620px;
        height: clamp(420px, 65vh, 760px);
      }

      ::slotted(code-editor) {
        display: flex;
        height: 100%;
        min-width: 0;
        margin: 0;
      }

      ::slotted([hidden]) {
        display: none !important;
      }

      iframe {
        display: block;
        width: 100%;
        border: 0;
        background: light-dark(var(--ddd-theme-default-white), var(--ddd-theme-default-coalyGray));
      }

      @media (max-width: 768px) {
        .workspace {
          grid-template-columns: minmax(0, 1fr);
        }

      }
    `];
  }

  render() {
    return html`
      <div class = "workspace">
        <div class = "editor-section" aria-labelledby = "editor-heading">
          <div class = "heading">
            <h3 class = "editor-title" id = "editor-heading">Code editor</h3>
            <p class = "editor-description">JavaScript and CSS drafts are kept separately.</p>
          </div>
          <div class = "editor">
            <slot class = "editor-slot" @slotchange=${this._validateEditors}></slot>
          </div>
        </div>
        <div class = "preview-section" aria-labelledby = "preview-heading">
          <div class = "heading">
            <h3 class = "preview-title" id = "preview-heading">Site preview</h3>
            <p class = "preview-description">Draft preview · Changes appear automatically after validation. Save keeps them for your site.</p>
            <p class = "preview-status" role = "status" ?hidden=${!!this._previewDocument && !this._previewError}>
              ${this._previewError || "Loading sample site…"}
            </p>
          </div>
          ${keyed(this._previewRun, html`<iframe
            class = "preview-frame"
            title = "Sample Learning studio site preview"
            srcdoc = ${this._previewDocument || ""}
            sandbox = "allow-scripts"
          ></iframe>`)}
        </div>
        <p class = "preview-draft-status" role = "status" ?hidden=${!this._previewStale}>
          Showing the previous preview while the current draft is pending or invalid.
        </p>
        <p class = "preview-runtime-status" role = "status" ?hidden=${!this._runtimeError}>${this._runtimeError}</p>
        <p role="status" aria-live="polite" class="validation-status">${this._validationMessages[this.selectedLanguage] || ""}</p>
      </div>
    `;
  }
}

globalThis.customElements.define("haxcms-code-workspace", HaxcmsCodeWorkspace);
