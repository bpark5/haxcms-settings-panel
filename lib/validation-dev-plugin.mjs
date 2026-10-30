import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Serve a browser-ready validator; its analysis dependencies use CommonJS.
export function validationDevPlugin() {
  return {
    name: "code-validator-bundle",
    async serve(context) {
      const validators = {
        "/lib/validate-javascript.js": "./validate-javascript.js",
        "/lib/validate-css.js": "./validate-css.js",
      };
      if (!Object.hasOwn(validators, context.path)) return;
      const result = await build({
        entryPoints: [fileURLToPath(new URL(validators[context.path], import.meta.url))],
        bundle: true,
        write: false,
        format: "esm",
        platform: "browser",
        target: "es2022",
      });
      return { body: result.outputFiles[0].text, type: "js" };
    },
  };
}
