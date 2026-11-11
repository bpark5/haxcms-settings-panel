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
- `vercel dev` - Optionally wrap the development server; authorization also works with `npm start`
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

Restart the local server after configuration changes. `npm start` supplies the
local mock password flow (`demo123`) and file storage. Hosted Vercel deployments
use the function and shared-storage setup below. This is still a demo account,
not real HAX authentication. Static hosting alone does not supply the API.

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

Save uses the local nonce authorization flow described below and posts the selected editor's
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

## Local nonce authorization

Restart with `npm start` after installing dependencies, then reload the page.
Enter `demo123` in the opening password dialog. This verifies the demo account
and grants a reusable nonce for **60 seconds after password verification**.
Save valid JavaScript or CSS during that minute without another password prompt.
Saves do not extend the deadline. After a minute, the next Save asks for the
password again. Cancelling or failing authentication preserves both editor
drafts. Loading a history revision remains a draft operation, not a save.
Saved JS/CSS and history output are excluded from development-server live reload
so a save does not reload the page and erase the in-memory nonce or other draft.
Source-code edits still trigger normal live reload.

The development server provides three authorization steps:

- `GET /mock-session` simulates an existing login and returns a signed development
  JWT (15-minute lifetime) and the demo account's user token. This public bootstrap
  is intentionally a local fixture, never a production login mechanism.
- `POST /mock-authentication` checks `Authorization: Bearer ...`, the matching
  `X-HAXCMS-User-Token`, and `{ "password": "demo123" }`. Only successful verification
  issues a nonce with expiry metadata.
- `POST /mock-save-code` requires those identity headers plus
  `X-HAXCMS-Reauthentication: <nonce>` and the existing `{ language, code }` body.
  Identity and nonce validity are checked again inside the store queue before
  writing either active code or preserved history.

The server derives a key from a dedicated server secret and the validated user
token using HMAC-SHA-256. AES-256-GCM protects the issue timestamp, account, version,
and reauthentication purpose with a fresh random IV for every issued nonce.
Nonces are not bound to a language or payload and are not consumed by a save.
Malformed, future-dated, tampered, or 60-second-old nonces are rejected.

Credentials live only in frontend memory and are never sent into the preview or
written to history. The backend checks every save regardless of the client clock.
An explicit `REAUTH_REQUIRED` rejection opens the password prompt and permits one
retry of the same submitted snapshot. Session/user-token failures, network errors,
and persistence failures do not automatically retry a save. Newer edits stay dirty.
An expired demo JWT requires a page reload; copy unsaved drafts before reloading.

No secret setup is required for a single local server: signing and nonce secrets
are random per process, so restarting invalidates existing credentials. Optional
server launch variables `HAX_MOCK_JWT_SECRET` and `HAX_MOCK_REAUTH_SECRET` can supply
independent high-entropy secrets (at least 32 random bytes each). Do not put secrets
in browser source. Local requests run in one dev-server process. Vercel requests,
including the older `/api/mock-authentication` URL, use shared Redis state and
require stable environment keys as described below.

This implementation does not call real HAX APIs or modify the real OpenAPI spec.
Future integration replaces the simulated session and identity/password checks
with HAX's request-scoped authentication and adds the real protected-save contract.

### Invalid inputs and password cooldown

Three incorrect password attempts within 15 minutes trigger a **60-second
server-enforced cooldown** on the demo account. The third failure returns HTTP 429
with `AUTH_RATE_LIMITED`, a `Retry-After` header and `retryAfterSeconds`. During the
cooldown, even the correct password is refused; the dialog disables Login and
shows a countdown. Successful password verification resets the failure count.
Reloading or obtaining another demo JWT does not reset the server's counter.

Nonce generation also permits at most 20 password-check requests per minute per
demo account, including successful ones, to bound expensive hashing. Authentication
accepts only a JSON object containing one password string (1–1024 UTF-8 bytes).
The local route limits the body to 4 KiB; saves retain their 1 MiB limit. JWTs are
bounded before verification, user-token lengths are checked before comparison,
and nonce parts must use canonical base64url encoding.

Run `npm run test:fuzz` for reproducible, seeded mutation tests covering 1,400
JWT/token/nonce/body mutations plus malformed-type and boundary cases. The save
tests use a temporary store and assert that rejected requests change neither
active files nor history. Cooldown tests use a controlled clock instead of waiting.
These tests are also included in `npm test`.

Fuzzing attempts cannot be prevented, and passing a finite corpus does not prove
all possible inputs safe. The tests exercise rejection and persistence guarantees;
they are not a production load/DoS audit. Local limits are in memory and reset on
server restart. The Vercel adapter persists counters in Redis across instances.
Real HAX integration should use HAX's shared rate-limit infrastructure.

## Hosted demo on Vercel

`vercel.json` builds `public/` and rewrites `/mock-session`, `/mock-authentication`,
`/mock-save-code`, `/mock-code-history` (including revision details), and
`/mock-code-source` to `api/mock.js`. That function adapts the same validation and
authorization middleware used locally; it does not run the development server.
The old `/api/mock-authentication` URL remains an alias to the hosted service.

Deployment setup:

1. Connect **Upstash for Redis** from the project's Vercel Storage/Marketplace
   tab. A free plan is sufficient for this prototype. Disable automatic plan
   upgrades and data eviction. Connect production and preview as needed.
2. Set two independent server-side variables: `HAX_MOCK_JWT_SECRET` and
   `HAX_MOCK_REAUTH_SECRET`. Each should be at least 32 cryptographically random
   bytes, encoded as base64 or hex. Never commit them or put them in frontend code.
3. The adapter accepts the integration's `KV_REST_API_URL`/`KV_REST_API_TOKEN`
   or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` variables. Use the full
   read/write token, not a read-only token. See `.env.example` for variable names.
4. Redeploy after configuring these variables. `vercel build --prod --yes`
   checks the deployment bundle locally; it does not publish it.

Redis stores the active source and complete revision history as one document per
language. Atomic compare-and-set updates prevent lost saves across function
instances. Nonce/session expiry is checked again using Redis's clock in the same
operation that commits code and history. A rejected save cannot create even the
initial preserved revision. The first save preserves the bundled seed code; later
deployments do not overwrite shared customizations. Documents are capped at 4 MiB;
exceeding the limit rejects the save and retains existing history rather than
silently pruning it. Counters expire after 15 minutes of inactivity.

`GET /mock-code-source?language=javascript` (or `css`) loads the shared saved source
as plain text with `no-store`; the preview uses this rather than stale bundled
files. The local endpoint reads the original file store. The browser runs drafts
only in its existing sandbox; API functions never execute submitted code.

Production and preview use separate storage namespaces by default. Set a stable
`HAX_MOCK_STORAGE_PREFIX` if multiple projects share a database or separate preview
branches need independent demos. All visitors to one namespace share the demo
account, customizations, history, and cooldown; use sample code only.

Missing configuration or storage failure returns a JSON error and prevents saves.
There is no temporary-filesystem or per-instance memory fallback on Vercel. No
real HAX API, Git-backed history, or OpenAPI specification is changed by this
adapter. Before real HAX integration, replace the mock session/account checks and
storage with the actual HAX equivalents.
