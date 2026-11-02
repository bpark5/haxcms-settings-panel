import * as fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const filenames = { javascript: "custom.js", css: "custom.css" };
const revisionId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

function fail(message, status = 500) {
  return Object.assign(new Error(message), { status });
}

/** Local prototype storage, not a replacement for HAX's Git history. */
export function createMockCodeStore({
  root = new URL("../mock-site/", import.meta.url), io = fs,
} = {}) {
  const directory = root instanceof URL ? fileURLToPath(root) : root;
  const pending = new Map();

  function paths(language) {
    if (!Object.hasOwn(filenames, language)) throw fail("Unknown language.", 400);
    return {
      active: path.join(directory, filenames[language]),
      history: path.join(directory, "history", `${language}.json`),
    };
  }

  // Prevent overlapping requests in this dev-server process from losing saves.
  function serialized(language, operation) {
    paths(language);
    const task = (pending.get(language) || Promise.resolve()).catch(() => {}).then(operation);
    pending.set(language, task);
    return task.finally(() => {
      if (pending.get(language) === task) pending.delete(language);
    });
  }

  async function readState(language) {
    const files = paths(language);
    const code = await io.readFile(files.active, "utf8");
    let revisions = [];
    try {
      const journal = JSON.parse(await io.readFile(files.history, "utf8"));
      if (journal.version !== 1 || journal.language !== language || !Array.isArray(journal.revisions) ||
        journal.revisions.some(item => !item || !revisionId.test(item.id) ||
          typeof item.code !== "string" || !Number.isFinite(Date.parse(item.createdAt)))) {
        throw fail("History is unreadable; nothing was overwritten.");
      }
      revisions = journal.revisions;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    return { files, code, revisions };
  }

  async function atomicWrite(filename, contents) {
    await io.mkdir(path.dirname(filename), { recursive: true });
    const temporary = `${filename}.${randomUUID()}.tmp`;
    try {
      await io.writeFile(temporary, contents, { encoding: "utf8", flag: "wx" });
      await io.rename(temporary, filename);
    } finally {
      await io.rm(temporary, { force: true }).catch(() => {});
    }
  }

  function record(code, kind) {
    return { id: randomUUID(), createdAt: new Date().toISOString(), kind, code };
  }

  function metadata(item, code, latestId) {
    const { code: source, ...data } = item;
    return { ...data, isCurrent: item.id === latestId && source === code };
  }

  function journal(language, revisions) {
    return JSON.stringify({ version: 1, language, revisions }, null, 2) + "\n";
  }

  return {
    save(language, code) {
      return serialized(language, async () => {
        const state = await readState(language);
        const revisions = [...state.revisions];
        // Preserve the actual file even if it predates history or was edited
        // outside the panel. Do this before replacing the active file.
        if (!revisions.length || revisions.at(-1).code !== state.code) {
          revisions.push(record(state.code, "preserved"));
          await atomicWrite(state.files.history, journal(language, revisions));
        }
        const revision = record(code, "save");
        await atomicWrite(state.files.active, code);
        try {
          await atomicWrite(state.files.history, journal(language, [...revisions, revision]));
        } catch (error) {
          try {
            await atomicWrite(state.files.active, state.code);
          } catch {
            throw fail("History write failed and the active file could not be restored. The previous version remains in history.");
          }
          throw error;
        }
        return metadata(revision, code, revision.id);
      });
    },
    list(language) {
      return serialized(language, async () => {
        const { code, revisions } = await readState(language);
        return [...revisions].reverse().map(item => metadata(item, code, revisions.at(-1)?.id));
      });
    },
    get(language, id) {
      if (!revisionId.test(id)) return Promise.reject(fail("Invalid revision ID.", 400));
      return serialized(language, async () => {
        const { code, revisions } = await readState(language);
        const item = revisions.find(revision => revision.id === id);
        if (!item) throw fail("Revision not found.", 404);
        return { ...metadata(item, code, revisions.at(-1)?.id), code: item.code };
      });
    },
  };
}
