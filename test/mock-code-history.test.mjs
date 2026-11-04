import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createMockCodeStore } from "../lib/mock-code-store.mjs";
import { createMockCodeHistory, createMockSaveCode } from "../web-dev-server.config.mjs";

async function setup(t, io = fs) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hax-code-history-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, "custom.js"), "// original\n");
  await fs.writeFile(path.join(root, "custom.css"), "");
  return { root, store: createMockCodeStore({ root, io }) };
}

test("preserves the original before first save and separates language histories", async t => {
  const { root, store } = await setup(t);
  assert.deepEqual(await store.list("javascript"), []);
  const saved = await store.save("javascript", "console.log('new');");
  const entries = await store.list("javascript");
  assert.equal(entries.length, 2);
  assert.equal(entries[0].id, saved.id);
  assert.equal(entries[0].isCurrent, true);
  assert.equal(entries[1].kind, "preserved");
  assert.equal("code" in entries[0], false);
  assert.equal((await store.get("javascript", entries[1].id)).code, "// original\n");
  assert.equal(await fs.readFile(path.join(root, "custom.js"), "utf8"), "console.log('new');");
  assert.deepEqual(await store.list("css"), []);
  assert.equal(await fs.readFile(path.join(root, "custom.css"), "utf8"), "");
  // History survives a server restart.
  assert.equal((await createMockCodeStore({ root }).list("javascript")).length, 2);
});

test("inspecting history never writes, and restoring adds a revision without deleting later saves", async t => {
  const { root, store } = await setup(t);
  await store.save("css", "body { color: purple; }");
  const old = (await store.list("css")).at(-1);
  const revision = await store.get("css", old.id);
  assert.equal(revision.code, "");
  assert.equal(await fs.readFile(path.join(root, "custom.css"), "utf8"), "body { color: purple; }");
  const restored = await store.save("css", revision.code);
  const entries = await store.list("css");
  assert.equal(entries.length, 3);
  assert.notEqual(restored.id, old.id);
  assert.equal((await store.get("css", entries[1].id)).code, "body { color: purple; }");
  assert.equal(await fs.readFile(path.join(root, "custom.css"), "utf8"), "");
});

test("serializes overlapping saves and preserves external file edits", async t => {
  const { root, store } = await setup(t);
  await Promise.all(Array.from({ length: 6 }, (_, i) => store.save("javascript", `// ${i}\n`)));
  assert.equal((await store.list("javascript")).length, 7);
  assert.equal(await fs.readFile(path.join(root, "custom.js"), "utf8"), "// 5\n");
  await fs.writeFile(path.join(root, "custom.js"), "// manual edit\n");
  await store.save("javascript", "// final\n");
  const entries = await store.list("javascript");
  assert.equal((await store.get("javascript", entries[1].id)).code, "// manual edit\n");
  assert.equal(entries[1].kind, "preserved");
});

test("failed history persistence restores the active file and does not publish a failed save", async t => {
  const io = { ...fs, async writeFile(filename, contents, options) {
    if (filename.includes(`${path.sep}history${path.sep}`) &&
      JSON.parse(contents).revisions.at(-1).kind === "save") throw new Error("disk failure");
    return fs.writeFile(filename, contents, options);
  } };
  const { root, store } = await setup(t, io);
  await assert.rejects(store.save("javascript", "// failed"), /disk failure/);
  assert.equal(await fs.readFile(path.join(root, "custom.js"), "utf8"), "// original\n");
  const entries = await store.list("javascript");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].kind, "preserved");
  assert.equal(entries[0].isCurrent, true);
  assert.equal((await fs.readdir(path.join(root, "history"))).some(name => name.endsWith(".tmp")), false);
});

test("invalid requests do not create history; corrupt history is not overwritten", async t => {
  const { root, store } = await setup(t);
  const save = createMockSaveCode((language, code) => store.save(language, code));
  const context = {
    path: "/mock-save-code", method: "POST", set() {}, is: () => true,
    req: [Buffer.from(JSON.stringify({ language: "javascript", code: "const broken = ;" }))],
  };
  await save(context);
  assert.equal(context.status, 422);
  assert.deepEqual(await store.list("javascript"), []);
  await fs.mkdir(path.join(root, "history"));
  await fs.writeFile(path.join(root, "history/javascript.json"), "broken json");
  await assert.rejects(store.save("javascript", "// new"));
  assert.equal(await fs.readFile(path.join(root, "custom.js"), "utf8"), "// original\n");
});

test("history endpoints enforce language, revision IDs, methods, and metadata-only lists", async t => {
  const { store } = await setup(t);
  const saved = await store.save("javascript", "// new");
  const history = createMockCodeHistory(store);
  const context = (suffix = "", overrides = {}) => ({
    path: `/mock-code-history${suffix}`, method: "GET", query: { language: "javascript" }, set() {}, ...overrides,
  });
  const list = context();
  await history(list);
  assert.equal(list.status, 200);
  assert.equal(list.body.revisions.length, 2);
  assert.equal("code" in list.body.revisions[0], false);
  const detail = context(`/${saved.id}`);
  await history(detail);
  assert.equal(detail.body.revision.code, "// new");
  for (const [ctx, status] of [
    [context("", { method: "POST" }), 405],
    [context("", { query: { language: "__proto__" } }), 400],
    [context("/../../custom.js"), 400],
    [context(`/${saved.id}`, { query: { language: "css" } }), 404],
  ]) {
    await history(ctx);
    assert.equal(ctx.status, status);
  }
});
