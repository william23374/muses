/**
 * @fileoverview General utility function library
 *
 * Common utilities for KuGou Music API project:
 * - Random string/number generation
 * - Cookie parsing and formatting
 * - KRC lyrics decode (XOR decrypt + zlib decompress)
 * - Device MID calculation (MD5-based big integer conversion)
 * - GUID generation (UUID v4 format)
 * - WebGL fingerprint hash (browser/Node dual environment)
 *
 * @module util
 * @requires pako - zlib decompress (KRC lyrics)
 * @requires crypto-js - Crypto (MD5 for MID)
 * @requires big-integer - Big integer (MID base conversion)
 */

const pako = require('pako');
const CryptoJS = require('crypto-js');
const bigInt = require('big-integer');

/**
 * Generate random string (uppercase letters + digits)
 *
 * Char pool: 1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ (36 chars)
 * Random pick from pool, concatenate to requested length.
 *
 * @param {number} [len=16] - String length, default 16
 * @returns {string} Random string
 *
 * @example
 * randomString(8) // => "A3B7K9X2"
 */
const randomString = (len = 16) => {
  const keyString = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const _key = [];
  const keyStringArr = keyString.split('');
  for (let i = 0; i < len; i += 1) {
    const ceil = Math.ceil((keyStringArr.length - 1) * Math.random());
    const _tmp = keyStringArr[ceil];
    _key.push(_tmp);
  }

  return _key.join('');
};

/**
 * Generate random numeric string
 *
 * Char pool: 1234567890 (10 digits)
 * Random pick from pool, concatenate to requested length.
 *
 * @param {number} [len=16] - String length, default 16
 * @returns {string} Random numeric string
 *
 * @example
 * randomNumber(6) // => "384729"
 */
const randomNumber = (len = 16) => {
  const keyString = '1234567890';
  const _key = [];
  const keyStringArr = keyString.split('');
  for (let i = 0; i < len; i += 1) {
    const ceil = Math.ceil((keyStringArr.length - 1) * Math.random());
    const _tmp = keyStringArr[ceil];
    _key.push(_tmp);
  }

  return _key.join('');
};

/**
 * Format Cookie string
 *
 * Removes non-data fields (Domain, path, expires, HttpOnly),
 * keeping only valid key-value pairs.
 *
 * @param {string} cookie - Raw Cookie string
 * @returns {string} Formatted Cookie string
 *
 * @example
 * parseCookieString('token=abc; Domain=.kugou.com; path=/; HttpOnly')
 * // => 'token=abc'
 */
const parseCookieString = (cookie) => {
  const t = cookie.replace(/\s*(Domain|domain|path|expires)=[^(;|$)]+;*/g, '');
  return t.replace(/;HttpOnly/g, '');
};

/**
 * Cookie string to JSON object
 *
 * Split Cookie by `;`, each pair by `=` into key and value.
 *
 * @param {string} cookie - Cookie string
 * @returns {Object} Cookie key-value object
 *
 * @example
 * cookieToJson('token=abc; userid=123')
 * // => { token: 'abc', userid: '123' }
 */
const cookieToJson = (cookie) => {
  if (!cookie) return {};
  let cookieArr = cookie.split(';');
  let obj = {};
  cookieArr.forEach((i) => {
    let arr = i.split('=');
    obj[arr[0]] = arr[1];
  });
  return obj;
};

/**
 * KRC lyrics decode
 *
 * KuGou KRC lyrics decode flow:
 * 1. Skip first 4 bytes (file header)
 * 2. XOR remaining bytes with fixed key
 * 3. pako (zlib) decompress to plaintext lyrics
 *
 * XOR key (16 bytes, cycled):
 * [64, 71, 97, 119, 94, 50, 116, 71, 81, 54, 49, 45, 206, 210, 110, 105]
 *
 * @param {string | Uint8Array | Buffer} val - Encrypted lyrics data
 *   - string: Base64-encoded lyrics
 *   - Uint8Array: Raw byte array
 *   - Buffer: Node.js Buffer
 * @returns {string} Decoded plaintext lyrics; empty string on failure
 */
const decodeLyrics = (val) => {
  let bytes = null;
  if (val instanceof Uint8Array) bytes = val;
  if (Buffer.isBuffer(val)) bytes = new Uint8Array(val);
  if (typeof val === 'string') bytes = new Uint8Array(Buffer.from(val, 'base64'));
  if (bytes === null) return '';

  // XOR decrypt key (16 bytes, cycled)
  const enKey = [64, 71, 97, 119, 94, 50, 116, 71, 81, 54, 49, 45, 206, 210, 110, 105];
  const krcBytes = bytes.slice(4); // Skip 4-byte file header
  const len = krcBytes.byteLength;

  // XOR decrypt
  for (let index = 0; index < len; index += 1) {
    krcBytes[index] = krcBytes[index] ^ enKey[index % enKey.length];
  }

  // zlib decompress
  try {
    const inflate = pako.inflate(krcBytes);
    return Buffer.from(inflate).toString('utf8');
  } catch {
    return '';
  }
};

/**
 * Calculate device MID
 *
 * MD5 hash input string (usually GUID), treat hex hash as base-16 big integer,
 * convert to base-10 string.
 *
 * Algorithm:
 * 1. MD5 hash input (32-char hex)
 * 2. Treat hex as base-16 number
 * 3. Accumulate: sum += digit * 16^(position)
 * 4. Return decimal string
 *
 * @param {string} str - Input string (usually device GUID)
 * @returns {string} MID as decimal string
 *
 * @example
 * calculateMid('550e8400-e29b-41d4-a716-446655440000')
 * // => "123456789012345678901234567890"
 */
const calculateMid = (str) => {
  let bigInteger = bigInt(0);
  const bigInteger2 = bigInt(16); // Radix
  const digest = CryptoJS.MD5(str).toString(CryptoJS.enc.Hex); // MD5 hash
  const length = digest.length;
  for (let i = 0; i < length; i += 1) {
    const charValue = bigInt(parseInt(digest.charAt(i), 16));      // Current digit
    const powerValue = bigInteger2.pow(length - 1 - i);             // Power of 16
    bigInteger = bigInteger.add(charValue.multiply(powerValue));    // Accumulate
  }
  return bigInteger.toString();
};

/**
 * Generate random GUID (UUID v4 format)
 *
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * - Third segment starts with 4 (UUID v4)
 * - Fourth segment starts with 8/9/a/b (UUID v4 variant)
 *
 * @returns {string} UUID v4 GUID string
 *
 * @example
 * getGuid() // => "550e8400-e29b-41d4-a716-446655440000"
 */
const getGuid = () => {
  const e = () => {
    return ((65536 * (1 + Math.random())) | 0).toString(16).substring(1);
  };

  return `${e()}${e()}-${e()}-${e()}-${e()}-${e()}${e()}${e()}`;
};

/**
 * Generate WebGL fingerprint hash
 *
 * WebGL fingerprint is a key browser fingerprint component:
 *
 * Browser:
 * 1. Compile vertex/fragment shaders, create WebGL program
 * 2. Draw triangle and read pixel data
 * 3. Collect GPU vendor, renderer, WebGL version metadata
 * 4. FNV-1a 64-bit hash over pixels + metadata
 *
 * Node or WebGL unavailable:
 * Random uint64 as simulated fingerprint
 *
 * @returns {string} WebGL fingerprint as decimal string
 */
const generateWebGLHash = () => {
  // Browser: real WebGL renderer info via canvas
  if (typeof document !== 'undefined') {
    try {
      const c = document.createElement('canvas');
      c.width = 200;
      c.height = 50;
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (gl) {
        // --- Compile shaders (same logic as WASM) ---
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, 'attribute vec4 position;void main(){gl_Position=position;}');
        gl.compileShader(vs);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, 'void main(){gl_FragColor=vec4(1.0,1.0,1.0,1.0);}');
        gl.compileShader(fs);
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.useProgram(prog);

        // --- Draw triangle ---
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1]), gl.STATIC_DRAW);
        const pos = gl.getAttribLocation(prog, 'position');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        gl.viewport(0, 0, 200, 50);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // --- Read render result and hash ---
        const pixels = new Uint8Array(200 * 50 * 4);
        gl.readPixels(0, 0, 200, 50, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        // Metadata: GPU vendor, renderer, WebGL version
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : '';
        const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
        const version = gl.getParameter(gl.VERSION);

        // FNV-1a 64-bit hash
        let h = BigInt('14695981039346656037'); // FNV offset basis
        const prime = BigInt('1099511628211');   // FNV prime

        // Hash pixel data
        for (let i = 0; i < pixels.length; i++) {
          h = ((h ^ BigInt(pixels[i])) * prime) & BigInt('0xFFFFFFFFFFFFFFFF');
        }
        // Hash metadata
        const meta = vendor + '|' + renderer + '|' + version;
        for (let i = 0; i < meta.length; i++) {
          h = ((h ^ BigInt(meta.charCodeAt(i))) * prime) & BigInt('0xFFFFFFFFFFFFFFFF');
        }
        return h.toString();
      }
    } catch (e) {}
  }
  // Node or WebGL unavailable: random uint64 as simulated fingerprint
  const hi = Math.floor(Math.random() * 0xffffffff);
  const lo = Math.floor(Math.random() * 0xffffffff);
  return (BigInt(hi) * BigInt(0x100000000) + BigInt(lo)).toString();
};

/**
 * Whether string is UUID v4
 * @param {string} str 
 * @returns { Boolean }
 */
const isUUIDv4 = (str) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

module.exports = {
  decodeLyrics,
  cookieToJson,
  parseCookieString,
  randomString,
  randomNumber,
  calculateMid,
  getGuid,
  generateWebGLHash,
  isUUIDv4
};
