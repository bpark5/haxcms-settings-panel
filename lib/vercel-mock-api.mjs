import { readFile } from "node:fs/promises";
import { createMockAuthorization } from "./mock-reauthentication.mjs";
import { createRedisState, createJsonDocuments, storageError } from "./redis-json-state.mjs";
import { createHostedCodeStore, createHostedAuthorization } from "./hosted-mock-store.mjs";
import { createMockAuthentication, createMockSaveCode, createMockCodeHistory, createMockCodeSource } from "./mock-api-middleware.mjs";

export function createHostedServices({ env = process.env, fetchImpl = fetch, initialCode } = {}) {
  if (!env.HAX_MOCK_JWT_SECRET || !env.HAX_MOCK_REAUTH_SECRET ||
    Buffer.byteLength(env.HAX_MOCK_JWT_SECRET) < 32 || Buffer.byteLength(env.HAX_MOCK_REAUTH_SECRET) < 32) {
    throw storageError("Configure HAX_MOCK_JWT_SECRET and HAX_MOCK_REAUTH_SECRET in Vercel before using this demo.", 503, "DEMO_NOT_CONFIGURED");
  }
  const state = createRedisState({
    url: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN,
    prefix: env.HAX_MOCK_STORAGE_PREFIX || `haxcms-settings-panel:${env.VERCEL_ENV || "development"}`,
    fetchImpl,
  });
  const documents = createJsonDocuments(state);
  const authorization = createHostedAuthorization(createMockAuthorization({
    jwtSecret: env.HAX_MOCK_JWT_SECRET, serverSecret: env.HAX_MOCK_REAUTH_SECRET,
  }), documents);
  // Explicit URLs allow Vercel's file tracer to include the seed customizations.
  const seeds = {
    javascript: new URL("../mock-site/custom.js", import.meta.url),
    css: new URL("../mock-site/custom.css", import.meta.url),
  };
  const store = createHostedCodeStore({ documents,
    initialCode: initialCode || (language => readFile(seeds[language], "utf8")),
  });
  return { authorization, store };
}

let services;
function getServices() {
  if (!services) services = createHostedServices();
  return services;
}

/** Adapt the same bounded middleware used locally to a Vercel Node function. */
export function createVercelMockHandler(provideServices = getServices) {
  return async (request, response, routeOverride) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const url = new URL(request.url, "http://localhost");
      const query = {};
      for (const key of new Set(url.searchParams.keys())) {
        const values = url.searchParams.getAll(key);
        query[key] = values.length === 1 ? values[0] : values;
      }
      // Vercel exposes rewrite destination parameters on request.query.
      Object.assign(query, request.query || {});
      const route = routeOverride || query.route;
      if (typeof route !== "string" || (!['session', 'authentication', 'save-code', 'code-history', 'code-source'].includes(route) &&
        !/^code-history\/[a-f0-9-]{36}$/.test(route))) {
        response.statusCode = 404;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(JSON.stringify({ success: false, message: "Unknown demo endpoint." }));
        return;
      }
      const { authorization, store } = provideServices();
      const context = {
        path: `/mock-${route}`, method: request.method, query, headers: request.headers,
        req: request, status: 404, type: "application/json",
        set: (name, value) => response.setHeader(name, value),
        is: type => (request.headers["content-type"] || "").split(";")[0].trim().toLowerCase() === type,
      };
      const middleware = [createMockAuthentication(authorization),
        createMockSaveCode((language, code, check) => store.save(language, code, check), authorization),
        createMockCodeHistory(store), createMockCodeSource(store)];
      const dispatch = index => index < middleware.length
        ? middleware[index](context, () => dispatch(index + 1)) : undefined;
      await dispatch(0);
      response.statusCode = context.status;
      response.setHeader("Content-Type", `${context.type}; charset=utf-8`);
      response.end(context.type === "text/plain" ? context.body : JSON.stringify(context.body));
    } catch (error) {
      response.statusCode = error.status || 503;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ success: false, code: error.code || "STORAGE_UNAVAILABLE",
        message: error.status ? error.message : "The hosted demo is temporarily unavailable. Your draft is preserved." }));
    }
  };
}
