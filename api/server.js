/**
 * @fileoverview KuGouMusic API server core module
 *
 * HTTP service built on the Express framework, responsible for:
 * - Dynamically scanning and loading all API modules under the `module/` directory, auto-registering routes
 * - Handling CORS cross-origin requests
 * - Parsing request cookies and injecting platform identifier metadata
 * - Providing a 2-minute response cache
 * - Unified error handling and response delivery
 *
 * @module server
 * @requires node:fs
 * @requires node:path
 * @requires express
 * @requires safe-decode-uri-component
 * @requires dotenv
 * @requires ./util/util
 * @requires ./util/crypto
 * @requires ./util/request
 * @requires ./util/apicache
 */

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const decode = require('safe-decode-uri-component');
const { cookieToJson, randomString, getGuid, calculateMid, generateWebGLHash, isUUIDv4 } = require('./util/util');
const { cryptoMd5 } = require('./util/crypto');
const { createRequest } = require('./util/request');
const dotenv = require('dotenv');
const cache = require('./util/apicache').middleware;

/**
 * @typedef {Object} ModuleDefinition
 * @description API module definition structure, produced by {@link getModulesDefinitions}
 * @property {string}  [identifier] - Module identifier, derived from the filename (without the .js extension)
 * @property {string}  route        - Express route path for this module
 * @property {any}     module       - Module export (module object when loaded via require, otherwise the file path)
 */

/**
 * @typedef {Object} ExpressExtension
 * @description Extension of the Express instance with an attached HTTP Server reference
 * @property {import('http').Server} [server] - Underlying HTTP server instance
 */

/**
 * Global unique device identifier (GUID)
 * MD5 hash of a randomly generated GUID string, used as the default device identifier
 * @type {string}
 * @constant
 */
const guid = cryptoMd5(getGuid());

/**
 * Randomly generated 10-character uppercase string, used as the default development device identifier (DEV ID)
 * @type {string}
 * @constant
 */
const serverDev = randomString(10).toUpperCase();

/**
 * .env environment variable configuration file path
 * Loaded from the project root directory; if the file exists, dotenv reads environment variables from it
 * @type {string}
 */
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  // Silently load environment variables from the .env file into process.env; quiet suppresses load logs
  dotenv.config({ path: envPath, quiet: true });
}

/**
 * Dynamically scan a directory and collect definition info for all API modules
 *
 * Scan workflow:
 * 1. Read all files under `modulesPath`
 * 2. Filter files ending in `.js` that do not start with `_` (files prefixed with `_` are treated as internal modules and skipped)
 * 3. Reverse the file list (consistent with module load order in app.js)
 * 4. Generate route paths from filenames: by default replace `_` with `/`; use `specificRoute` custom mappings when provided
 * 5. If `doRequire` is true, load modules via require; otherwise return file paths only
 *
 * @async
 * @param {string} modulesPath - Absolute path to the module directory (e.g. `path.join(__dirname, 'module')`)
 * @param {Record<string, string>} specificRoute - Custom filename-to-route mapping table
 *   - key is the filename (e.g. `"album_new.js"`), value is the custom route (e.g. `"/album/create"`)
 *   - Files not in the mapping table use the default route generation rules
 * @param {boolean} [doRequire=true] - Whether to load modules via require
 *   - `true`: require the module file directly and return the exported object
 *   - `false`: return only the absolute path string of the module file
 * @returns {Promise<ModuleDefinition[]>} Array of module definitions, each containing identifier, route, and module
 *
 * @example
 * // Scan the module directory and load all modules
 * const defs = await getModulesDefinitions(path.join(__dirname, 'module'), {});
 *
 * @example
 * // Customize routes for specific modules
 * const defs = await getModulesDefinitions(
 *   path.join(__dirname, 'module'),
 *   { "album_new.js": "/album/create" }
 * );
 */
async function getModulesDefinitions(modulesPath, specificRoute, doRequire = true) {
  const files = await fs.promises.readdir(modulesPath);

  /**
   * Parse a route path from a filename
   * Prefer custom mappings in specificRoute; otherwise generate using default rules:
   *   - Remove the .js extension
   *   - Replace underscores _ with slashes /
   *   - Prefix with /
   * Example: `user_detail.js` → `/user/detail`
   * @param {string} fileName - Filename
   * @returns {string} Route path
   */
  const parseRoute = (fileName) =>
    specificRoute && fileName in specificRoute ? specificRoute[fileName] : `/${fileName.replace(/\.(js)$/i, '').replace(/_/g, '/')}`;

  return (
    files
      // Reverse order to match module load order from readdirSync().reverse() in app.js
      .reverse()
      // Keep only .js files that do not start with _ (skip internal/private modules)
      .filter((fileName) => fileName.endsWith('.js') && !fileName.startsWith('_'))
      .map((fileName) => {
        // Module identifier: base filename without the .js extension
        const identifier = fileName.split('.').shift();
        // Generate route path
        const route = parseRoute(fileName);
        // Full absolute path to the module file
        const modulePath = path.resolve(modulesPath, fileName);
        // Load the module or return the path only, depending on doRequire
        const module = doRequire ? require(modulePath) : modulePath;
        return { identifier, route, module };
      })
  );
}

/**
 * Build and configure an Express application instance
 *
 * This function performs the following:
 * 1. Create an Express app
 * 2. Configure CORS middleware (handle OPTIONS preflight requests)
 * 3. Configure custom cookie parsing middleware
 * 4. Inject platform identifier cookies (PLATFORM, MID, GUID, DEV, MAC)
 * 5. Configure JSON / URL-encoded request body parsing
 * 6. Mount static file services (public and docs directories)
 * 7. Configure a 2-minute API response cache
 * 8. Iterate all module definitions and dynamically register Express route handlers
 *    - Each route handler: merge request params, call the module function, handle cookies, return the response
 *
 * @async
 * @param {ModuleDefinition[]} [moduleDefs] - Optional array of module definitions
 *   - If omitted, automatically calls {@link getModulesDefinitions} to scan and load from the `module/` directory
 * @returns {Promise<import('express').Express>} Fully configured Express application instance
 */
async function consturctServer(moduleDefs) {
  const app = express();

  // Read allowed CORS origins from environment variables; fall back to the request Origin header or '*'
  const { CORS_ALLOW_ORIGIN } = process.env;

  // Enable reverse proxy trust so req.ip reflects the client real IP (e.g. behind an Nginx reverse proxy)
  app.set('trust proxy', true);

  /**
   * ============================================================
   * CORS cross-origin resource sharing middleware
   * ============================================================
   *
   * Set CORS response headers for non-root paths that are not static files:
   * - Access-Control-Allow-Credentials: allow credentials (cookies)
   * - Access-Control-Allow-Origin: allowed origin domain
   * - Access-Control-Allow-Headers: allowed request headers
   * - Access-Control-Allow-Methods: allowed HTTP methods
   * - Content-Type: JSON with UTF-8 encoding
   *
   * Return 204 No Content directly for OPTIONS preflight requests
   */
  app.use((req, res, next) => {
    if (req.path !== '/' && !req.path.includes('.')) {
      // Browsers reject ACAO=* when credentials are enabled; echo the request Origin instead
      const requestOrigin = req.headers.origin;
      let allowOrigin = CORS_ALLOW_ORIGIN || requestOrigin || '*';
      if (allowOrigin === '*' && requestOrigin) {
        allowOrigin = requestOrigin;
      }
      res.set({
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'Authorization,X-Requested-With,Content-Type,Cache-Control',
        'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS',
        'Content-Type': 'application/json; charset=utf-8',
      });
    }
    // OPTIONS preflight requests need no further handling; return 204 directly
    req.method === 'OPTIONS' ? res.status(204).end() : next();
  });

  /**
   * ============================================================
   * Cookie parsing middleware
   * ============================================================
   *
   * Manually parse the Cookie header string into a key-value object and attach it to req.cookies.
   *
   * Parsing rules:
   * - Split multiple cookie pairs on `; ` or trailing whitespace
   * - Split each pair on the first `=` into key and value
   * - Decode both key and value via safe-decode-uri-component
   * - Skip invalid pairs (no `=` or `=` at the end)
   */
  app.use((req, _, next) => {
    req.cookies = {};
    (req.headers.cookie || '').split(/;\s+|(?<!\s)\s+$/g).forEach((pair) => {
      const crack = pair.indexOf('=');
      // Skip invalid cookies: no = sign, or = at the end (no value)
      if (crack < 1 || crack === pair.length - 1) {
        return;
      }
      req.cookies[decode(pair.slice(0, crack)).trim()] = decode(pair.slice(crack + 1)).trim();
    });
    next();
  });

  /**
   * ============================================================
   * Platform identifier cookie injection middleware
   * ============================================================
   *
   * Automatically inject the following platform identifiers into the request cookie object (only when the client has not provided them):
   * - KUGOU_API_PLATFORM: platform type (standard / lite concept edition), from the platform environment variable
   * - KUGOU_API_MID: device MID, generated from GUID via the calculateMid algorithm
   * - KUGOU_API_GUID: global unique device identifier; prefer KUGOU_API_GUID env var, otherwise the default generated at startup
   * - KUGOU_API_DEV: development device identifier; prefer KUGOU_API_DEV env var
   * - KUGOU_API_MAC: device MAC address, default '02:00:00:00:00:00'
   *
   * Also write these values back to the client via Set-Cookie for debugging and automatic inclusion in subsequent requests.
   * Cookie security attributes (SameSite=None; Secure) depend on the request protocol (HTTP/HTTPS).
   */
  app.use((req, res, next) => {
    const cookies = req.cookies || {};
    const isHttps = req.protocol === 'https';
    // Under HTTPS, set SameSite=None; Secure to support cross-site cookie delivery
    const cookieSuffix = isHttps ? '; PATH=/; SameSite=None; Secure' : '; PATH=/';

    /**
     * Ensure the specified cookie key exists; write it automatically if missing
     * @param {string} key - Cookie key name
     * @param {string} value - Default cookie value
     */
    const ensureCookie = (key, value) => {
      // Skip if the client already provided this cookie; do not overwrite
      if (Object.prototype.hasOwnProperty.call(cookies, key)) return;
      cookies[key] = String(value);
      res.append('Set-Cookie', `${key}=${cookies[key]}${cookieSuffix}`);
    };

    // Get env guid
    const env_guid = isUUIDv4(process.env.KUGOU_API_GUID) ? cryptoMd5(process.env.KUGOU_API_GUID) : process.env.KUGOU_API_GUID;

    // Compute device MID (derived identifier based on GUID)
    const mid = calculateMid(env_guid ?? guid);

    // Inject platform identifier cookies in order
    ensureCookie('KUGOU_API_PLATFORM', process.env.platform);
    ensureCookie('KUGOU_API_MID', mid);
    ensureCookie('KUGOU_API_GUID', env_guid ?? guid);
    ensureCookie('KUGOU_API_DEV', (process.env.KUGOU_API_DEV ?? serverDev).toUpperCase());
    ensureCookie('KUGOU_API_MAC', (process.env.KUGOU_API_MAC ?? '02:00:00:00:00:00').toUpperCase());
    ensureCookie('KUGOU_API_WEBGL', process.env.KUGOU_API_WEBGL ?? generateWebGLHash());

    // Write injected cookies back to req for downstream middleware and route handlers
    req.cookies = cookies;

    next();
  });

  /**
   * ============================================================
   * Request body parsing middleware
   * ============================================================
   *
   * - express.json(): parse request bodies with Content-Type application/json
   * - express.urlencoded(): parse request bodies with Content-Type application/x-www-form-urlencoded
   *   - extended: false uses the querystring library (no nested objects)
   */
  app.use(express.json({ limit: '16mb' }));
  app.use(express.urlencoded({ extended: false, limit: '5mb' }));
  app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));

  /**
   * ============================================================
   * Static file service
   * ============================================================
   *
   * Serve the `public/` directory under the project root as static assets,
   * for frontend pages, icons, and other static files
   */
  app.use(express.static(path.join(__dirname, 'public')));

  /**
   * API documentation static service
   *
   * Mount the `docs/` directory at `/docs`;
   * visit /docs to view project API documentation
   */
  app.use('/docs', express.static(path.join(__dirname, 'docs')));

  /**
   * ============================================================
   * API response cache middleware
   * ============================================================
   *
   * Use apicache to cache successful requests (statusCode === 200) for 2 minutes.
   * The same URL will only trigger one request to the KuGou server within 2 minutes.
   *
   * Bypass cache by appending a different timestamp query parameter,
   * e.g. /personal/fm?timestamp=1691256061923
   */
  app.use(cache('2 minutes', (_, res) => res.statusCode === 200));

  /**
   * ============================================================
   * Dynamic route registration
   * ============================================================
   *
   * If no module definition array was passed, automatically scan the module/ directory and load all modules.
   * Iterate each module definition and register an Express route handler.
   */
  const moduleDefinitions = moduleDefs || (await getModulesDefinitions(path.join(__dirname, 'module'), {}));

  for (const moduleDef of moduleDefinitions) {
    /**
     * Register a route handler for each API module
     *
     * Request handling flow:
     * 1. Parse and merge cookies (supports cookie strings in query and body)
     * 2. Merge all request parameters: query params, body params, cookies
     * 3. Extract auth info from the Authorization header and merge into cookie
     * 4. Call the module handler with merged params and a request factory function
     * 5. Handle cookies returned by the module (write back via Set-Cookie)
     * 6. Return the module response data
     * 7. On error, log and return an error response
     */
    app.use(moduleDef.route, async (req, res) => {
      // Step 1: Parse cookie strings in query and body into JSON objects
      [req.query, req.body].forEach((item) => {
        if (typeof item.cookie === 'string') {
          item.cookie = cookieToJson(decode(item.cookie));
        }
      });

      // Step 2: Separate cookie param from other query params
      const { cookie, ...params } = req.query;

      // Step 3: Build unified query object
      //   - cookie: merge request cookies and cookie param from query
      //   - params: remaining query params excluding cookie
      //   - body: request body (POST data)
      const body = Buffer.isBuffer(req.body) ? { data: req.body } : req.body;
      const query = Object.assign({}, { cookie: Object.assign({}, req.cookies, cookie) }, params, body);

      // Step 4: If Authorization header is present, parse it as cookies and merge
      // Allows clients to pass auth via Authorization header, e.g. token=xxx;userid=xxx
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        query.cookie = {
          ...query.cookie,
          ...cookieToJson(authHeader),
        };
      }

      try {
        /**
         * Step 5: Call the module handler
         *
         * Pass two arguments:
         * - query: merged request parameters
         * - request factory: accepts request config, injects client IP, then calls createRequest
         *
         * @see createRequest - underlying HTTP request function
         */
        const moduleResponse = await moduleDef.module(query, (config) => {
          // Get client real IP (strip IPv6-mapped IPv4 prefix)
          let ip = req.ip;
          if (ip.substring(0, 7) === '::ffff:') {
            ip = ip.substring(7);
          }
          config.ip = ip;
          return createRequest(config);
        });

        // Success log
        console.log('[OK]', decode(req.originalUrl));

        // Step 6: Handle cookies returned by the module
        // Write module-set cookies back to the client via Set-Cookie response headers
        const cookies = moduleResponse.cookie;
        if (!query.noCookie) {
          if (Array.isArray(cookies) && cookies.length > 0) {
            if (req.protocol === 'https') {
              // Under HTTPS, set SameSite=None; Secure to fix cookie delivery in CORS environments
              res.append(
                'Set-Cookie',
                cookies.map((cookie) => {
                  return `${cookie}; PATH=/; SameSite=None; Secure`;
                })
              );
            } else {
              // Under HTTP, set PATH only
              res.append(
                'Set-Cookie',
                cookies.map((cookie) => {
                  return `${cookie}; PATH=/`;
                })
              );
            }
          }
        }

        // Step 7: Return module response (headers, status, body)
        res.header(moduleResponse.headers).status(moduleResponse.status).send(moduleResponse.body);
      } catch (e) {
        // Error handling: module internal errors are thrown as objects with status and body
        const moduleResponse = e;

        // Error log
        console.log('[ERR]', decode(req.originalUrl), {
          status: moduleResponse.status,
          body: moduleResponse.body,
        });

        // If the error object has no body, return a generic 404 response
        if (!moduleResponse.body) {
          res.status(404).send({
            code: 404,
            data: null,
            msg: 'Not Found',
          });
          return;
        }

        // Return the module error response body
        res.header(moduleResponse.headers).status(moduleResponse.status).send(moduleResponse.body);
      }
    });
  }

  return app;
}

/**
 * Start the KuGouMusic API service
 *
 * Full startup flow:
 * 1. Read port (default 3000) and host (default empty string, listen on all available addresses) from environment variables
 * 2. Call {@link consturctServer} to build and configure the Express app
 * 3. Start HTTP listening on the specified port and host
 * 4. Log successful startup
 * 5. Return the extended Express instance (with underlying server reference attached)
 *
 * @async
 * @returns {Promise<import('express').Express & ExpressExtension>} Extended Express app instance,
 *   including a `service` property pointing to the underlying HTTP Server
 *
 * @example
 * // Basic usage
 * const app = await startService();
 * // Service is running; access the underlying HTTP Server via app.service
 *
 * @example
 * // Customize port and host via environment variables
 * // PORT=4000 HOST=127.0.0.1 node index.js
 */
async function startService() {
  // Read port configuration, default 3000
  const port = Number(process.env.PORT || '3000');
  // Read host configuration, default empty (listen on all network interfaces)
  const host = process.env.HOST || '';

  // Build Express app (includes all middleware and routes)
  const app = await consturctServer();

  /** @type {import('express').Express & ExpressExtension} */
  const appExt = app;

  // Start HTTP server and listen on the specified port and host
  appExt.service = app.listen(port, host, () => {
    console.log(`server running @ http://${host || 'localhost'}:${port}`);
  });

  return appExt;
}

module.exports = { startService, getModulesDefinitions };
