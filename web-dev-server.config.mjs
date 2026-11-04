// import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';
import { createMockCodeStore } from './lib/mock-code-store.mjs';
import { validationDevPlugin } from './lib/validation-dev-plugin.mjs';
import { previewComponentsDevPlugin } from './lib/preview-components-bundle.mjs';
import { validateJavaScriptSyntax } from './lib/validate-javascript-syntax.js';
import { validateCSS } from './lib/validate-css.js';

const customCodeFiles = {
  javascript: new URL('./mock-site/custom.js', import.meta.url),
  css: new URL('./mock-site/custom.css', import.meta.url),
};
const maxSaveBytes = 1024 * 1024;
const codeStore = createMockCodeStore();

// Local proof of concept: store text only; do not execute or build it.
export function createMockSaveCode(saveCode = (language, code) => codeStore.save(language, code)) {
  return async function mockSaveCode(context, next) {
    // Vercel handles /api itself; use a separate path for dev-server middleware.
    if (context.path !== '/mock-save-code') {
      return next();
    }

    context.type = 'application/json';
    context.set('Cache-Control', 'no-store');
    if (context.method !== 'POST') {
      context.set('Allow', 'POST');
      context.status = 405;
      context.body = { success: false, message: 'Use POST to save code.' };
      return;
    }

    if (!context.is('application/json')) {
      context.status = 415;
      context.body = { success: false, message: 'Send an application/json body.' };
      return;
    }

    let payload;
    try {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of context.req) {
        const buffer = Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > maxSaveBytes) {
          context.status = 413;
          context.body = { success: false, message: 'Request exceeds the 1 MiB limit.' };
          return;
        }
        chunks.push(buffer);
      }
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      context.status = 400;
      context.body = { success: false, message: 'Invalid JSON request body.' };
      return;
    }

    if (
      !payload ||
      typeof payload.language !== 'string' ||
      !Object.hasOwn(customCodeFiles, payload.language) ||
      typeof payload.code !== 'string'
    ) {
      context.status = 400;
      context.body = {
        success: false,
        message: 'Expected language "javascript" or "css" and a code string.',
      };
      return;
    }

    let validation;
    try {
      validation = payload.language === 'css'
        ? validateCSS(payload.code)
        : validateJavaScriptSyntax(payload.code);
    } catch {
      context.status = 500;
      context.body = { success: false, message: 'Unable to validate customization. Nothing was saved.' };
      return;
    }

    if (!validation.valid) {
      context.status = 422;
      context.body = {
        success: false,
        language: payload.language,
        message: validation.message,
        line: validation.line,
        column: validation.column,
      };
      return;
    }

    try {
      // Validation precedes all writes. The destination is fixed on the server.
      const revision = await saveCode(payload.language, payload.code);
      context.status = 200;
      context.body = { success: true, revision, message: `${payload.language} customization saved.` };
    } catch {
      context.status = 500;
      context.body = { success: false, message: 'Unable to save customization.' };
    }
  };
}

export function createMockCodeHistory(store = codeStore) {
  return async (context, next) => {
    if (context.path !== '/mock-code-history' && !context.path.startsWith('/mock-code-history/')) return next();
    context.type = 'application/json';
    context.set('Cache-Control', 'no-store');
    if (context.method !== 'GET') {
      context.set('Allow', 'GET');
      context.status = 405;
      context.body = { success: false, message: 'Use GET to read history.' };
      return;
    }
    const language = context.query.language;
    if (typeof language !== 'string' || !Object.hasOwn(customCodeFiles, language)) {
      context.status = 400;
      context.body = { success: false, message: 'Choose javascript or css.' };
      return;
    }
    try {
      const id = context.path.slice('/mock-code-history'.length + 1);
      context.body = id
        ? { success: true, language, revision: await store.get(language, id) }
        : { success: true, language, revisions: await store.list(language) };
      context.status = 200;
    } catch (error) {
      context.status = error.status || 500;
      context.body = { success: false, message: error.status ? error.message : 'Unable to read local history.' };
    }
  };
}

/** Use Hot Module replacement by adding --hmr to the start command */
const hmr = process.argv.includes('--hmr');

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  open: false,
  watch: !hmr,
  https: true,
  dedupe: true,
  middleware: [createMockSaveCode(), createMockCodeHistory()],
  /** Resolve bare module imports */
  nodeResolve: {
    exportConditions: ['browser', 'development'],
  },
  
  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto'

  /** Set appIndex to enable SPA routing */
  // appIndex: 'demo/index.html',

  plugins: [
    validationDevPlugin(),
    previewComponentsDevPlugin(),
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    // hmr && hmrPlugin({ exclude: ['**/*/node_modules/**/*'], presets: [presets.litElement] }),
  ],

  // See documentation for all available options
});
