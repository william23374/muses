/**
 * @fileoverview KuGou Music API HTTP request wrapper
 *
 * Low-level send function for all API requests:
 * 1. Build request params (default device IDs, timestamp, etc.)
 * 2. Generate signature by encryptType (signature/sign)
 * 3. Configure headers (User-Agent, device info, IP, etc.)
 * 4. Send HTTP request (via axios)
 * 5. Handle response (Cookie, SSA captcha, errors)
 * 6. Auto-generate simulated behavior fingerprint (sid/edt) when secondary verification needed
 *
 * All API modules (module/) call this via `useAxios(config)`.
 *
 * @module request
 * @requires axios - HTTP client
 * @requires ./helper - Signature functions
 * @requires ./util - Utilities (parseCookieString)
 * @requires ./config.json - Platform config
 * @requires ./runtime - Proxy config resolution
 * @requires ./generate_simulate - Behavior fingerprint simulation
 */

const axios = require('axios');
const { signKey, signatureAndroidParams, signatureRegisterParams, signatureWebParams } = require('./helper');
const { parseCookieString } = require('./util');
const { appid, clientver, liteAppid, liteClientver } = require('./config.json');
const { resolveProxy } = require('./runtime');
const { generateSimulate } = require('./generate_simulate');

/**
 * @typedef {Object} UseAxiosResponse
 * @description Unified API response format
 * @property {number} status - HTTP status (200=success, 502=failure)
 * @property {any} body - Response body (JSON or raw)
 * @property {string[]} cookie - Set-Cookie array from response (formatted)
 * @property {Record<string, string>} [headers] - Response headers (e.g. ssa-code)
 */

/**
 * Create and send API request
 *
 * Full flow:
 * 1. Extract device IDs from cookie (dfid, mid, uuid, token, userid)
 * 2. Build default params (dfid, mid, uuid, appid, clientver, clienttime)
 * 3. Generate signature by encryptType
 * 4. Configure headers (User-Agent, device info, IP passthrough)
 * 5. Configure proxy (if KUGOU_API_PROXY set)
 * 6. Send request and handle response
 * 7. Auto-generate simulated behavior fingerprint on SSA secondary verification
 *
 * @param {Object} options - Request config
 * @param {'get'|'GET'|'post'|'POST'} options.method - HTTP method
 * @param {string} options.url - Request path (e.g. "/v1/search")
 * @param {string} [options.baseURL] - Base URL (default "https://gateway.kugou.com")
 * @param {Record<string, any>} [options.params] - URL query params
 * @param {Record<string, any>} [options.data] - Request body (POST data)
 * @param {Record<string, string|number>} [options.headers] - Custom headers
 * @param {'android'|'web'|'register'} options.encryptType - Signature encryption type
 * @param {Object} options.cookie - Request Cookie object
 * @param {boolean} [options.encryptKey] - Whether to generate signKey
 * @param {boolean} [options.clearDefaultParams] - Whether to clear default params
 * @param {boolean} [options.notSignature] - Whether to skip signature
 * @param {string} [options.ip] - Client IP
 * @param {string} [options.realIP] - Real IP (overrides ip)
 * @returns {Promise<UseAxiosResponse>} Unified response object
 */
const createRequest = (options) => {
  return new Promise(async (resolve, reject) => {
    const isLite = process.env.platform === 'lite';

    // ========== Extract device IDs from Cookie ==========
    const dfid = options?.cookie?.dfid || '-';            // Device fingerprint ID (from register_dev)
    const mid = `${options?.cookie?.KUGOU_API_MID}`;      // Device MID (from calculateMid in server.js)
    const uuid = '-';                                     // Device UUID (currently fixed '-')
    const token = options?.cookie?.token || '';            // User login token
    const userid = options?.cookie?.userid || 0;           // User ID
    const clienttime = Math.floor(Date.now() / 1000);     // Current timestamp (seconds)
    const ip = options?.realIP || options?.ip || '';       // Client IP (for passthrough)
    const webglHash = options?.cookie?.KUGOU_API_WEBGL;   // WebGL fingerprint hash

    // ========== Build request headers ==========
    // kg-rc / kg-thash / kg-rec / kg-rf: KuGou internal headers for request source identification
    const headers = { dfid, clienttime, mid, 'kg-rc': '1', 'kg-thash': '5d816a0', 'kg-rec': 1, 'kg-rf': 'B9EDA08A64250DEFFBCADDEE00F8F25F' };

    // IP passthrough: client real IP via X-Real-IP / X-Forwarded-For
    if (ip) {
      headers['X-Real-IP'] = ip;
      headers['X-Forwarded-For'] = ip;
    }

    // ========== Build default request params ==========
    // Auto-injected on every request to simulate real client behavior
    const defaultParams = {
      dfid,                                           // Device fingerprint ID
      mid,                                            // Device MID
      uuid,                                           // Device UUID
      appid: isLite ? liteAppid : appid,              // App ID (by platform)
      clientver: isLite ? liteClientver : clientver,  // Client version (by platform)
      clienttime,                                     // Request timestamp (seconds)
    };

    // Add token and userid to defaults when present
    if (token) defaultParams['token'] = token;
    if (userid && userid !== 0) defaultParams['userid'] = userid;

    // Merge default and custom params (clearDefaultParams=true uses custom only)
    const params = options?.clearDefaultParams ? options?.params || {} : Object.assign({}, defaultParams, options?.params || {});

    // Sync clienttime to headers
    headers['clienttime'] = params.clienttime;

    // ========== Generate signKey (optional) ==========
    // Some APIs need extra key param for signature verification
    if (options?.encryptKey) {
      params['key'] = signKey(params['hash'], params['mid'], params['userid'], params['appid']);
    }

    // ========== Serialize request body ==========
    const data = Buffer.isBuffer(options?.data) ? options.data : typeof options?.data === 'object' ? JSON.stringify(options.data) : options?.data || '';

    // ========== Generate request signature ==========
    // encryptType selects algorithm:
    // - android: Android signature (default, most common)
    // - web: Web signature
    // - register: Device register signature
    if (!params['signature'] && !options.notSignature) {
      switch (options?.encryptType) {
        case 'register':
          params['signature'] = signatureRegisterParams(params);
          break;
        case 'web':
          params['signature'] = signatureWebParams(params);
          break;
        case 'android':
        default:
          params['signature'] = signatureAndroidParams(params, data);
          break;
      }
    }

    // ========== Configure request options ==========
    options['params'] = params;
    options['baseURL'] = options?.baseURL || 'https://gateway.kugou.com'; // Default gateway
    options['headers'] = Object.assign({ 'User-Agent': 'Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi' }, options?.headers || {}, {
      dfid,
      clienttime: params.clienttime,
      mid,
    });

    const requestOptions = {
      params,
      data: options?.data,
      method: options.method,
      baseURL: options?.baseURL,
      url: options.url,
      headers: Object.assign({}, options?.headers || {}, headers),
      withCredentials: true,               // Send cookies
      responseType: options.responseType,  // Response type (e.g. 'arraybuffer')
    };

    // ========== Proxy config ==========
    // Use proxy when KUGOU_API_PROXY is set
    const proxyConfig = resolveProxy();
    if (proxyConfig) {
      requestOptions.proxy = proxyConfig;
    }

    if (options.data) requestOptions.data = options.data;
    if (params) requestOptions.params = params;

    // ========== CDN API special handling ==========
    // openapicdn base URL: append params to URL
    if (options.baseURL?.includes('openapicdn')) {
      const url = requestOptions.url;
      const _params = Object.keys(params)
        .map((key) => `${key}=${params[key]}`)
        .join('&');
      requestOptions.url = `${url}?${_params}`;
      requestOptions.params = {};
    }

    // ========== Send request ==========
    const answer = { status: 500, body: {}, cookie: [], headers: {} };
    try {
      const response = await axios(requestOptions);

      let ssaCode = '';

      const body = response.data;

      // Parse Set-Cookie from response (clean key=value strings)
      answer.cookie = (response.headers['set-cookie'] || []).map((x) => parseCookieString(x));

      // ========== SSA captcha handling ==========
      // ssa-code header means secondary security verification (slider, SMS, etc.)
      if (response.headers['ssa-code'] || response.headers['SSA-CODE']) {
        const _ssaCode = response.headers['ssa-code'] || response.headers['SSA-CODE'];
        answer.headers['ssa-code'] = _ssaCode;
        ssaCode = _ssaCode;
      }

      // Parse response body as JSON
      try {
        answer.body = JSON.parse(body.toString());
      } catch (error) {
        answer.body = body;
      }

      // ========== Response status ==========
      if (response.data.status === 0 || (response.data?.error_code && response.data.error_code !== 0)) {
        // Failure: status=0 or non-zero error_code
        answer.status = 502;

        // On SSA captcha, attach simulated behavior fingerprint (sid/edt) for follow-up verification
        if (ssaCode) {
          const { edt, sid } = generateSimulate(mid, userid, dfid, webglHash);
          if (edt) answer.body.edt = edt;
          if (sid) answer.body.sid = sid;
          answer.body.ssaCode = ssaCode;
        }
        reject(answer);
      } else {
        // Success
        answer.status = 200;

        // Also attach SSA info on success (some APIs need verification even when successful)
        if (ssaCode) {
          const { edt, sid } = generateSimulate(mid, userid, dfid, webglHash);
          if (edt) answer.body.edt = edt;
          if (sid) answer.body.sid = sid;
          answer.body.ssaCode = ssaCode;
        }
        resolve(answer);
      }
    } catch (e) {
      // Network error or request exception
      answer.status = 502;
      answer.body = { status: 0, msg: e };
      reject(answer);
    }
  });
};

module.exports = { createRequest };
