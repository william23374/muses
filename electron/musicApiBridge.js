// IPC bridge: route renderer music-API requests to api/ modules in the main process.
// Removes the need for a local HTTP web service (127.0.0.1:6521) in packaged builds,
// avoiding port conflicts with other services. Uses api/util/createRequest directly.
import { ipcMain } from 'electron';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import log from 'electron-log';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Resolve to the api/ root. In dev it is the repo api/; in a packaged app it lives
// inside the asar (see build.files in package.json). Fall back to the sibling path.
function resolveApiRoot() {
    const candidates = [
        path.join(__dirname, '../api'),
        path.join(process.resourcesPath, 'api'),
    ];
    for (const candidate of candidates) {
        try {
            const pkg = require(path.join(candidate, 'package.json'));
            if (pkg && pkg.name === 'kugoumusicapi') {
                return candidate;
            }
        } catch { /* keep probing */ }
    }
    // Last resort: default to the dev layout relative to this file.
    return path.join(__dirname, '../api');
}

// Per-process state: preloaded modules and the default device identifiers.
let apiRoot = '';
let moduleCache = null;   // { moduleName -> module function }
let utilRef = null;       // api/util exports (createRequest, calculateMid, etc.)
let defaultGuid = '';
let defaultMid = '';

/**
 * Resolve the api/module/<name> identifier from an HTTP route path.
 * Mirrors server.js getModulesDefinitions: file `foo_bar.js` -> route `/foo/bar`,
 * so inverting a route path restores the module filename (without `.js`).
 * @param {string} url - Request path, e.g. `/song/climax` or `/register/dev`
 * @returns {string} Module identifier, e.g. `song_climax`
 */
function resolveModuleFromUrl(url) {
    const path = String(url || '').split('?')[0] || '';
    const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
    return clean ? clean.replace(/\//g, '_') : '';
}

/**
 * Compute-ish equivalent of the Kugou device MID from a GUID (re-export via api/util).
 */
function getMid(guid) {
    if (!utilRef?.calculateMid) return '';
    return utilRef.calculateMid(guid);
}

/**
 * Load api/ util and module/* into the main process (lazy, once).
 */
function loadApi() {
    if (utilRef && moduleCache) return;

    // The platform must be set BEFORE requiring api/util: util/index.js reads
    // `process.env.platform === 'lite'` at module load to pick appid/clientver.
    process.env.platform = process.env.platform || 'lite';

    apiRoot = resolveApiRoot();
    const utilPath = path.join(apiRoot, 'util', 'index.js');
    utilRef = require(utilPath);
    log.info('[musicApi] api root:', apiRoot);

    // Base64 URL-safe-ish GUID -> hex is unnecessary; we just need a stable GUID.
    defaultGuid = crypto.randomUUID();
    defaultMid = getMid(defaultGuid) || '';
}

/**
 * Inject default platform/device cookies equivalent to server.js middleware:
 * KUGOU_API_PLATFORM / MID / GUID / DEV / MAC / WEBGL (only when absent).
 */
function injectDefaultCookies(cookie = {}) {
    const out = { ...cookie };
    const isLite = process.env.platform === 'lite';
    // Fill defaults when a key is absent OR explicitly empty. The renderer's
    // buildAuthCookie() sends an object whose keys exist but are `undefined` for a
    // fresh guest, so a bare hasOwnProperty check would skip injection and drop
    // mid/guid, making Kugou reject the request (e.g. top/playlist -> HTTP 500).
    const ENSURE = (key, value) => { if (out[key] == null || out[key] === '') out[key] = String(value); };

    ENSURE('KUGOU_API_PLATFORM', process.env.platform || 'lite');
    ENSURE('KUGOU_API_MID', defaultMid || getMid(out.KUGOU_API_GUID));
    ENSURE('KUGOU_API_GUID', defaultGuid);
    ENSURE('KUGOU_API_DEV', (process.env.KUGOU_API_DEV || 'MUS0000000').toUpperCase());
    ENSURE('KUGOU_API_MAC', (process.env.KUGOU_API_MAC || '02:00:00:00:00:00').toUpperCase());
    ENSURE('KUGOU_API_WEBGL', process.env.KUGOU_API_WEBGL || '0');
    return out;
}

/**
 * Parse an Authorization header (token=...;userid=...;dfid=...;KUGOU_API_*) into a cookie object.
 * Mirrors server.js: header cookies override the request cookie on key conflict.
 * @param {string} authHeader
 * @returns {Object}
 */
function parseAuthHeaderToCookie(authHeader) {
    const out = {};
    if (!authHeader) return out;
    String(authHeader).split(/;\s*/).forEach((pair) => {
        const idx = pair.indexOf('=');
        if (idx < 1) return;
        out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    });
    return out;
}

/**
 * Handle a renderer request in HTTP-like form.
 * @param {Object} payload { method, url, params, data, cookie, headers }
 *   - url: relative path with optional query string, e.g. `/song/climax?hash=abc`
 *   - params: query params object
 *   - data: POST body object
 *   - cookie: device/auth cookies sent by the renderer (dfid/token/KUGOU_API_*)
 *   - headers: { authorization }
 *   Backward compatible: if payload has `module`, it is used directly.
 * @returns {Promise<Object>} { status, body, headers, cookie }
 */
async function handleRequest(payload) {
    loadApi();

    const {
        module: explicitModule = '',
        method = 'GET',
        url = '',
        params = {},
        data,
        cookie = {},
        headers = {},
    } = payload || {};

    // Resolve module name from explicit module or the route URL.
    const moduleName = explicitModule || resolveModuleFromUrl(url);
    if (!moduleName) {
        return { status: 400, body: { status: 0, msg: 'empty module/url' }, headers: {}, cookie: [] };
    }

    // Built-in params from the query string embedded in url (e.g. ?hash=abc).
    const queryStr = String(url || '').split('?')[1] || '';
    let urlParams = {};
    if (queryStr) {
        const sp = new URLSearchParams(queryStr);
        sp.forEach((v, k) => { urlParams[k] = v; });
    }

    // Merge cookie like server.js: default injection, then renderer cookies,
    // then Authorization header (which wins on conflicts).
    let mergedCookie = injectDefaultCookies(cookie);
    const authHeader = headers?.authorization || headers?.Authorization;
    if (authHeader) mergedCookie = { ...mergedCookie, ...parseAuthHeaderToCookie(authHeader) };

    // Build the unified query object: cookie + url params + explicit params + body data.
    const mergedParams = { ...urlParams, ...params, ...(data && typeof data === 'object' ? data : {}) };
    return invokeModule({ module: moduleName, params: mergedParams, cookie: mergedCookie });
}

/**
 * Dynamically load an api/module/<name>.js and call it.
 * @param {Object} payload { module, params, cookie }
 * @returns {Object} { status, body, headers, cookie } (from createRequest / module)
 */
async function invokeModule(payload) {
    loadApi();

    const { module: moduleName = '', params = {}, cookie = {} } = payload || {};
    const modulePath = path.join(apiRoot, 'module', moduleName);

    if (!moduleCache) moduleCache = {};
    let mod = moduleCache[moduleName];
    if (!mod) {
        try {
            mod = require(modulePath);
            moduleCache[moduleName] = mod;
        } catch (error) {
            return { status: 502, body: { status: 0, msg: `module not found: ${moduleName}` }, headers: {}, cookie: [] };
        }
    }

    // query mirrors server.js: merged cookie + remaining params + body passthrough.
    const query = {
        cookie: injectDefaultCookies(cookie),
        ...params,
    };

    try {
        const result = await mod(query, (config) => utilRef.createRequest(config));
        // createRequest resolves/rejects with { status, body, headers, cookie }.
        return {
            status: result.status || 200,
            body: result.body,
            headers: result.headers || {},
            cookie: Array.isArray(result.cookie) ? result.cookie : [],
        };
    } catch (error) {
        // createRequest rejects with the same shape on failure.
        if (error && typeof error === 'object' && 'status' in error) {
            return { status: error.status, body: error.body, headers: error.headers || {}, cookie: Array.isArray(error.cookie) ? error.cookie : [] };
        }
        return { status: 502, body: { status: 0, msg: String(error?.message || error) }, headers: {}, cookie: [] };
    }
}

/**
 * Register the IPC handler for renderer music API requests.
 * Channel name: 'music-api'
 * Payload: { module: string, params: object, cookie: object }
 */
export function registerMusicApiBridge() {
    ipcMain.removeHandler('music-api');
    ipcMain.handle('music-api', async (_event, payload) => {
        try {
            // Accept both HTTP-style ({method,url,params,data,cookie}) and direct ({module,params,cookie}).
            return await handleRequest(payload);
        } catch (error) {
            log.error('[musicApi] invoke error:', error);
            return { status: 502, body: { status: 0, msg: String(error?.message || error) }, headers: {}, cookie: [] };
        }
    });
    log.info('[musicApi] IPC bridge registered (channel: music-api)');
}

export function unregisterMusicApiBridge() {
    try {
        ipcMain.removeHandler('music-api');
    } catch { /* noop */ }
}

// Exported for headless integration tests (equivalent to the IPC handler body).
export { handleRequest };

export default { registerMusicApiBridge, unregisterMusicApiBridge, handleRequest };
