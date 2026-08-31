/**
 * @fileoverview KuGou Music API behavior fingerprint simulator (Node.js version)
 *
 * This module generates simulated user behavior fingerprint data on the server,
 * replacing browser-side WASM functionality.
 * Mainly used for automated request scenarios (e.g. batch login, API calls) to
 * bypass KuGou's behavior detection.
 *
 * Core features:
 * 1. Generate simulated mouse movement trajectories (Bezier curves + random jitter)
 * 2. Generate simulated page interaction events (scroll, window resize, etc.)
 * 3. Encrypt behavior data with AES-128-CBC to produce EDT (Encrypted Data Token)
 * 4. Encrypt the AES key with RSA-OAEP SHA-256 to produce SID (Session ID)
 * 5. Server decrypts SID with RSA private key to obtain AES key, then decrypts EDT to restore behavior data
 *
 * Encryption scheme:
 *   Plaintext (behavior data) → AES-128-CBC encryption → EDT (Base64)
 *   AES key → RSA-OAEP SHA-256 encryption → SID (Base64)
 *
 * @module generate_simulate
 * @requires crypto-js - AES encryption library
 * @requires node-forge - RSA encryption library
 * @requires ./util - Utility functions (randomString)
 */

const { randomString } = require('./util');

const CryptoJS = require('crypto-js');
const forge = require('node-forge');

/**
 * RSA public key (PEM format)
 * SPKI public key extracted from KuGou WASM binary, used for RSA-OAEP SHA-256 encryption of AES key
 * Algorithm: RSA-2048, public exponent 65537 (0x10001)
 *
 * Server holds the corresponding private key to decrypt SID and obtain the AES key
 */
const publicKey = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoW2+Ylo8ALePSQTP0xBF\nlFmEOHvBD9tS+s7DBlfKEu3RzzvZTaX1JtYbX4+AVUqj6ARz8IM+CKByqGFvbHN/\nW64XxNI+q7z36ajCL3VTJ2W5G9MCJitc6oGbire4NQfhaEq0nC+hxBWQvCbIFflA\n2ItrLUbSU7z1bHA/a+jlQm4OWvY+IKnTryOJTPuT1yNOVjbJ8wBLKy2DgQr9pPqW\nPmEQtGpR5IM9V8Kao6PaSdKYOWGbX3i2+RzIKhvZUxxtJwdVbqPlDPlW9h4/xIBc\n56Lgvr4aIl8nFtwbj4UJVUTFuGrs0tY9H/tXvZ22dUCKuGxW/gW7ZF+gXz6vHtYa\nrQIDAQAB\n-----END PUBLIC KEY-----`;

/**
 * AES initialization vector (fixed value)
 * ASCII decodes to "kugousecurity123"
 * Same as the hardcoded IV in browser-side WASM; the same IV is used for every encryption
 * @type {string}
 */
const iv = 'kugousecurity123';

/**
 * Sentinel value (random value near 0xFFFFFFFF)
 * WASM appends a sentinel record after each event record to mark event end or indicate "no data"
 * Regenerated on each generateSimulate call to increase fingerprint randomness
 * @type {number}
 */
let SENTINEL = 0xffffffff - Math.floor(Math.random() * 20);

/**
 * Generate the data field in EDT (user behavior fingerprint data)
 *
 * Simulates real user interaction on the page, including:
 * - Window load/resize events (type 6)
 * - Page scroll events (type 5)
 * - Mouse movement trajectory (type 3, generated via Bezier curves)
 *
 * Event encoding format: entries separated by `:`, fields within each entry separated by `,`
 * - type-3 (mouse move): "3,timestamp_delta,sub_index,X,Y"
 * - type-5 (scroll/timer): "5,timestamp_delta,event_index"
 * - type-6 (window event): "6,timestamp_delta,event_index,width,height"
 * - Sentinel record: timestamp_delta field replaced with SENTINEL value
 *
 * @param {Object} opts - Configuration options
 * @param {number} opts.startX - Mouse start X coordinate
 * @param {number} opts.startY - Mouse start Y coordinate
 * @param {number} opts.endX - Mouse end X coordinate
 * @param {number} opts.endY - Mouse end Y coordinate
 * @param {number} opts.mousePoints - Number of mouse trajectory sample points
 * @returns {string} Encoded data field string with event entries separated by `:`
 */
function generateEDTData(opts) {
  const { startX, startY, endX, endY, mousePoints } = opts;
  const entries = []; // All event entries
  let ts = 0;         // Cumulative timestamp (ms), incrementing from 0
  let ei = 0;         // Global event index (used for type-5/6 event identification)

  // --- Initialization: two type-5 zero events ---
  // Simulates initial events recorded at WASM startup; each event followed by a sentinel record
  entries.push(f5(0, 0));
  entries.push(fs5(0));
  entries.push(f5(0, 0));
  entries.push(fs5(0));

  // --- Window events (type 6) ---
  // Simulates window load/resize events; window size set to 750x500 (simulating mobile page)
  ts += ri(5, 20);                    // Random delay 5-20ms (simulating page load time)
  entries.push(f6(ts, ei, 750, 500)); // Window event record
  entries.push(fs6(ei, 750, 500));    // Corresponding sentinel record
  ei++;

  // --- Scroll events (type 5) ---
  // Simulates user page scrolling (3 scrolls with uneven intervals)
  for (let i = 0; i < 3; i++) {
    ts += ri(80, 600); // Scroll interval 80-600ms (simulating uneven scroll rhythm)
    entries.push(f5(ts, ei));
    entries.push(fs5(ei));
    ei++;
  }

  // --- Mouse trajectory (type 3) ---
  // Generate smooth mouse movement path using cubic Bezier curves
  const path = bezierPath(startX, startY, endX, endY, mousePoints);
  let si = 0; // Sub-index (0 or 1, alternating)
  for (let i = 0; i < path.length; i++) {
    const { x, y } = path[i];
    ts += ri(8, 50); // Mouse move interval 8-50ms
    entries.push(f3(ts, si, Math.round(x), Math.round(y)));
    entries.push(fs3(si, Math.round(x), Math.round(y)));

    // Insert a scroll event every 12 frames to simulate scrolling while moving the mouse
    if (i > 0 && i % 12 === 0) {
      ts += ri(20, 60);
      entries.push(f5(ts, ei));
      entries.push(fs5(ei));
      ei++;
    }
    si = (si + 1) % 2; // Sub-index alternates between 0 and 1
  }

  // --- End events ---
  // Final mouse position with small random offset (simulating fine adjustment before click)
  ts += ri(5, 30);
  entries.push(f3(ts, 1, Math.round(endX + ri(-5, 5)), Math.round(endY + ri(-5, 5))));
  entries.push(fs3(1, Math.round(endX), Math.round(endY)));

  return entries.join(':');
}

// ============================================================
// Bezier curve mouse path generation
// ============================================================

/**
 * Generate a human-like mouse movement path using cubic Bezier curves
 *
 * Real mouse trajectory characteristics:
 * - Not a straight line; has curvature and acceleration/deceleration
 * - Small jitter (hand tremor); large at start, stabilizes during movement
 * - Slow start, fast middle, decelerating end (naturally achieved by uniform sampling of Bezier parameter t)
 *
 * Cubic Bezier formula: B(t) = (1-t)³·P0 + 3(1-t)²t·P1 + 3(1-t)t²·P2 + t³·P3
 * Where P0=start, P3=end, P1/P2=two random control points
 *
 * @param {number} sx - Start X
 * @param {number} sy - Start Y
 * @param {number} ex - End X
 * @param {number} ey - End Y
 * @param {number} n - Number of sample points (more points = smoother trajectory)
 * @returns {Array<{x:number, y:number}>} Path point array, length n+1
 */
function bezierPath(sx, sy, ex, ey, n) {
  // Generate two random control points so the path is curved rather than straight
  // Control points are randomly offset near the line from start to end
  const c1x = sx + (ex - sx) * 0.3 + ri(-80, 80); // First control point X (30% from start + random offset)
  const c1y = sy + (ey - sy) * 0.2 + ri(-60, 60); // First control point Y (20% from start + random offset)
  const c2x = sx + (ex - sx) * 0.7 + ri(-60, 60); // Second control point X (70% from start + random offset)
  const c2y = sy + (ey - sy) * 0.8 + ri(-40, 40); // Second control point Y (80% from start + random offset)

  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; // Parameter t from 0 to 1, uniformly sampled
    const u = 1 - t; // 1 - t, for formula simplification

    // Cubic Bezier formula evaluation
    const x = u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex;
    const y = u * u * u * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey;

    // Jitter amplitude: large at start (3px), gradually decreasing to 0.5px (simulating hand tremor at start, stabilizing during movement)
    const jitter = Math.max(0.5, 3 - t * 2.5);
    pts.push({
      x: x + (Math.random() - 0.5) * jitter, // Random jitter in X direction
      y: y + (Math.random() - 0.5) * jitter, // Random jitter in Y direction
    });
  }
  return pts;
}

// ============================================================
// Event record formatting functions
// ============================================================

/**
 * Format type-3 event (mouse/touch move)
 * @param {number} t - Timestamp delta (ms)
 * @param {number} i - Sub-index (0 or 1, alternating)
 * @param {number} x - Mouse X coordinate
 * @param {number} y - Mouse Y coordinate
 * @returns {string} Format: "3,timestamp_delta,sub_index,X,Y"
 */
function f3(t, i, x, y) {
  return `3,${t},${i},${x},${y}`;
}

/**
 * Format type-5 event (scroll/timer)
 * @param {number} t - Timestamp delta (ms)
 * @param {number} i - Event index
 * @returns {string} Format: "5,timestamp_delta,event_index"
 */
function f5(t, i) {
  return `5,${t},${i}`;
}

/**
 * Format type-6 event (window event)
 * @param {number} t - Timestamp delta (ms)
 * @param {number} i - Event index
 * @param {number} x - Window width
 * @param {number} y - Window height
 * @returns {string} Format: "6,timestamp_delta,event_index,width,height"
 */
function f6(t, i, x, y) {
  return `6,${t},${i},${x},${y}`;
}

/**
 * Format type-3 sentinel record (mouse event end marker)
 * Sentinel record uses SENTINEL value for timestamp_delta field, marking end of that event type sequence
 * @param {number} i - Sub-index
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {string} Format: "3,SENTINEL,sub_index,X,Y"
 */
function fs3(i, x, y) {
  return `3,${SENTINEL},${i},${x},${y}`;
}

/**
 * Format type-5 sentinel record (scroll event end marker)
 * @param {number} i - Event index
 * @returns {string} Format: "5,SENTINEL,event_index"
 */
function fs5(i) {
  return `5,${SENTINEL},${i}`;
}

/**
 * Format type-6 sentinel record (window event end marker)
 * @param {number} i - Event index
 * @param {number} x - Window width
 * @param {number} y - Window height
 * @returns {string} Format: "6,SENTINEL,event_index,width,height"
 */
function fs6(i, x, y) {
  return `6,${SENTINEL},${i},${x},${y}`;
}

/**
 * Generate a random integer in the range [min, max] (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
function ri(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================
// Core export function
// ============================================================

/**
 * Generate simulated sid and edt encrypted data
 *
 * Full flow:
 * 1. Generate random AES-128 key (16 bytes, first 16 chars of MD5 hash)
 * 2. Randomize mouse trajectory parameters (start, end, sample point count)
 * 3. Generate simulated behavior data (mouse trajectory + scroll + window events)
 * 4. Concatenate full plaintext: mid=xxx;userid=xxx;dfid=xxx;webgl=xxx;webdriver=0;ts=xxx;data=xxx
 * 5. AES-128-CBC encrypt plaintext → EDT (Base64)
 * 6. RSA-OAEP SHA-256 encrypt AES key → SID (Base64)
 *
 * @param {string|number} mid - Device MID identifier, defaults to 0 if absent
 * @param {string|number} userid - User ID, defaults to 0 if absent
 * @param {string|number} dfid - Device fingerprint ID (returned by register_dev API), defaults to 0 if absent
 * @param {string} [webglHash] - WebGL fingerprint hash, auto-generated if not provided
 * @returns {{ edt: string, sid: string }} Encrypted data object
 *   - edt: AES-128-CBC encrypted behavior data (Base64)
 *   - sid: RSA-OAEP encrypted AES key (Base64)
 */
const generateSimulate = (mid, userid, dfid, webglHash) => {
  // Regenerate sentinel value on each call to increase fingerprint randomness
  SENTINEL = 0xffffffff - Math.floor(Math.random() * 20);

  // Generate random AES-128 key: first create 16-byte random string, take first 16 chars of MD5 hash
  const key = CryptoJS.MD5(randomString(16)).toString(CryptoJS.enc.Hex).substring(0, 16);

  // Randomize mouse trajectory parameters so each request has a different behavior fingerprint
  const points = ri(30, 60);   // Mouse trajectory sample points (30~60 points)
  const startX = ri(200, 600); // Mouse start X (middle area of page)
  const startY = ri(200, 500); // Mouse start Y
  const endX = ri(500, 700);   // Mouse end X (near login button)
  const endY = ri(80, 150);    // Mouse end Y

  // Default parameter handling
  mid = mid || 0;
  userid = userid || 0;
  dfid = dfid || 0;
  webglHash = webglHash || generateWebGLHash();
  const ts = Date.now(); // Current timestamp

  // Generate behavior data (mouse trajectory + scroll + window events)
  const data = generateEDTData({ startX, startY, endX, endY, mousePoints: points });

  // Concatenate full plaintext
  // Format: mid=xxx;userid=xxx;dfid=xxx;webgl=xxx;webdriver=0;ts=xxx;data=xxx
  // - mid: Device identifier
  // - userid: User ID
  // - dfid: Device fingerprint ID
  // - webgl: WebGL renderer fingerprint hash
  // - webdriver: Whether automation driver is detected (0 means no)
  // - ts: Timestamp
  // - data: Behavior event data
  const sidPlaintext = `mid=${mid};userid=${userid};dfid=${dfid};webgl=${webglHash};webdriver=0;ts=${ts};data=${data}`;

  console.log(sidPlaintext);

  // Step 1: AES-128-CBC encrypt behavior fingerprint plaintext → EDT
  // - Key: Randomly generated 16-character string
  // - IV: Fixed value "kugousecurity123"
  // - Padding: PKCS7
  // - Output: Base64-encoded ciphertext
  const edtData = CryptoJS.AES.encrypt(sidPlaintext, CryptoJS.enc.Utf8.parse(key), {
    iv: CryptoJS.enc.Utf8.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();

  // Step 2: RSA-OAEP SHA-256 encrypt AES key → SID
  // - Encrypt AES key with KuGou server RSA public key
  // - Hash algorithm: SHA-256
  // - MGF1 hash: SHA-256 (same as main hash)
  // - Output: Base64-encoded ciphertext
  const rsaKey = forge.pki.publicKeyFromPem(publicKey);

  const encrypted = rsaKey.encrypt(key, 'RSA-OAEP', {
    md: forge.md.sha256.create(),        // Main hash algorithm
    mgf1: { md: forge.md.sha256.create() }, // MGF1 mask generation function hash algorithm
  });
  const ciphertext = forge.util.encode64(encrypted); // Base64 encoding

  // Return EDT (encrypted behavior data) and SID (encrypted AES key)
  return { edt: edtData, sid: ciphertext };
};

module.exports = { generateSimulate };
