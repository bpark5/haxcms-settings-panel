import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

export const NONCE_TTL_MS = 60_000;
export const PASSWORD_MAX_ATTEMPTS = 3;
export const PASSWORD_COOLDOWN_MS = 60_000;
const passwordAttemptWindowMs = 15 * 60_000;
const purpose = "haxcms-local-reauthentication-v1";
const issuer = "haxcms-settings-panel-local";

export function authorizationError(code, message, status = 403) {
  return Object.assign(new Error(message), { code, status });
}

/** Local demo identity only. Real HAX session APIs are deliberately not used. */
export function createMockAuthorization({
  now = Date.now,
  jwtSecret = randomBytes(32),
  serverSecret = randomBytes(32),
  user = "demo",
  password = "demo123",
} = {}) {
  if (Buffer.byteLength(jwtSecret) < 32 || Buffer.byteLength(serverSecret) < 32) {
    throw new Error("Mock authorization secrets must each contain at least 32 bytes.");
  }
  const passwordSalt = randomBytes(16);
  const passwordHash = scryptSync(password, passwordSalt, 32);
  // One local demo account: bounded, process-wide state survives new JWTs.
  // Real integration should use HAX's shared login-rate-limit infrastructure.
  let failedAttempts = 0;
  let firstFailure = 0;
  let blockedUntil = 0;
  let issuanceWindow = 0;
  let issuanceRequests = 0;
  function throttled(until, message) {
    const retryAfterSeconds = Math.max(1, Math.ceil((until - now()) / 1000));
    return Object.assign(authorizationError("AUTH_RATE_LIMITED",
      `${message} Try again in ${retryAfterSeconds} seconds. Your draft is preserved.`, 429), { retryAfterSeconds });
  }
  const mac = value => createHmac("sha256", serverSecret).update(value).digest();
  const userToken = mac(`user-token:${user}`).toString("base64url");
  const equal = (left, right) => {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  const key = token => mac(`${purpose}:${token}`);
  function identity(headers = {}) {
    let claims;
    try {
      if (!headers || typeof headers !== "object" || Array.isArray(headers)) throw new Error();
      const authorization = headers.authorization;
      if (typeof authorization !== "string" || authorization.length > 8192 || !/^Bearer \S+$/i.test(authorization)) throw new Error();
      claims = jwt.verify(authorization.slice(7), jwtSecret, {
        algorithms: ["HS256"], issuer, audience: issuer,
        clockTimestamp: Math.floor(now() / 1000),
      });
      if (claims.user !== user || claims.id !== userToken || !Number.isSafeInteger(claims.iat) ||
        !Number.isSafeInteger(claims.exp) || claims.iat * 1000 > now()) throw new Error();
    } catch {
      throw authorizationError("SESSION_INVALID", "The demo session is invalid or expired. Reload the page.", 401);
    }
    const token = headers["x-haxcms-user-token"];
    if (typeof token !== "string" || token.length !== userToken.length || !equal(token, userToken)) {
      throw authorizationError("USER_TOKEN_INVALID", "The user token does not match the demo account.");
    }
    return { user: claims.user, token };
  }
  function issue(headers, suppliedPassword) {
    const account = identity(headers);
    const time = now();
    if (blockedUntil > time) throw throttled(blockedUntil, "Too many incorrect passwords.");
    if (blockedUntil || (failedAttempts && time - firstFailure >= passwordAttemptWindowMs)) {
      failedAttempts = 0;
      blockedUntil = 0;
    }
    // Bound expensive password hashing even for callers who know demo123.
    if (!issuanceRequests || time - issuanceWindow >= 60_000) {
      issuanceWindow = time;
      issuanceRequests = 0;
    }
    if (issuanceRequests >= 20) throw throttled(issuanceWindow + 60_000, "Too many authentication requests.");
    issuanceRequests++;
    if (typeof suppliedPassword !== "string" || !suppliedPassword || Buffer.byteLength(suppliedPassword) > 1024) {
      throw authorizationError("AUTH_INPUT_INVALID", "Send a password string between 1 and 1024 bytes.", 400);
    }
    if (!timingSafeEqual(scryptSync(suppliedPassword, passwordSalt, 32), passwordHash)) {
      if (!failedAttempts) firstFailure = time;
      failedAttempts++;
      if (failedAttempts >= PASSWORD_MAX_ATTEMPTS) {
        blockedUntil = time + PASSWORD_COOLDOWN_MS;
        throw throttled(blockedUntil, "Too many incorrect passwords.");
      }
      throw authorizationError("PASSWORD_INVALID", "Incorrect password. Please try again.", 401);
    }
    failedAttempts = 0;
    const issuedAt = now();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key(account.token), iv);
    cipher.setAAD(Buffer.from(purpose));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify({
      version: 1, purpose, user: account.user, issued_at: issuedAt,
    }), "utf8"), cipher.final()]);
    const nonce = ["v1", iv.toString("base64url"), ciphertext.toString("base64url"),
      cipher.getAuthTag().toString("base64url")].join(".");
    return { success: true, nonce, expiresAt: issuedAt + NONCE_TTL_MS, expiresInSeconds: 60 };
  }
  function verify(headers) {
    const account = identity(headers);
    try {
      const nonce = headers["x-haxcms-reauthentication"];
      if (typeof nonce !== "string" || nonce.length > 2048) throw new Error();
      const parts = nonce.split(".");
      if (parts.length !== 4 || parts[0] !== "v1" ||
        parts.slice(1).some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error();
      const decoded = parts.slice(1).map(part => Buffer.from(part, "base64url"));
      if (decoded.some((part, index) => part.toString("base64url") !== parts[index + 1])) throw new Error();
      const [iv, ciphertext, tag] = decoded;
      if (iv.length !== 12 || tag.length !== 16) throw new Error();
      const decipher = createDecipheriv("aes-256-gcm", key(account.token), iv);
      decipher.setAAD(Buffer.from(purpose));
      decipher.setAuthTag(tag);
      const claims = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
      const age = now() - claims.issued_at;
      if (claims.version !== 1 || claims.purpose !== purpose || claims.user !== account.user ||
        !Number.isSafeInteger(claims.issued_at) || age < 0 || age >= NONCE_TTL_MS) throw new Error();
    } catch {
      throw authorizationError("REAUTH_REQUIRED", "Please enter your password again. Your draft is preserved.");
    }
  }
  return {
    session() {
      const iat = Math.floor(now() / 1000);
      return { success: true, jwt: jwt.sign({ user, id: userToken, iat, exp: iat + 15 * 60 },
        jwtSecret, { algorithm: "HS256", issuer, audience: issuer }), userToken };
    },
    issueForRequest(headers, payload) {
      identity(headers);
      if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
        Object.keys(payload).length !== 1 || !Object.hasOwn(payload, "password")) {
        throw authorizationError("AUTH_INPUT_INVALID", "Send a JSON object containing only password.", 400);
      }
      return issue(headers, payload.password);
    },
    identity, issue, verify,
  };
}

// One shared instance per local server process. Restarting invalidates sessions
// and nonces. Explicit environment keys allow adapters to share credentials.
export const mockAuthorization = createMockAuthorization({
  jwtSecret: process.env.HAX_MOCK_JWT_SECRET || randomBytes(32),
  serverSecret: process.env.HAX_MOCK_REAUTH_SECRET || randomBytes(32),
});
