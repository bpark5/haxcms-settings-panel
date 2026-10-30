import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Serve a browser-ready validator; its analysis dependencies use CommonJS.
export function validationDevPlugin() {
  return {
    name: "javascript-validator-bundle",
    async serve(context) {
      if (context.path !== "/lib/validate-javascript.js") return;
      const result = await build({
        entryPoints: [fileURLToPath(new URL("./validate-javascript.js", import.meta.url))],
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
