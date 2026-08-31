/**
 * @fileoverview Runtime configuration utilities
 *
 * Handles CLI argument parsing and runtime environment configuration, including:
 * - CLI argument parsing (--key=value format)
 * - CLI args overriding environment variables (proxy, platform, port, etc.)
 * - Proxy address parsing and caching
 *
 * @module runtime
 * @requires url - URL parsing (for proxy address resolution)
 */

const { URL } = require('url');

/**
 * Cached raw proxy address string (avoids repeated parsing)
 * @type {string | undefined}
 */
let cachedProxyRaw;

/**
 * Cached proxy config object (AxiosProxyConfig format)
 * @type {import('axios').AxiosProxyConfig | null}
 */
let cachedProxy;

/**
 * Parse command-line arguments
 *
 * Only parses `--key=value` format; other formats are ignored.
 * Parsing rules:
 * - Must start with `--`
 * - Must contain `=` separator
 * - Both key and value must be non-empty
 *
 * @param {string[]} [args] - Argument array; defaults to process.argv.slice(2)
 * @returns {Record<string, string>} Parsed key-value object
 *
 * @example
 * // CLI: node app.js --proxy=http://127.0.0.1:8080 --platform=lite
 * parseCliArgs() // => { proxy: 'http://127.0.0.1:8080', platform: 'lite' }
 */
function parseCliArgs(args) {
  const source = Array.isArray(args) ? args : process.argv.slice(2);
  return source.reduce((acc, rawArg) => {
    if (typeof rawArg !== 'string') {
      return acc;
    }
    const arg = rawArg.trim();
    // Must start with --
    if (!arg.startsWith('--')) {
      return acc;
    }
    const eqIndex = arg.indexOf('=');
    // = must be after -- and not at the end (ensures key and value exist)
    if (eqIndex <= 2 || eqIndex === arg.length - 1) {
      return acc;
    }
    const key = arg.slice(2, eqIndex).trim();
    const value = arg.slice(eqIndex + 1).trim();
    if (!key || !value) return acc;
    acc[key] = value;
    return acc;
  }, {});
}

/**
 * Apply CLI arguments to override environment variables
 *
 * Supported CLI args:
 * - --proxy: Set KUGOU_API_PROXY (proxy address)
 * - --platform: Set platform (platform type, e.g. "lite")
 * - --guid: Set KUGOU_API_GUID (device GUID)
 * - --dev: Set KUGOU_API_DEV (dev device identifier)
 * - --mac: Set KUGOU_API_MAC (device MAC address)
 * - --port: Set PORT (server port; must be a positive integer)
 *
 * @param {string[]} [args] - Argument array; defaults to process.argv.slice(2)
 */
function applyCliOverrides(args) {
  const parsed = parseCliArgs(args);

  if (parsed.proxy) {
    process.env.KUGOU_API_PROXY = parsed.proxy;
  }

  if (parsed.platform) {
    process.env.platform = parsed.platform;
  }

  if (parsed.guid) {
    process.env.KUGOU_API_GUID = parsed.guid;
  }

  if (parsed.dev) {
    process.env.KUGOU_API_DEV = parsed.dev;
  }

  if (parsed.mac) {
    process.env.KUGOU_API_MAC = parsed.mac;
  }

  if (parsed.port) {
    const port = Number(parsed.port);
    if (!Number.isNaN(port) && port > 0) {
      process.env.PORT = String(port);
    } else {
      console.warn(`[cli] Invalid port value "${parsed.port}", fallback to default.`);
    }
  }
}

/**
 * Resolve proxy configuration
 *
 * Reads proxy address from KUGOU_API_PROXY and parses it into an Axios-compatible
 * proxy config object. Supports HTTP/HTTPS and authenticated proxies (user:password@host:port).
 *
 * Result is cached to avoid re-parsing on every request.
 * Returns cached result when the env var value is unchanged.
 *
 * @returns {import('axios').AxiosProxyConfig | null} Proxy config object, or null if no proxy
 *
 * @example
 * // KUGOU_API_PROXY=http://user:pass@127.0.0.1:8080
 * resolveProxy()
 * // => { protocol: 'http', host: '127.0.0.1', port: 8080, auth: { username: 'user', password: 'pass' } }
 */
function resolveProxy() {
  const rawProxyEnv = typeof process.env.KUGOU_API_PROXY === 'string' ? process.env.KUGOU_API_PROXY.trim() : undefined;
  const rawProxy = rawProxyEnv && rawProxyEnv.length > 0 ? rawProxyEnv : undefined;

  // No proxy configured; clear cache
  if (!rawProxy) {
    cachedProxyRaw = undefined;
    cachedProxy = null;
    return null;
  }

  // Cache hit
  if (cachedProxyRaw === rawProxy) {
    return cachedProxy;
  }

  // Cache miss; re-parse
  cachedProxyRaw = rawProxy;
  try {
    const parsed = new URL(rawProxy);

    // Only HTTP/HTTPS proxy protocols supported
    if (!/^https?:$/.test(parsed.protocol)) {
      console.warn(`[proxy] Unsupported proxy protocol: ${parsed.protocol}`);
      cachedProxy = null;
      return null;
    }

    // Build Axios proxy config
    const proxyConfig = {
      protocol: parsed.protocol.replace(':', ''), // Strip trailing colon
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80, // Default port
    };

    // Proxy address includes auth credentials
    if (parsed.username || parsed.password) {
      proxyConfig.auth = {
        username: parsed.username,
        password: parsed.password,
      };
    }

    cachedProxy = proxyConfig;
    console.info(`[proxy] Using proxy ${parsed.protocol}//${parsed.host}`);
  } catch (error) {
    console.warn(`[proxy] Failed to parse proxy address "${rawProxy}": ${error.message}`);
    cachedProxy = null;
  }

  return cachedProxy;
}

module.exports = { applyCliOverrides, parseCliArgs, resolveProxy };
