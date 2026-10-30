import { validationDevPlugin } from "./lib/validation-dev-plugin.mjs";

export default {
  nodeResolve: true,
  plugins: [validationDevPlugin()],
};
