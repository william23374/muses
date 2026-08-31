/**
 * sidEdt.js
 * ----------
 * Completely transplanted from the browser script you provided (no functions are deleted),
 * Only replace browser-specific APIs with Node equivalent implementations.
 *
 * How to use:
 *   const { generateSidEdt } = require('./sidEdt');
 *   const { sid, edt } = await generateSidEdt({ userid, dfid, mid });
 *
 *   // sid and edt are both Base64 encoded and can be directly placed in the URL/JSON of the login request.
 */

'use strict';
const { generateSimulate } = require('../util/generate_simulate');
const { generateWebGLHash } = require('../util/util');
const verifyUserInfo = require('./verify_user_info');

module.exports = async (params, useAxios) => {
  const webglHash = params?.cookie.KUGOU_API_WEBGL || generateWebGLHash(); // WebGL fingerprint hash
  const userid = params?.userid || params?.cookie.userid || '0';
  const dfid = params?.dfid || params?.cookie.dfid || '0';
  const mid = params?.mid || params?.cookie.KUGOU_API_MID || '0';
  const value = generateSimulate(mid, userid, dfid, webglHash);
  const userParams = { ...params, edt: value.edt, sid: value.sid };
  return verifyUserInfo(userParams, useAxios);
};
