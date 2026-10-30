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
rechecked before saving. CSS is not validated by Acorn. The check uses classic-script syntax; imports and
exports are not supported. A passing check does not guarantee runtime safety,
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

Save is disabled while the current draft preview is pending or has reported a
runtime error. Both language tabs share this preview gate because JavaScript and
CSS run together. A corrected draft must run in a fresh iframe before Save is
enabled again. The gate is rechecked after authentication. Preview readiness
means initial execution completed with no errors observed so far; errors from
later timers or interactions can still arrive and disable Save. The backend does
syntax validation only and does not execute submitted code.

The mock save handler independently validates JavaScript with Acorn (classic
scripts) and CSS with CSSTree before calling the file writer. Invalid syntax
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
