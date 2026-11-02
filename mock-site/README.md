# Preview fixture

## Saved-version prototype

`custom.js` and `custom.css` remain the active saved files. Successful local saves
also record revisions in `history/javascript.json` or `history/css.json`.
The existing content is preserved before its first overwrite. These generated
journals are ignored by Git; do not commit local history. This simulates the
list/inspect/restore behavior of HAX's Git history, not Git itself.

Open **History** beside Save to inspect a version in a modal popup. **Load into editor**
changes the draft and live preview only. The normal Save flow then creates a new
revision, preserving the intervening versions. The JavaScript and CSS histories
are independent. A source inspection never executes historical code.

`preview.html` is the initial content for the planned always-visible iframe preview. With the existing development server running, open the demo page to view it beside the editor. Opening the HTML file directly shows the markup without the DDD tokens supplied by the workspace.

This is a representative local page, not a rendering of an actual HAX site. It includes navigation, headings, text, resource cards, and a button for exercising custom CSS and JavaScript. The workspace imports `DDDVariables` from the installed DDD package and embeds them before the fixture stylesheet in the iframe document. There is no separately maintained token copy. DDD font stacks use locally available fallbacks; this fixture does not download web fonts.

## Draft integration contract

`custom.js` stores the user's saved JavaScript, and `custom.css` stores the user's
saved CSS for this same mock site. They are intentionally empty until a user
saves a customization. Their contents load directly into the corresponding
editors, so file-purpose documentation belongs here rather than in placeholder
comments. Comments written by users remain part of their code and are saved
normally.

The resource cards are real `ddd-card` elements from the installed DDD package.
`preview-components.js` is bundled into a self-contained script by the development
server and production build. The parent fetches that bundle and includes it as
data in the sandbox bootstrap, avoiding cross-origin module imports and preserving
`sandbox="allow-scripts"` without `allow-same-origin`. The bootstrap registers the
cards and waits for their initial Lit updates before applying drafts. Component
initialization failures are reported as preview errors and keep Save disabled.
Restart the development server after this configuration change.

Use `#learn-card` and `#practice-card` for draft customization. For example:

```js
document.querySelector("#learn-card").title = "My HAX card";
```

```css
#learn-card::part(title) {
  color: rebeccapurple;
}
```

The title is rendered in Shadow DOM, so `.resource-card .title` will not reach it.
Use the card's properties, CSS custom properties, slots, or exposed parts. The
fixture is English-first; preview-local localization/assets need explicit paths
and CORS support before expanding the component set. DDD may load its own fonts.

- Preserve `preview.css` as the baseline theme. Apply the CSS draft in a separate stylesheet after it so normal CSS cascade rules apply.
- Run the JavaScript draft only after the fixture DOM and baseline assets are ready. Drafts use ES module execution and Acorn's `sourceType: "module"`. Static imports, dynamic `import()`, and exports are rejected by the shared validator. Module declarations stay local, strict mode applies, and top-level `this` is `undefined`.
- Useful stable targets include `#page-title`, `.resource-card`, `#preview-action`, and `#preview-status`. The button intentionally has no built-in handler; saved JavaScript can add a click listener that updates the status text.
- `custom.js` and `custom.css` are fixed mock Save destinations for the same site. The workspace uses them to initialize the editors, then automatically applies valid drafts to fresh iframe instances. Save persists the selected language and does not trigger preview application.
- `haxcms-code-workspace` displays the fixture in a sandboxed iframe beside the editors. Invalid drafts preserve the previous preview; observed runtime errors are reported through messages checked against the current iframe and run identifier. Opening this fixture directly does not provide that isolation.
- The Rollup configuration copies the fixture HTML/CSS and both saved custom files into `public/mock-site`. The workspace fetches both files, assembles a `srcdoc` document with the installed DDD variables, and supplies an explicit base URL for relative assets. Loading is canceled on disconnect and stale results are ignored; load failures appear beside the preview.

## Actual site fidelity

Replacing the fixture with a real site requires a defined source for page markup, theme styles, images/fonts, and component modules. It also requires explicit asset base URLs, loading order, and CORS/CSP rules compatible with an opaque-origin sandbox. Parent-page styles and custom-element registrations do not automatically carry into the iframe.

The fixture does not load authentication or call the save endpoint. JavaScript drafts are checked with Acorn and scope analysis; CSS drafts are checked with CSSTree. Drafts run only in the isolated iframe and are serialized as data to prevent closing HTML tags in strings from altering the fixture markup. Validation does not establish code safety.

The trusted preview bootstrap loads each draft as a temporary Blob-backed module
inside the iframe and awaits its evaluation, including top-level `await`, before
reporting readiness. It revokes the Blob URL afterward. This internal module
loading is separate from the imports prohibited in user drafts. Evaluation
failures are reported and do not mark the preview ready; later unhandled errors
continue to disable Save. A never-settling top-level await remains pending, and
an infinite loop is not contained by this readiness mechanism. Blob module URLs
also mean `import.meta.url` is not the eventual site's file URL; relative asset
paths based on it are not represented by this fixture.

## Design and accessibility

The workspace and fixture follow [PRAW's DDD design guidance](https://github.com/haxtheweb/praw/blob/main/DESIGN.md): token-driven styles, light/dark surfaces, and a 768px responsive breakpoint. The workspace extends the installed `DDD` base class. The sample page uses semantic landmarks, labeled navigation, native links/buttons, and visible keyboard focus; the preview iframe has an accessible title. Tab moves between the editor, preview links/buttons, and surrounding controls using their native behavior. Browser verification of keyboard navigation, responsive layout, and both color schemes remains pending.
