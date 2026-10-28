# Preview fixture

`preview.html` is the initial content for the planned always-visible iframe preview. With the existing development server running, open the demo page to view it beside the editor. Opening the HTML file directly shows the markup without the DDD tokens supplied by the workspace.

This is a representative local page, not a rendering of an actual HAX site. It includes navigation, headings, text, resource cards, and a button for exercising custom CSS and JavaScript. The workspace imports `DDDVariables` from the installed DDD package and embeds them before the fixture stylesheet in the iframe document. There is no separately maintained token copy. DDD font stacks use locally available fallbacks; this fixture does not download web fonts.

## Draft integration contract

- Preserve `preview.css` as the baseline theme. Apply the CSS draft in a separate stylesheet after it so normal CSS cascade rules apply.
- Run the JavaScript draft only after the fixture DOM and baseline assets are ready. The initial execution model is a classic browser script, so future Acorn checks must use `sourceType: "script"`.
- Useful stable targets include `#page-title`, `.resource-card`, `#preview-action`, and `#preview-status`. The button intentionally has no built-in handler; a draft can add a click listener that updates the status text.
- `custom.js` is the existing mock Save destination. This fixture deliberately does not load it: future previews must use the current accepted editor snapshot, independently of saving.
- `haxcms-code-workspace` displays the fixture in a sandboxed iframe beside the editors. Draft execution, runtime reporting, revision checks, and fresh iframe creation remain for later stages. Opening this fixture directly does not provide that isolation.
- The Rollup configuration copies the fixture HTML and CSS into `public/mock-site`. The workspace fetches both files, assembles a `srcdoc` document with the installed DDD variables, and supplies an explicit base URL for relative assets. Loading is canceled on disconnect and stale results are ignored; load failures appear beside the preview.

## Actual site fidelity

Replacing the fixture with a real site requires a defined source for page markup, theme styles, images/fonts, and component modules. It also requires explicit asset base URLs, loading order, and CORS/CSP rules compatible with an opaque-origin sandbox. Parent-page styles and custom-element registrations do not automatically carry into the iframe.

The fixture does not load authentication, call the save endpoint, or execute draft code. Acorn syntax validation and isolated execution will be added in later stages; syntax validation does not establish code safety.

## Design and accessibility

The workspace and fixture follow [PRAW's DDD design guidance](https://github.com/haxtheweb/praw/blob/main/DESIGN.md): token-driven styles, light/dark surfaces, and a 768px responsive breakpoint. The workspace extends the installed `DDD` base class. The sample page uses semantic landmarks, labeled navigation, native links/buttons, and visible keyboard focus; the preview iframe has an accessible title. Tab moves between the editor, preview links/buttons, and surrounding controls using their native behavior. Browser verification of keyboard navigation, responsive layout, and both color schemes remains pending.
