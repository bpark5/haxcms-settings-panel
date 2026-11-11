import { mockAuthorization } from './mock-reauthentication.mjs';
import { validateJavaScriptSyntax } from './validate-javascript-syntax.js';
import { validateCSS } from './validate-css.js';

const customCodeFiles = { javascript: true, css: true };
const maxSaveBytes = 1024 * 1024;

// Local proof of concept: store text only; do not execute or build it.
export function createMockSaveCode(
  saveCode,
  authorization = mockAuthorization,
) {
  return async function mockSaveCode(context, next) {
    // Vercel handles /api itself; use a separate path for dev-server middleware.
    if (context.path !== '/mock-save-code') {
      return next();
    }

    context.type = 'application/json';
    context.set('Cache-Control', 'no-store');
    if (context.method !== 'POST') {
      context.set('Allow', 'POST');
      context.status = 405;
      context.body = { success: false, message: 'Use POST to save code.' };
      return;
    }

    if (!context.is('application/json')) {
      context.status = 415;
      context.body = { success: false, message: 'Send an application/json body.' };
      return;
    }

    try {
      authorization.verify(context.headers);
    } catch (error) {
      context.status = error.status;
      context.body = { success: false, code: error.code, message: error.message };
      return;
    }

    let payload;
    try {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of context.req) {
        const buffer = Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > maxSaveBytes) {
          context.status = 413;
          context.body = { success: false, message: 'Request exceeds the 1 MiB limit.' };
          return;
        }
        chunks.push(buffer);
      }
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      context.status = 400;
      context.body = { success: false, message: 'Invalid JSON request body.' };
      return;
    }

    if (
      !payload ||
      typeof payload.language !== 'string' ||
      !Object.hasOwn(customCodeFiles, payload.language) ||
      typeof payload.code !== 'string'
    ) {
      context.status = 400;
      context.body = {
        success: false,
        message: 'Expected language "javascript" or "css" and a code string.',
      };
      return;
    }

    let validation;
    try {
      validation = payload.language === 'css'
        ? validateCSS(payload.code)
        : validateJavaScriptSyntax(payload.code);
    } catch {
      context.status = 500;
      context.body = { success: false, message: 'Unable to validate customization. Nothing was saved.' };
      return;
    }

    if (!validation.valid) {
      context.status = 422;
      context.body = {
        success: false,
        language: payload.language,
        message: validation.message,
        line: validation.line,
        column: validation.column,
      };
      return;
    }

    try {
      // Validation precedes all writes. The destination is fixed on the server.
      const beforeWrite = () => authorization.verify(context.headers);
      beforeWrite();
      const revision = await saveCode(payload.language, payload.code, beforeWrite);
      context.status = 200;
      context.body = { success: true, revision, message: `${payload.language} customization saved.` };
    } catch (error) {
      context.status = error.status || 500;
      context.body = { success: false, code: error.status ? error.code : undefined,
        message: error.status ? error.message : 'Unable to save customization.' };
    }
  };
}

/** These routes simulate an existing login; never mount them in real HAX. */
export function createMockAuthentication(authorization = mockAuthorization) {
  return async (context, next) => {
    if (!['/mock-session', '/mock-authentication'].includes(context.path)) return next();
    context.type = 'application/json';
    context.set('Cache-Control', 'no-store');
    const method = context.path === '/mock-session' ? 'GET' : 'POST';
    if (context.method !== method) {
      context.set('Allow', method);
      context.status = 405;
      context.body = { success: false, message: `Use ${method}.` };
      return;
    }
    if (method === 'GET') {
      context.status = 200;
      context.body = authorization.session();
      return;
    }
    if (!context.is('application/json')) {
      context.status = 415;
      context.body = { success: false, message: 'Send an application/json body.' };
      return;
    }
    try {
      authorization.identity(context.headers);
      const chunks = [];
      let bytes = 0;
      for await (const chunk of context.req) {
        const buffer = Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > 4096) {
          context.status = 413;
          context.body = { success: false, message: 'Authentication request is too large.' };
          return;
        }
        chunks.push(buffer);
      }
      let payload;
      try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { context.status = 400; context.body = { success: false, message: 'Invalid JSON request body.' }; return; }
      context.body = await authorization.issueForRequest(context.headers, payload);
      context.status = 200;
    } catch (error) {
      context.status = error.status || 500;
      if (error.retryAfterSeconds) context.set('Retry-After', String(error.retryAfterSeconds));
      context.body = { success: false, code: error.status ? error.code : undefined,
        retryAfterSeconds: error.retryAfterSeconds,
        message: error.status ? error.message : 'Unable to authenticate.' };
    }
  };
}

export function createMockCodeHistory(store) {
  return async (context, next) => {
    if (context.path !== '/mock-code-history' && !context.path.startsWith('/mock-code-history/')) return next();
    context.type = 'application/json';
    context.set('Cache-Control', 'no-store');
    if (context.method !== 'GET') {
      context.set('Allow', 'GET');
      context.status = 405;
      context.body = { success: false, message: 'Use GET to read history.' };
      return;
    }
    const language = context.query.language;
    if (typeof language !== 'string' || !Object.hasOwn(customCodeFiles, language)) {
      context.status = 400;
      context.body = { success: false, message: 'Choose javascript or css.' };
      return;
    }
    try {
      const id = context.path.slice('/mock-code-history'.length + 1);
      context.body = id
        ? { success: true, language, revision: await store.get(language, id) }
        : { success: true, language, revisions: await store.list(language) };
      context.status = 200;
    } catch (error) {
      context.status = error.status || 500;
      context.body = { success: false, message: error.status ? error.message : 'Unable to read local history.' };
    }
  };
}

/** Source is fetched as text by the sandbox preview, never executed here. */
export function createMockCodeSource(store) {
  return async (context, next) => {
    if (context.path !== '/mock-code-source') return next();
    context.set('Cache-Control', 'no-store');
    if (context.method !== 'GET') {
      context.set('Allow', 'GET');
      context.status = 405;
      context.body = { success: false, message: 'Use GET to read saved code.' };
      return;
    }
    const language = context.query.language;
    if (typeof language !== 'string' || !Object.hasOwn(customCodeFiles, language)) {
      context.status = 400;
      context.body = { success: false, message: 'Choose javascript or css.' };
      return;
    }
    try {
      context.body = await store.read(language);
      context.type = 'text/plain';
      context.status = 200;
    } catch {
      context.status = 503;
      context.body = { success: false, message: 'Unable to read saved code.' };
    }
  };
}

