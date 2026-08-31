/**
 * @fileoverview Utility module unified export entry
 *
 * This file is the util directory index module, responsible for:
 * 1. Importing all utility functions and constants from submodules
 * 2. Selecting config values for current platform (standard / lite)
 * 3. Unified export for API modules
 *
 * API modules (files under module/) use `require('../util')` to get
 * all needed utility functions and config constants.
 *
 * @module util/index
 */

// ========== Config constants ==========
const { apiver, appid, wx_appid, wx_lite_appid, wx_secret, wx_lite_secret, srcappid, clientver, liteAppid, liteClientver, qq_appid, qq_lite_appid } = require('./config.json');

// ========== Crypto functions ==========
const {
  cryptoAesDecrypt,     // AES decrypt
  cryptoAesEncrypt,     // AES encrypt
  cryptoMd5,            // MD5 hash
  cryptoRSAEncrypt,     // RSA encrypt
  cryptoSha1,           // SHA1 hash
  rsaEncrypt2,          // RSA encrypt v2 (register_dev, etc.)
  playlistAesEncrypt,   // Playlist AES encrypt
  playlistAesDecrypt,   // Playlist AES decrypt
  publicLiteRasKey,     // Lite RSA public key
  publicRasKey,         // Standard RSA public key
} = require('./crypto');

// ========== Request functions ==========
const { createRequest } = require('./request');
const { resolveProxy } = require('./runtime');

// ========== Signature functions ==========
const { signKey, signParams, signParamsKey, signCloudKey, signatureAndroidParams, signatureRegisterParams, signatureWebParams } = require('./helper');

// ========== Utility functions ==========
const { randomString, decodeLyrics, parseCookieString, cookieToJson, randomNumber, calculateMid, isUUIDv4 } = require('./util');

// ========== Platform detection ==========
// Whether current platform is lite (concept edition) from env var platform
const isLite = process.env.platform === 'lite';
// Select appid and clientver by platform
const useAppid = isLite ? liteAppid : appid;
const useClientver = isLite ? liteClientver : clientver;

/**
 * Unified export of all utility functions and config constants
 *
 * API modules import via `const { xxx } = require('../util')`.
 */
module.exports = {
  // --- Config constants ---
  apiver,                       // API version
  appid: useAppid,              // App ID (auto-selected by platform)
  // liteAppid,                  // Lite app ID (commented out, not exposed)
  // liteClientver,              // Lite client version (commented out, not exposed)
  wx_appid,                     // WeChat mini program app ID
  wx_lite_appid,                // WeChat lite mini program app ID
  wx_secret,                    // WeChat mini program secret
  wx_lite_secret,               // WeChat lite mini program secret
  qq_appid,                     // QQ Open Platform app ID (standard)
  qq_lite_appid,                // QQ Open Platform app ID (lite)
  srcappid,                     // Source app ID
  clientver: useClientver,      // Client version (auto-selected by platform)
  isLite,                       // Whether lite edition

  // --- Crypto functions ---
  cryptoAesDecrypt,             // AES decrypt
  cryptoAesEncrypt,             // AES encrypt
  cryptoMd5,                    // MD5 hash
  cryptoRSAEncrypt,             // RSA encrypt
  cryptoSha1,                   // SHA1 hash
  rsaEncrypt2,                  // RSA encrypt v2
  playlistAesEncrypt,           // Playlist AES encrypt
  playlistAesDecrypt,           // Playlist AES decrypt

  // --- Request functions ---
  createRequest,                // Create HTTP request
  resolveProxy,                 // Resolve project proxy config (KUGOU_API_PROXY)

  // --- Signature functions ---
  signKey,                      // Request key signature
  signParams,                   // Generic sign signature
  signParamsKey,                // Params key signature
  signCloudKey,                 // Cloud API key signature
  signatureAndroidParams,       // Android signature
  signatureRegisterParams,      // Device register signature
  signatureWebParams,           // Web signature

  // --- Utility functions ---
  randomString,                 // Random string generation
  decodeLyrics,                 // KRC lyrics decode
  parseCookieString,            // Cookie string formatting
  cookieToJson,                 // Cookie string to JSON
  publicLiteRasKey,             // Lite RSA public key
  publicRasKey,                 // Standard RSA public key
  randomNumber,                 // Random numeric string
  calculateMid,                 // Device MID calculation
  isUUIDv4                      // Whether string is UUID v4
};
