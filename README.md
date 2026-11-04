# haxcms-settings-panel

A standalone Lit web component for managing HAX CMS site settings, built using the HAX Design, Develop, Destroy (DDD) design system.

The project currently focuses on providing an interface for editing custom JavaScript and CSS, with an authentication prompt for accessing settings and authorizing changes.

## Features 

- Settings panel with breadcrumb navigation
- Authentication prompt with required and optional modes
- Password visibility toggle
- Responsive layouts for desktop and mobile devices
- Mock authentication API for development and testing purposes

## Commands

JavaScript drafts are parsed with Acorn and checked for undefined variable
references with eslint-scope after 750 ms without editor changes. Browser and
ECMAScript globals are allowed; declarations and function parameters are resolved
by scope. The workspace displays errors with one-based line and column numbers.
For example, a bare undeclared name produces a scope warning while still allowing
preview updates and Save. Only syntax errors block those operations; scope
analysis is feedback about possible mistakes, not a malicious-code detector.
Globals supplied by other site scripts are not assumed to exist; access those
explicitly through `window` or `globalThis` where appropriate. This does not
validate properties on those objects or guarantee that they exist at runtime.
The panel rechecks JavaScript before opening save authentication and again before
emitting `save-request`, so changes made during authentication are checked too.
CSS is parsed separately with CSSTree after the same 750 ms pause. Recovered
parse errors and unclosed blocks are reported with line and column locations.
CSS property/value compatibility and safety are not checked. Both languages are
rechecked before saving. CSS is not validated by Acorn. JavaScript is parsed and
executed as an ES module to match HAX's custom module loader. Static imports,
dynamic `import()`, and all exports are explicitly rejected, including imports
inside functions. This is a source-code restriction, not a security boundary or
a guarantee against other forms of resource loading. Modules use strict mode;
top-level `this` is `undefined`, and top-level declarations do not become
properties of `window`. Use `window` or `globalThis` explicitly when sharing a
value with other code. Top-level `await` is supported by this prototype.
A passing check does not guarantee runtime safety,
detect infinite loops, or prove that code will work on the site. The sample
iframe starts from saved customizations, then automatically applies valid editor
drafts after the validation pause. Invalid drafts leave the previous preview
visible. Observed runtime errors are reported separately. Save persists the
selected language; typing and preview updates never call the save endpoint.

Restart the development server after dependency/configuration changes. The dev
server and browser tests bundle the validator's CommonJS dependencies with
esbuild; production Rollup uses CommonJS and JSON adapters.

Validation tests:

```sh
node --test test/validate-javascript.test.mjs test/validate-css.test.mjs
npx web-test-runner test/code-validation.test.js --node-resolve
```

- `npm install` - Install project dependencies
- `npm start` - Start the frontend development server
- `vercel dev` - Run the development server with the mock authentication API
- `npm run build` - Build and analyze the component
- `npm run test` - Run tests
- `npm run release` - Build, version bump, and publish

Before committing, run `npm run precheck`, `npm test`, and `npm run build`.
Precheck parses the project's JavaScript and rejects optional chaining for HAX
toolchain compatibility. `npm test` runs both the Node backend/validation tests
and the browser tests with this repo's runner configuration and coverage.
CI runs the same checks before building; Pages deployment runs only on pushes
to the default branch after those checks pass.

The prototype uses DDD tokens and its existing component base classes. The shell
follows the system-settings layout: a dark breadcrumb bar, collapsible section
rail, section header, language/history toolbar, scrolling workspace, and persistent
action bar. The rail is hidden on small screens, where the toolbar remains available.
Unsaved drafts have change dots in the language controls and navigation. Save
and Discard apply to the selected language and remain disabled until it changes.
Discard restores that language's last successfully saved code and preview without
writing a file or adding history; the other language's draft stays intact.

## Local customization history

The separate **History** button in the toolbar or navigation rail opens
a modal popup. Its title bar contains the breadcrumb and Close, followed by a
page header, read-only language/refresh toolbar, saved-version list and source
detail panel, and a bottom action bar with **Load into editor**. Changing the
history language does not switch the underlying editor until a version is loaded.
Escape or Close dismisses the popup and returns focus to History. Choose a
version to inspect its source as text.
**Load into editor** replaces only that language's draft, asks before replacing
unsaved edits, and runs the existing validation/live-preview flow. It never
saves automatically. Click the normal **Save** button to persist the loaded
draft as a new version; later versions remain available. Empty versions can be
loaded to clear a customization. The editor also indicates whether its current
text matches the last saved file.

The local middleware exposes:

- `GET /mock-code-history?language=javascript` (or `css`) for revision metadata.
- `GET /mock-code-history/:id?language=javascript` for a revision's source.
- `POST /mock-save-code` for normal validated saves, now returning revision metadata.

History is a prototype of HAX's Git-backed revision flow. It uses one JSON
journal per language at `mock-site/history/javascript.json` and `css.json`.
Each entry records a UUID, timestamp, source, and whether it was a save or a
preserved file. The first overwrite preserves the existing file, including an
empty file. Files manually edited outside the panel are preserved on the next
save too. A preserved timestamp means when it was archived, not when it was
originally authored. Invalid submissions are not recorded as saved revisions.

Active files and journals use temporary files followed by rename. Requests are
serialized per language within this dev-server process. If the final journal
write fails, the handler attempts to restore the previous active file; that
previous version is archived before the overwrite. This is not a transaction
across both files, a multi-process lock, or protection against every power-loss
scenario. History has no retention limit yet. The journals are ignored by Git
and are not copied into production builds. Existing history before this feature
cannot be reconstructed from the active files.

Restart the local server after configuration changes. Use `vercel dev` for the
existing mock password flow (`demo123`). History and saving are local development
middleware, not real authentication/authorization or production persistence.
Static hosting can show the preview but does not provide these endpoints.

History checks:

```sh
node --test test/*.test.mjs
npx web-test-runner test/code-validation.test.js test/code-history.test.js --node-resolve
```

## Working with the component

- `./haxcms-settings-panel.js` - Main settings panel component
- `haxcms-authentication-prompt.js` - Authentication prompt component
- `api/mock-authentication.js` - Mock authentication endpoint
- `./index.html` - Demo page
- `icons/` - SVG icons used by the components
- `lib/haxcms-settings-panel.haxProperties.json` - HAX component configuration
- Add additional dependencies using `npm install <package-name>`
- See `locales/` for i18n translation files

## Current Limitations and Future Work

This project is currently a standalone prototype and is not yet integrated into the HAX CMS backend.

Potential next steps include:

- Integrating with HAX CMS authentication and authorization
- Implementing server-side validation for privileged JavaScript/CSS operations
- Supporting loading, saving, updating, and deleting custom JavaScript/CSS

# Credits

A brighter future dreamed and developed by the Penn State [HAXTheWeb](https://hax.psu.edu/) initiative.

## Saving customizations locally

The preview now includes real `ddd-card` components. Draft JavaScript waits for
their registration and initial rendering inside each isolated iframe. Customize
`#learn-card` or `#practice-card` using component properties and supported styling
hooks, such as `#learn-card::part(title)`. Restart the development server to enable
the local component bundle endpoint. This is still a fixture, not a full HAX site.

Save is disabled while the current draft preview is pending or has reported a
runtime error. Both language tabs share this preview gate because JavaScript and
CSS run together. A corrected draft must run in a fresh iframe before Save is
enabled again. The gate is rechecked after authentication. Preview readiness
means module evaluation (including top-level `await`) completed with no errors
observed so far; errors from
later timers or interactions can still arrive and disable Save. The backend does
syntax validation only and does not execute submitted code.

The mock save handler independently validates JavaScript with Acorn using the
same module syntax and import/export restrictions as the editor, and CSS with
CSSTree before calling the file writer. Invalid syntax or unsupported imports/exports
returns HTTP 422 with a message and one-based line/column, leaving the saved files
untouched. Unexpected validation failures return HTTP 500 without writing.
Undefined JavaScript globals are not rejected by this backend syntax check.
Empty strings remain valid for clearing a customization. This checks syntax,
not safety or authorization. Restart the development server to load handler changes.

Save uses the existing mock authentication flow and posts the selected editor's
text to `/mock-save-code`. The server maps `javascript` to `mock-site/custom.js`
and `css` to `mock-site/custom.css`; client-supplied paths are never used. Each save
updates only that language's file. Empty drafts clear that language's customization.
The isolated preview initializes the editors from both saved files without
overwriting edits made during loading. Valid drafts then recreate the iframe,
with CSS after the baseline DDD/fixture styles and JavaScript after the fixture
markup. Relative CSS URLs resolve from `mock-site/`. Saved files are also copied into production
builds, but the save endpoint is development middleware, not production persistence.
Acorn and CSSTree do not establish code safety. Runtime reporting covers observed
errors, not every possible failure. Restart the development server after updating
the middleware/dependencies.

Try typing `.page-title { color: rebeccapurple; }` in the CSS tab. The mock site's
heading should change after the validation pause, before Save. Save keeps the
customization; switching back to JavaScript keeps its draft.
