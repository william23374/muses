/**
 * @fileoverview KuGou Music API request signature utilities
 *
 * Provides multiple signature algorithms to encrypt/sign API request params,
 * ensuring request validity and tamper resistance. KuGou server validates these signatures.
 *
 * Signature types:
 * - signatureWebParams: Web API request signature
 * - signatureAndroidParams: Android API request signature (standard / lite)
 * - signatureRegisterParams: Device register API signature
 * - signParams: Generic sign signature
 * - signKey: Request key signature (platform-specific)
 * - signCloudKey: Cloud storage API key signature
 * - signParamsKey: Params key signature (platform-specific)
 *
 * All algorithms use MD5 hash over salt + concatenated params.
 *
 * @module helper
 * @requires ./crypto - MD5 encryption
 * @requires ./config.json - Platform config (appid, clientver, etc.)
 */

const CryptoJS = require('crypto-js');
const { cryptoMd5, wordArrayFromBuffer } = require('./crypto');
const { appid: useAppid, liteAppid, clientver: useClientver, liteClientver } = require('./config.json');

/**
 * Web API request signature
 *
 * Algorithm:
 * 1. Concatenate all params as key=value
 * 2. Sort param string alphabetically
 * 3. Concatenate: salt + sorted params + salt
 * 4. MD5 hash the result
 *
 * @param {Object} params - Request param key-value pairs
 * @returns {string} MD5 signature (32-char lowercase hex)
 */
const signatureWebParams = (params) => {
  const str = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt'; // Web signature salt
  const paramsString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .sort()    // Sort by key alphabetically
    .join(''); // Join into continuous string
  return cryptoMd5(`${str}${paramsString}${str}`);
};

/**
 * Android API request signature
 *
 * Differences from Web:
 * - Different salt; standard vs lite (concept edition)
 * - Supports optional request body (data) in signature
 * - Object param values are JSON.stringify'd first
 *
 * @param {Object} params - Request param key-value pairs
 * @param {string} [data] - Optional request body (e.g. POST body)
 * @returns {string} MD5 signature
 */
const signatureAndroidParams = (params, data) => {
  const isLite = process.env.platform === 'lite';
  const str = isLite ? 'LnT6xpN3khm36zse0QzvmgTZ3waWdRSA' : `OIlwieks28dk2k092lksi2UIkp`;
  const paramsString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key]}`)
    .join('');

  if (Buffer.isBuffer(data)) {
    const hasher = CryptoJS.algo.MD5.create();
    hasher.update(CryptoJS.enc.Utf8.parse(str));
    hasher.update(CryptoJS.enc.Utf8.parse(paramsString));
    hasher.update(wordArrayFromBuffer(data));
    hasher.update(CryptoJS.enc.Utf8.parse(str));
    return hasher.finalize().toString(CryptoJS.enc.Hex);
  }

  return cryptoMd5(`${str}${paramsString}${data || ''}${str}`);
};

/**
 * Device register API (register_dev) signature
 *
 * Algorithm:
 * 1. Extract all param values (ignore keys)
 * 2. Sort values alphabetically
 * 3. Concatenate: "1014" + sorted values + "1014"
 * 4. MD5 hash the result
 *
 * @param {Object} params - Request param key-value pairs
 * @returns {string} MD5 signature
 */
const signatureRegisterParams = (params) => {
  const paramsString = Object.keys(params)
    .map((key) => params[key]) // Values only, ignore keys
    .sort()
    .join('');
  return cryptoMd5(`1014${paramsString}1014`); // Salt is "1014"
};

/**
 * Generic sign signature
 *
 * Algorithm:
 * 1. Sort params by key
 * 2. Each param as key+value (no equals sign)
 * 3. Concatenate: sorted params + request body + salt
 * 4. MD5 hash the result
 *
 * @param {Object} params - Request param key-value pairs
 * @param {string} [data] - Optional request body
 * @returns {string} MD5 signature
 */
const signParams = (params, data) => {
  const str = 'R6snCXJgbCaj9WFRJKefTMIFp0ey6Gza'; // Signature salt
  const paramsString = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`) // key+value without =
    .join('');
  return cryptoMd5(`${paramsString}${data || ''}${str}`);
};

/**
 * Request key signature (signKey)
 *
 * Generates signKey param; differs for standard vs lite.
 * Algorithm: MD5(hash + salt + appid + mid + userid)
 *
 * @param {string} hash - Request hash
 * @param {string} mid - Device MID identifier
 * @param {(string|number)} [userid] - User ID, default 0
 * @param {(string|number)} [appid] - App ID, default from config
 * @returns {string} MD5 signature
 */
const signKey = (hash, mid, userid, appid) => {
  const isLite = process.env.platform === 'lite';
  // Standard and lite use different salts
  const str = isLite ? '185672dd44712f60bb1736df5a377e82' : '57ae12eb6890223e355ccfcb74edf70d';
  return cryptoMd5(`${hash}${str}${appid || useAppid}${mid}${userid || 0}`);
};

/**
 * Cloud storage API key signature (signCloudKey)
 *
 * Used for cloud-related API signature verification.
 * Algorithm: MD5("musicclound" + hash + pid + salt)
 *
 * @param {string} hash - Request hash
 * @param {string} pid - Cloud resource PID
 * @returns {string} MD5 signature
 */
const signCloudKey = (hash, pid) => {
  const str = 'ebd1ac3134c880bda6a2194537843caa0162e2e7'; // Cloud signature salt
  return cryptoMd5(`musicclound${hash}${pid}${str}`);
};

/**
 * Params key signature (signParamsKey)
 *
 * Generates sign param; differs for standard vs lite.
 * Algorithm: MD5(appid + salt + clientver + data)
 *
 * @param {string|number} data - Signature data (usually request hash or timestamp)
 * @param {(string|number)} [appid] - App ID, default from config
 * @param {(string|number)} [clientver] - Client version, default from config
 * @returns {string} MD5 signature
 */
const signParamsKey = (data, appid, clientver) => {
  const isLite = process.env.platform === 'lite';
  // Standard and lite use different salts
  const str = isLite ? 'LnT6xpN3khm36zse0QzvmgTZ3waWdRSA' : 'OIlwieks28dk2k092lksi2UIkp';

  // Default appid by platform
  appid = appid || (isLite ? liteAppid : useAppid);
  // Default clientver by platform
  clientver = clientver || (isLite ? liteClientver : useClientver);

  return cryptoMd5(`${appid}${str}${clientver}${data}`);
};

module.exports = {
  signKey,
  signParams,
  signParamsKey,
  signCloudKey,
  signatureAndroidParams,
  signatureRegisterParams,
  signatureWebParams,
};
