import { html, css } from "lit";
import { DDD } from "@haxtheweb/d-d-d/d-d-d.js";
import { DDDVariables } from "@haxtheweb/d-d-d/lib/DDDStyles.js";

/** Layout for persistent code editors and the isolated sample site. */
export class HaxcmsCodeWorkspace extends DDD {

  static get properties() {
    return {
      ...super.properties,
      _previewDocument: { state: true },
      _previewError: { state: true },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadPreview();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this._previewController) {
      this._previewController.abort();
    }
  }

  async _loadPreview() {
    if (this._previewController) {
      this._previewController.abort();
    }

    const controller = new AbortController();
    this._previewController = controller;
    this._previewError = "";

    try {
      const fixtureUrl = new URL("./mock-site/preview.html", globalThis.document.baseURI);
      const stylesheetUrl = new URL("./preview.css", fixtureUrl);
      const [markup, stylesheet] = await Promise.all(
        [fixtureUrl, stylesheetUrl].map(async (url) => {
          const response = await fetch(url, { signal: controller.signal });

          if (!response.ok) {
            throw new Error(`Preview asset returned HTTP ${response.status}.`);
          }

          return response.text();
        }),
      );

      if (controller.signal.aborted || this._previewController !== controller) {
        return;
      }

      const preview = new DOMParser().parseFromString(markup, "text/html");

      // Keep the fixture static, including when the dev server injects scripts.
      for (const script of preview.querySelectorAll("script")) {
        script.remove();
      }

      const base = preview.createElement("base");
      base.href = fixtureUrl.href;
      preview.head.prepend(base);

      // The isolated document needs its own styles from the installed package.
      const style = preview.createElement("style");
      style.textContent = `${DDDVariables.cssText}\n${stylesheet}`;
      const link = preview.querySelector('link[rel="stylesheet"]');

      if (link) {
        link.replaceWith(style);
      } else {
        preview.head.append(style);
      }

      this._previewDocument = `<!doctype html>\n${preview.documentElement.outerHTML}`;
    } catch (error) {
      if (!controller.signal.aborted && this._previewController === controller) {
        this._previewError = "Unable to load the sample site. Reload to try again.";
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
            <slot class = "editor-slot"></slot>
          </div>
        </div>
        <div class = "preview-section" aria-labelledby = "preview-heading">
          <div class = "heading">
            <h3 class = "preview-title" id = "preview-heading">Site preview</h3>
            <p class = "preview-description">Sample site · Editor changes are not applied yet.</p>
            <p class = "preview-status" role = "status" ?hidden=${!!this._previewDocument && !this._previewError}>
              ${this._previewError || "Loading sample site…"}
            </p>
          </div>
          <iframe
            class = "preview-frame"
            title = "Sample Learning studio site preview"
            srcdoc = ${this._previewDocument || ""}
            sandbox = "allow-scripts"
          ></iframe>
        </div>
      </div>
    `;
  }
}

globalThis.customElements.define("haxcms-code-workspace", HaxcmsCodeWorkspace);
