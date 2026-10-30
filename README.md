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
For example, a bare undeclared name is rejected even though it is valid syntax.
Globals supplied by other site scripts are not assumed to exist; access those
explicitly through `window` or `globalThis` where appropriate. This does not
validate properties on those objects or guarantee that they exist at runtime.
The panel rechecks JavaScript before opening save authentication and again before
emitting `save-request`, so changes made during authentication are checked too.
CSS is not validated by Acorn. The check uses classic-script syntax; imports and
exports are not supported. A passing check does not guarantee runtime safety,
detect infinite loops, or prove that code will work on the site. The sample
iframe remains static and does not execute editor drafts yet.

Restart the development server after dependency/configuration changes. The dev
server and browser tests bundle the validator's CommonJS dependencies with
esbuild; production Rollup uses CommonJS and JSON adapters.

Validation tests:

```sh
node --test test/validate-javascript.test.mjs
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
