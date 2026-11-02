import { readdir, readFile } from "node:fs/promises";
import { parse } from "acorn";

const excluded = new Set(["node_modules", ".git", ".vercel", "public", "coverage", "mock-site"]);
const failures = [];
let checked = 0;

function inspect(source, filename) {
  try {
    const tree = parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true });
    const visit = node => {
      if (!node || typeof node !== "object") return;
      if (node.type === "ChainExpression") {
        failures.push(`${filename}:${node.loc.start.line}: optional chaining is incompatible with the HAX toolchain.`);
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") visit(value);
      }
    };
    visit(tree);
    checked++;
  } catch (error) {
    failures.push(`${filename}: ${error.message}`);
  }
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const filename = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await walk(filename);
    else if (/\.(?:mjs|js)$/.test(entry.name)) inspect(await readFile(filename, "utf8"), filename);
    else if (entry.name === "index.html") {
      const markup = await readFile(filename, "utf8");
      for (const script of markup.matchAll(/<script\b[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)) {
        inspect(script[1], `${filename} (module script)`);
      }
    }
  }
}

await walk(".");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log(`Precheck passed: ${checked} source modules parsed; no optional chaining.`);
