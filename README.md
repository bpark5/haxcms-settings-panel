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