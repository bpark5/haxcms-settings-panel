import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { once } from "node:events";
import { startDevServer } from "@web/dev-server";
import config, { createMockAuthentication, createMockSaveCode } from "../web-dev-server.config.mjs";
import { createMockAuthorization } from "../lib/mock-reauthentication.mjs";
import { createMockCodeStore } from "../lib/mock-code-store.mjs";

function waitForReload(socket, timeout = 1000) {
  return new Promise(resolve => {
    const onMessage = event => {
      if (String(event.data).includes("location.reload()")) finish(true);
    };
    const finish = result => {
      clearTimeout(timer);
      socket.removeEventListener("message", onMessage);
      resolve(result);
    };
    const timer = setTimeout(() => finish(false), timeout);
    socket.addEventListener("message", onMessage);
  });
}

async function watched(server, filename) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const entries = server.fileWatcher.getWatched()[path.dirname(filename)] || [];
    if (entries.includes(path.basename(filename))) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(`Source file was not watched: ${filename}`);
}

test("watch mode retains nonce authorization across saves while source edits still reload", async t => {
  for (const [name, chokidarOptions, expectReload] of [
    ["original watcher reproduces the unwanted reload", {}, true],
    ["saved-output exclusions prevent reload", config.chokidarOptions, false],
  ]) {
    await t.test(name, async t => {
      const root = await mkdtemp(path.join(tmpdir(), "hax-watch-"));
      t.after(() => rm(root, { recursive: true, force: true }));
      const site = path.join(root, "mock-site");
      await mkdir(site);
      await writeFile(path.join(site, "custom.js"), "// original");
      await writeFile(path.join(site, "custom.css"), "/* original */");
      const source = path.join(root, "source.js");
      await writeFile(source, "// source");
      const auth = createMockAuthorization();
      const store = createMockCodeStore({ root: site });
      const server = await startDevServer({
        readCliArgs: false, readFileConfig: false, autoExitProcess: false, logStartMessage: false,
        config: {
          rootDir: root, port: 0, hostname: "127.0.0.1", watch: true, chokidarOptions,
          clearTerminalOnReload: false,
          middleware: [createMockAuthentication(auth), createMockSaveCode(
            (language, code, check) => store.save(language, code, check), auth,
          )],
        },
      });
      t.after(() => server.stop());
      const base = `http://127.0.0.1:${server.server.address().port}`;
      // Real HTTP reads cause the dev server to watch the saved files.
      for (const filename of ["/mock-site/custom.js", "/mock-site/custom.css", "/source.js"]) {
        const response = await fetch(base + filename);
        assert.equal(response.status, 200);
        await response.text();
      }
      await watched(server, source);
      if (expectReload) {
        await watched(server, path.join(site, "custom.js"));
        await watched(server, path.join(site, "custom.css"));
      }
      const socket = new WebSocket(base.replace("http:", "ws:") + "/wds");
      t.after(() => socket.close());
      await once(socket, "open");
      const session = await (await fetch(base + "/mock-session")).json();
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${session.jwt}`,
        "X-HAXCMS-User-Token": session.userToken };
      const authentication = await fetch(base + "/mock-authentication", {
        method: "POST", headers, body: JSON.stringify({ password: "demo123" }),
      });
      assert.equal(authentication.status, 200);
      const { nonce } = await authentication.json();
      headers["X-HAXCMS-Reauthentication"] = nonce;
      const reload = waitForReload(socket);
      for (const [language, code] of [["javascript", "// first save"], ["css", "body { color: purple; }"]]) {
        const response = await fetch(base + "/mock-save-code", {
          method: "POST", headers, body: JSON.stringify({ language, code }),
        });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).success, true);
      }
      assert.equal(await reload, expectReload);
      if (!expectReload) {
        // The fix must preserve normal live reload for actual source changes.
        const sourceReload = waitForReload(socket, 5000);
        await writeFile(source, "// edited source");
        assert.equal(await sourceReload, true);
      }
    });
  }
});
