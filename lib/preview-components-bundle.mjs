import { build } from "esbuild";
import { fileURLToPath } from "node:url";

/** One self-contained classic script for the opaque-origin preview iframe. */
export async function bundlePreviewComponents() {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("../mock-site/preview-components.js", import.meta.url))],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    // The bundle is evaluated from text. Resolve component asset URLs against
    // the fixture's explicit base, rather than an inline script's missing URL.
    define: { "import.meta.url": "document.baseURI" },
  });
  return result.outputFiles[0].text;
}

export function previewComponentsDevPlugin() {
  return {
    name: "preview-components-bundle",
    async serve(context) {
      if (context.path !== "/mock-site/preview-components.js") return;
      return { body: await bundlePreviewComponents(), type: "js" };
    },
  };
}
