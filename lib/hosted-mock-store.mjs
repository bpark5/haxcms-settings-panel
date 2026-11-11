import { randomUUID } from "node:crypto";
import { storageError } from "./redis-json-state.mjs";

const languages = ["javascript", "css"];
const revisionId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

export function createHostedCodeStore({ documents, initialCode, now = Date.now }) {
  function checkLanguage(language) {
    if (!languages.includes(language)) throw storageError("Unknown language.", 400, "INVALID_LANGUAGE");
  }
  const initial = language => async () => ({ version: 1, language, code: await initialCode(language), revisions: [] });
  function validate(state, language) {
    if (!state || state.version !== 1 || state.language !== language || typeof state.code !== "string" ||
      !Array.isArray(state.revisions) || state.revisions.some(item => !item || !revisionId.test(item.id) ||
        typeof item.code !== "string" || !Number.isFinite(Date.parse(item.createdAt)))) {
      throw storageError("Demo history is unreadable; nothing was overwritten.");
    }
    return state;
  }
  async function read(language) {
    checkLanguage(language);
    return validate(await documents.get(`code:${language}`, initial(language)), language);
  }
  function metadata(item, state) {
    const { code, ...data } = item;
    return { ...data, isCurrent: item.id === state.revisions.at(-1).id && code === state.code };
  }
  const record = (code, kind) => ({ id: randomUUID(), code, kind, createdAt: new Date(now()).toISOString() });
  return {
    async read(language) { return (await read(language)).code; },
    async save(language, code, beforeWrite) {
      checkLanguage(language);
      return documents.update(`code:${language}`, initial(language), state => {
        validate(state, language);
        if (!state.revisions.length || state.revisions.at(-1).code !== state.code) {
          state.revisions.push(record(state.code, "preserved"));
        }
        const revision = record(code, "save");
        state.code = code;
        state.revisions.push(revision);
        return metadata(revision, state);
      }, { beforeWrite });
    },
    async list(language) {
      const state = await read(language);
      return [...state.revisions].reverse().map(item => metadata(item, state));
    },
    async get(language, id) {
      checkLanguage(language);
      if (!revisionId.test(id)) throw storageError("Invalid revision ID.", 400, "INVALID_REVISION");
      const state = await read(language);
      const revision = state.revisions.find(item => item.id === id);
      if (!revision) throw storageError("Revision not found.", 404, "REVISION_NOT_FOUND");
      return { ...metadata(revision, state), code: revision.code };
    },
  };
}

/** Persist counters across cold starts and resolve concurrent attempts atomically. */
export function createHostedAuthorization(authorization, documents) {
  return {
    session: authorization.session,
    identity: authorization.identity,
    verify: authorization.verify,
    async issueForRequest(headers, payload) {
      const account = authorization.identity(headers);
      const output = await documents.update(`attempts:${account.user}`, async () => ({
        failedAttempts: 0, firstFailure: 0, blockedUntil: 0, issuanceWindow: 0, issuanceRequests: 0,
      }), attempts => {
        if (!attempts || !["failedAttempts", "firstFailure", "blockedUntil", "issuanceWindow", "issuanceRequests"]
          .every(key => Number.isSafeInteger(attempts[key]) && attempts[key] >= 0)) {
          throw storageError("Demo authorization state is unreadable.");
        }
        try { return { result: authorization.issueForRequest(headers, payload, attempts) }; }
        catch (error) {
          if (!["PASSWORD_INVALID", "AUTH_RATE_LIMITED", "AUTH_INPUT_INVALID"].includes(error.code)) throw error;
          return { error };
        }
      }, { ttl: 15 * 60_000 });
      if (output.error) throw output.error;
      return output.result;
    },
  };
}
