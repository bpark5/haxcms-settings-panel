// import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';
import { writeFile } from 'node:fs/promises';
import { validationDevPlugin } from './lib/validation-dev-plugin.mjs';

const customCodeFile = new URL('./mock-site/custom.js', import.meta.url);
const maxSaveBytes = 1024 * 1024;

// Local proof of concept: store text only; do not execute or build it.
async function mockSaveCode(context, next) {
  // Vercel handles /api itself; use a separate path for dev-server middleware.
  if (context.path !== '/mock-save-code') {
    return next();
  }

  context.type = 'application/json';
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
    payload.language !== 'javascript' ||
    typeof payload.code !== 'string'
  ) {
    context.status = 400;
    context.body = {
      success: false,
      message: 'Expected language "javascript" and a code string.',
    };
    return;
  }

  try {
    // The destination is fixed on the server, never supplied by the client.
    await writeFile(customCodeFile, payload.code, 'utf8');
    context.status = 200;
    context.body = { success: true, message: 'JavaScript saved to mock-site/custom.js.' };
  } catch {
    context.status = 500;
    context.body = { success: false, message: 'Unable to save JavaScript.' };
  }
}

/** Use Hot Module replacement by adding --hmr to the start command */
const hmr = process.argv.includes('--hmr');

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  open: false,
  watch: !hmr,
  https: true,
  dedupe: true,
  middleware: [mockSaveCode],
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
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    // hmr && hmrPlugin({ exclude: ['**/*/node_modules/**/*'], presets: [presets.litElement] }),
  ],

  // See documentation for all available options
});
