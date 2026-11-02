import { validationDevPlugin } from "./lib/validation-dev-plugin.mjs";
import { previewComponentsDevPlugin } from "./lib/preview-components-bundle.mjs";

export default {
  nodeResolve: true,
  plugins: [validationDevPlugin(), previewComponentsDevPlugin()],
};
