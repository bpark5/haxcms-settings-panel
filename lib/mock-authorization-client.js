/** Browser-only, in-memory demo credentials. Never pass these into the preview. */
export class MockAuthorizationClient {
  constructor({ fetchImpl = (...args) => globalThis.fetch(...args), now = Date.now } = {}) {
    this.fetch = fetchImpl;
    this.now = now;
    this.session = null;
    this.sessionRequest = null;
    this.generation = 0;
    this.retryUntil = 0;
    this.clearNonce();
  }

  clearNonce() {
    this.nonce = "";
    this.expiresAt = 0;
  }

  dispose() {
    this.generation++;
    this.session = null;
    this.sessionRequest = null;
    this.retryUntil = 0;
    this.clearNonce();
  }

  hasAuthorization() {
    if (this.now() >= this.expiresAt) this.clearNonce();
    return !!this.nonce && this.now() < this.expiresAt;
  }

  async read(response) {
    if (!(response.headers.get("content-type") || "").includes("application/json")) {
      throw new Error(`The authorization endpoint returned HTTP ${response.status} instead of JSON. Check the server's API routes.`);
    }
    const result = await response.json();
    if (!result || typeof result !== "object") throw new Error("Invalid local endpoint response.");
    if (!response.ok || !result.success) {
      if (result.code === "AUTH_RATE_LIMITED" && Number.isInteger(result.retryAfterSeconds) &&
        result.retryAfterSeconds > 0 && result.retryAfterSeconds <= 60) {
        this.retryUntil = this.now() + result.retryAfterSeconds * 1000;
      }
      if (["SESSION_INVALID", "USER_TOKEN_INVALID", "REAUTH_REQUIRED"].includes(result.code)) this.clearNonce();
      throw Object.assign(new Error(result.message || "Unable to complete the request."), { code: result.code });
    }
    return result;
  }

  async headers() {
    if (!this.session) {
      if (!this.sessionRequest) {
        const generation = this.generation;
        this.sessionRequest = this.fetch("/mock-session", { cache: "no-store" })
          .then(response => this.read(response)).then(result => {
            if (generation !== this.generation) throw new Error("The demo session was closed.");
            if (typeof result.jwt !== "string" || !result.jwt ||
              typeof result.userToken !== "string" || !result.userToken) throw new Error("Invalid demo session response.");
            this.session = { jwt: result.jwt, userToken: result.userToken };
          }).finally(() => { if (generation === this.generation) this.sessionRequest = null; });
      }
      await this.sessionRequest;
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.session.jwt}`,
      "X-HAXCMS-User-Token": this.session.userToken,
      ...(this.nonce ? { "X-HAXCMS-Reauthentication": this.nonce } : {}),
    };
  }

  async authenticate(password, signal) {
    const generation = this.generation;
    this.clearNonce();
    const headers = await this.headers();
    if (signal.aborted) return;
    const result = await this.read(await this.fetch("/mock-authentication", {
      method: "POST", headers, body: JSON.stringify({ password }), signal,
    }));
    if (signal.aborted || generation !== this.generation) return;
    if (typeof result.nonce !== "string" || !result.nonce || result.expiresInSeconds !== 60 ||
      !Number.isSafeInteger(result.expiresAt) || result.expiresAt <= this.now()) {
      throw new Error("Invalid or expired authorization response. Please try again.");
    }
    this.nonce = result.nonce;
    this.retryUntil = 0;
    this.expiresAt = Math.min(result.expiresAt, this.now() + 60_000);
    return result;
  }
}

/** Retry only an explicit authorization rejection, never a network/write failure. */
export async function saveMockCode({ authorization, language, code, reauthenticate }) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await authorization.read(await authorization.fetch("/mock-save-code", {
        method: "POST", headers: await authorization.headers(),
        body: JSON.stringify({ language, code }),
      }));
    } catch (error) {
      if (error.code !== "REAUTH_REQUIRED" || attempt !== 0) throw error;
      if (!await reauthenticate()) return null;
    }
  }
}
