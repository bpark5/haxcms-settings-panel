// import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';
import { validationDevPlugin } from './lib/validation-dev-plugin.mjs';
import { previewComponentsDevPlugin } from './lib/preview-components-bundle.mjs';

import { createMockCodeStore } from './lib/mock-code-store.mjs';
import { mockAuthorization } from './lib/mock-reauthentication.mjs';
import { createMockSaveCode as saveMiddleware, createMockAuthentication,
  createMockCodeHistory as historyMiddleware, createMockCodeSource as sourceMiddleware } from './lib/mock-api-middleware.mjs';

const codeStore = createMockCodeStore();
export { createMockAuthentication };
export const createMockSaveCode = (
  saveCode = (language, code, check) => codeStore.save(language, code, check), authorization = mockAuthorization,
) => saveMiddleware(saveCode, authorization);
export const createMockCodeHistory = (store = codeStore) => historyMiddleware(store);
export const createMockCodeSource = (store = codeStore) => sourceMiddleware(store);

/** Use Hot Module replacement by adding --hmr to the start command */
const hmr = process.argv.includes('--hmr');

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  open: false,
  watch: !hmr,
  // Saving output must not reload the page: drafts and the nonce live in memory.
  // Chokidar 4 accepts regular expressions rather than glob patterns here.
  chokidarOptions: {
    ignored: [
      /[/\\]mock-site[/\\]custom\.(?:js|css)(?:\.[^/\\]+\.tmp)?$/,
      /[/\\]mock-site[/\\]history(?:[/\\]|$)/,
    ],
  },
  https: true,
  dedupe: true,
  middleware: [createMockAuthentication(), createMockSaveCode(), createMockCodeHistory(), createMockCodeSource()],
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
