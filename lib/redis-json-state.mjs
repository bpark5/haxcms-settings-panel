// Atomic compare-and-set is shared by every Vercel instance. Expiry is checked
// against Redis's clock in the same operation that commits the document.
export const compareAndSetScript = `
local current = redis.call('GET', KEYS[1])
if (current or '') ~= ARGV[1] then return 0 end
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
if tonumber(ARGV[4]) > 0 and now >= tonumber(ARGV[4]) then return -2 end
if tonumber(ARGV[5]) > 0 and now >= tonumber(ARGV[5]) then return -1 end
redis.call('SET', KEYS[1], ARGV[2])
if tonumber(ARGV[3]) > 0 then redis.call('PEXPIRE', KEYS[1], ARGV[3]) end
return 1
`;

export function storageError(message = "Shared demo storage is unavailable. Nothing was saved.", status = 503, code = "STORAGE_UNAVAILABLE") {
  return Object.assign(new Error(message), { status, code });
}

/** Upstash/Vercel KV REST protocol; credentials never leave the server. */
export function createRedisState({ url, token, prefix = "haxcms-settings-panel:production", fetchImpl = fetch }) {
  if (!url || !token || !/^https:\/\//.test(url) || !/^[\w:.-]{1,160}$/.test(prefix)) {
    throw storageError("Configure the demo's Redis connection and storage prefix.", 503, "DEMO_NOT_CONFIGURED");
  }
  async function command(args) {
    try {
      const response = await fetchImpl(url, { method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(args), signal: AbortSignal.timeout(5000), cache: "no-store" });
      if (!response.ok) throw new Error();
      const body = await response.json();
      if (!body || body.error || !Object.hasOwn(body, "result")) throw new Error();
      return body.result;
    } catch {
      // Do not leak provider responses or retry a write with an unknown outcome.
      throw storageError();
    }
  }
  return {
    async get(key) {
      const raw = await command(["GET", `${prefix}:${key}`]);
      if (raw !== null && typeof raw !== "string") throw storageError();
      return raw;
    },
    async compareAndSet(key, expected, replacement, ttl, guard = {}) {
      return command(["EVAL", compareAndSetScript, "1", `${prefix}:${key}`,
        expected || "", replacement, String(ttl), String(guard.sessionExpiresAt || 0), String(guard.nonceExpiresAt || 0)]);
    },
  };
}

/** Optimistic updates prevent lost revisions and bypasses via parallel requests. */
export function createJsonDocuments(state) {
  async function read(key, initial) {
    const raw = await state.get(key);
    let value;
    try { value = raw === null ? await initial() : JSON.parse(raw); }
    catch { throw storageError("Shared demo state is unreadable; nothing was overwritten."); }
    return { raw, value };
  }
  return {
    async get(key, initial) { return (await read(key, initial)).value; },
    async update(key, initial, transform, { ttl = 0, beforeWrite = () => ({}) } = {}) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const { raw, value } = await read(key, initial);
        const result = transform(value);
        const replacement = JSON.stringify(value);
        if (Buffer.byteLength(replacement) > 4 * 1024 * 1024) {
          throw storageError("The demo history storage limit was reached. Nothing was saved.", 413, "STORAGE_LIMIT");
        }
        const guard = await beforeWrite();
        if (raw === replacement) return result;
        const committed = await state.compareAndSet(key, raw, replacement, ttl, guard || {});
        if (committed === 1) return result;
        if (committed === -1) throw storageError("Please enter your password again. Your draft is preserved.", 403, "REAUTH_REQUIRED");
        if (committed === -2) throw storageError("Your demo session expired. Your draft is preserved.", 401, "SESSION_INVALID");
        if (committed !== 0) throw storageError();
      }
      throw storageError("The demo is busy. Please try saving again; your draft is preserved.", 409, "SAVE_CONFLICT");
    },
  };
}
