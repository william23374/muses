/**
 * @fileoverview KuGouMusicApi programmatic API entry module
 *
 * This module is the programmatic invocation entry (distinct from index.js HTTP service entry),
 * responsible for:
 * 1. Scanning and dynamically loading all API module files under `module/`
 * 2. Creating unified wrapper functions for each module with automatic Cookie format conversion
 * 3. Merging all API functions with server utilities and request tools for unified export
 *
 * Export structure is a flat object; module filename (without .js suffix) is the API function name.
 * Example: `module/search.js` → `api.search(params)`
 *
 * @module app
 * @requires node:fs
 * @requires path
 * @requires ./util - Utility functions (cookieToJson, etc.)
 * @requires ./server - Server management (startService, getModulesDefinitions)
 * @requires ./util/request - Low-level HTTP request utility (createRequest)
 *
 * @example
 * // Use as a library (programmatic calls, no HTTP server)
 * const api = require('./app');
 *
 * // Phone login
 * const loginRes = await api.login_cellphone({
 *   mobile: '13800138000',
 *   code: '123456'
 * });
 *
 * // Search music (with auth Cookie)
 * const searchRes = await api.search({
 *   keywords: 'hello',
 *   cookie: `token=${loginRes.body.token};userid=${loginRes.body.userid}`
 * });
 */

const fs = require('node:fs');
const path = require('path');
const { cookieToJson } = require('./util');

/**
 * Dynamically registered API function collection
 *
 * Keys are module filenames (without .js suffix); values are corresponding wrapper functions.
 * Example: `{ search: [Function], login_cellphone: [Function], ... }`
 *
 * @type {Record<string, (data?: Record<string, any>) => Promise<any>>}
 */
let obj = {};

/**
 * ============================================================
 * Dynamically scan and load all API modules under module/
 * ============================================================
 *
 * Scan flow:
 * 1. Use `fs.readdirSync` to synchronously read all files in `module/`
 * 2. Reverse sort file list (consistent with route registration order in server.js)
 * 3. Filter files ending with `.js`
 * 4. For each module file:
 *    a. Load module via `require` and get its handler function
 *    b. Extract API function name from filename (strip `.js`, e.g. `search.js` → `search`)
 *    c. Create wrapper function and register on `obj`
 *
 * Each wrapper function:
 * - Automatically converts caller-provided cookie string to JSON object
 * - Merges call params with default cookie
 * - Calls original module handler, injecting request factory (lazy-loaded createRequest)
 */
fs.readdirSync(path.join(__dirname, 'module'))
  .reverse()
  .forEach((file) => {
    // Skip non-.js files (e.g. .json, .map, directories)
    if (!file.endsWith('.js')) return;

    // Load module and get exported handler
    let fileModule = require(path.join(__dirname, 'module', file));

    // API function name: part before first `.` in filename
    // e.g. `search.js` → `search`, `login_cellphone.js` → `login_cellphone`
    let fn = file.split('.').shift() || '';

    /**
     * Create wrapper function for current module
     *
     * @param {Record<string, any>} [data={}] - Request params from caller
     * @returns {Promise<any>} Module handler return value
     */
    obj[fn] = (data = {}) => {
      // Auto-convert cookie string to JSON object
      // Caller may pass cookie string (e.g. "token=xxx;userid=xxx") or object format
      if (typeof data.cookie === 'string') data.cookie = cookieToJson(data.cookie);

      // Call original module handler with:
      // 1. Merged params (cookie always object, default empty object)
      // 2. Request factory: lazy-load createRequest to avoid circular deps
      return fileModule({ ...data, cookie: data.cookie ? data.cookie : {} }, (...args) => {
        // Lazy load: require createRequest only when a request is actually needed
        // Avoids circular dependency during module load phase
        const { createRequest } = require('./util/request');
        return createRequest(...args);
      });
    };
  });

/**
 * ============================================================
 * Unified export
 * ============================================================
 *
 * Exports a flat object with three parts:
 *
 * 1. `...require('./server')` — Server management utilities
 *    - `startService()`: Start HTTP service
 *    - `getModulesDefinitions()`: Dynamically scan module definitions
 *
 * 2. `...require('./util/request')` — Low-level request utilities
 *    - `createRequest()`: Create HTTP request
 *
 * 3. `...obj` — All API module functions
 *    - Each module/*.js file maps to a same-named function
 *    - e.g. `search`, `login_cellphone`, `song_url`
 *
 * @type {Record<string, any> & import("./server")}
 */
module.exports = { ...require('./server'), ...require('./util/request'), ...obj };
