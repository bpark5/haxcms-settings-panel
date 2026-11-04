import { validationDevPlugin } from "./lib/validation-dev-plugin.mjs";
import { previewComponentsDevPlugin } from "./lib/preview-components-bundle.mjs";

export default {
  nodeResolve: true,
  // Preview/Monaco readiness checks may outlast Mocha's 2-second default,
  // especially with coverage enabled; individual polling bounds still apply.
  testFramework: { config: { timeout: 10000 } },
  plugins: [validationDevPlugin(), previewComponentsDevPlugin()],
};
