/**
 * Browser-side behavior fingerprint generation utility
 *
 * Standalone module extracted from login_captcha_simulate.html, providing:
 * - generateWebGLHash(): Generate WebGL fingerprint hash
 * - generateEDTData(opts): Generate user behavior fingerprint data (data field for sid/edt encryption)
 *
 * Shared by login_captcha.html and login_captcha_simulate.html
 */

(function (root) {
  'use strict';

  /**
   * Random integer in [min, max] (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random integer
   */
  function ri(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ============================================================
  // Event record formatting functions
  // ============================================================

  /**
   * Format type-3 event (mouse/touch move)
   * @param {number} t - Time delta (milliseconds)
   * @param {number} i - Sub-index (0 or 1)
   * @param {number} x - Mouse X coordinate
   * @param {number} y - Mouse Y coordinate
   * @returns {string} Format: "3,timeDelta,subIndex,X,Y"
   */
  function f3(t, i, x, y) {
    return '3,' + t + ',' + i + ',' + x + ',' + y;
  }

  /**
   * Format type-5 event (scroll/timer)
   * @param {number} t - Time delta (milliseconds)
   * @param {number} i - Event index
   * @returns {string} Format: "5,timeDelta,eventIndex"
   */
  function f5(t, i) {
    return '5,' + t + ',' + i;
  }

  /**
   * Format type-6 event (window event)
   * @param {number} t - Time delta (milliseconds)
   * @param {number} i - Event index
   * @param {number} x - Window width
   * @param {number} y - Window height
   * @returns {string} Format: "6,timeDelta,eventIndex,width,height"
   */
  function f6(t, i, x, y) {
    return '6,' + t + ',' + i + ',' + x + ',' + y;
  }

  /**
   * Format type-3 sentinel record (mouse event end marker)
   * @param {number} sentinel - Sentinel value
   * @param {number} i - Sub-index
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {string} Format: "3,SENTINEL,subIndex,X,Y"
   */
  function fs3(sentinel, i, x, y) {
    return '3,' + sentinel + ',' + i + ',' + x + ',' + y;
  }

  /**
   * Format type-5 sentinel record (scroll event end marker)
   * @param {number} sentinel - Sentinel value
   * @param {number} i - Event index
   * @returns {string} Format: "5,SENTINEL,eventIndex"
   */
  function fs5(sentinel, i) {
    return '5,' + sentinel + ',' + i;
  }

  /**
   * Format type-6 sentinel record (window event end marker)
   * @param {number} sentinel - Sentinel value
   * @param {number} i - Event index
   * @param {number} x - Window width
   * @param {number} y - Window height
   * @returns {string} Format: "6,SENTINEL,eventIndex,width,height"
   */
  function fs6(sentinel, i, x, y) {
    return '6,' + sentinel + ',' + i + ',' + x + ',' + y;
  }

  // ============================================================
  // Bezier curve mouse path generation
  // ============================================================

  /**
   * Generate human-like mouse path with cubic Bezier curve
   *
   * Real mouse trajectory traits:
   * - Not straight; has curvature and acceleration/deceleration
   * - Small jitter (hand shake)
   * - Slow start, fast middle, slow end
   *
   * @param {number} sx - Start X
   * @param {number} sy - Start Y
   * @param {number} ex - End X
   * @param {number} ey - End Y
   * @param {number} n - Sample point count
   * @returns {Array<{x:number, y:number}>} Path point array
   */
  function bezierPath(sx, sy, ex, ey, n) {
    const c1x = sx + (ex - sx) * 0.3 + ri(-80, 80);
    const c1y = sy + (ey - sy) * 0.2 + ri(-60, 60);
    const c2x = sx + (ex - sx) * 0.7 + ri(-60, 60);
    const c2y = sy + (ey - sy) * 0.8 + ri(-40, 40);

    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;

      const x = u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex;
      const y = u * u * u * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey;

      const jitter = Math.max(0.5, 3 - t * 2.5);
      pts.push({
        x: x + (Math.random() - 0.5) * jitter,
        y: y + (Math.random() - 0.5) * jitter,
      });
    }
    return pts;
  }

  // ============================================================
  // Binary / hex / Base64 conversion utilities
  // ============================================================

  /**
   * hex string to ArrayBuffer
   * @param {string} hex - hex string (e.g. "6b75676f")
   * @returns {ArrayBuffer} Corresponding binary buffer
   */
  function hex2buf(hex) {
    const arr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
    return arr.buffer;
  }

  /**
   * ArrayBuffer to hex string
   * @param {ArrayBuffer} buf - Binary buffer
   * @returns {string} hex string (two lowercase hex digits per byte)
   */
  function buf2hex(buf) {
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * hex string to Base64 string
   * @param {string} hex - hex string
   * @returns {string} Base64-encoded string
   */
  function hexToBase64(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  // ============================================================
  // Encryption constants
  // ============================================================

  /**
   * RSA public key (SPKI DER as hex string)
   * Extracted from WASM binary; used for RSA-OAEP SHA-256 encryption of AES key
   * Algorithm: RSA-2048, public exponent 65537 (0x10001)
   */
  const RSA_SPKI_HEX =
    '30820122300d06092a864886f70d01010105000382010f003082010a0282010100a16dbe625a3c00b78f4904cfd31045945984387bc10fdb52facec30657ca12edd1cf3bd94da5f526d61b5f8f80554aa3e80473f0833e08a072a8616f6c737f5bae17c4d23eabbcf7e9a8c22f75532765b91bd302262b5cea819b8ab7b83507e1684ab49c2fa1c41590bc26c815f940d88b6b2d46d253bcf56c703f6be8e5426e0e5af63e20a9d3af23894cfb93d7234e5636c9f3004b2b2d83810afda4fa963e6110b46a51e4833d57c29aa3a3da49d29839619b5f78b6f91cc82a1bd9531c6d2707556ea3e50cf956f61e3fc4805ce7a2e0bebe1a225f2716dc1b8f85095544c5b86aecd2d63d1ffb57bd9db675408ab86c56fe05bb645fa05f3eaf1ed61aad0203010001';

  /**
   * AES initialization vector (fixed)
   * ASCII decodes to "kugousecurity123"
   * Hardcoded in WASM; same IV used for every encryption
   */
  const AES_IV_HEX = '6b75676f757365637572697479313233';

  // ============================================================
  // Encryption flow
  // ============================================================

  /**
   * Full sid encryption flow (pure JS, no WASM)
   *
   * Scheme:
   * 1. Generate random AES-128 key
   * 2. AES-128-CBC encrypt behavior fingerprint plaintext → EDT
   * 3. RSA-OAEP SHA-256 encrypt AES key → SID
   * 4. Server decrypts SID with RSA private key for AES key, then decrypts EDT for behavior data
   *
   * @param {string} plaintext - Plaintext to encrypt (behavior fingerprint data)
   * @returns {Promise<Object>} All intermediate data (plaintext, keys, ciphertexts)
   */
  async function encryptSid(plaintext) {
    const aesKeyRaw = crypto.getRandomValues(new Uint8Array(16));
    const aesKeyHex = buf2hex(aesKeyRaw);

    const aesKey = await crypto.subtle.importKey('raw', aesKeyRaw, { name: 'AES-CBC' }, false, ['encrypt']);

    const ptBuf = new TextEncoder().encode(plaintext);
    const iv = new Uint8Array(hex2buf(AES_IV_HEX));
    const aesCt = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: iv }, aesKey, ptBuf);

    const rsaKey = await crypto.subtle.importKey('spki', hex2buf(RSA_SPKI_HEX), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);

    const rsaCt = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaKey, aesKeyRaw);

    return {
      plaintext,
      aesKeyHex,
      aesIvHex: AES_IV_HEX,
      aesCiphertextHex: buf2hex(aesCt),
      rsaCiphertextHex: buf2hex(rsaCt),
    };
  }

  // ============================================================
  // WebGL fingerprint generation
  // ============================================================

  /**
   * Generate WebGL fingerprint hash
   *
   * WebGL fingerprint is a key browser fingerprint component from GPU vendor, renderer,
   * WebGL version, and supported extensions.
   *
   * Browser: real WebGL info via canvas rendering
   * Node or WebGL unavailable: random uint64 simulated value
   *
   * @returns {string} WebGL fingerprint as decimal string
   */
  function generateWebGLHash() {
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : '';
          const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
          const version = gl.getParameter(gl.VERSION);
          const exts = gl.getSupportedExtensions().join(',');
          const s = vendor + '|' + renderer + '|' + version + '|' + exts;
          let hash = BigInt('14695981039346656037');
          const prime = BigInt('1099511628211');
          for (let i = 0; i < s.length; i++) {
            hash = hash ^ BigInt(s.charCodeAt(i));
            hash = (hash * prime) & BigInt('0xFFFFFFFFFFFFFFFF');
          }
          return hash.toString();
        }
      } catch (e) {}
    }
    const hi = Math.floor(Math.random() * 0xffffffff);
    const lo = Math.floor(Math.random() * 0xffffffff);
    return (BigInt(hi) * BigInt(0x100000000) + BigInt(lo)).toString();
  }

  // ============================================================
  // Behavior data generation
  // ============================================================

  /**
   * Generate data field in sid (user behavior fingerprint data)
   *
   * Simulates real user page interaction:
   * - Window load/resize events
   * - Page scroll events
   * - Mouse movement trajectory
   *
   * Data format: type,value,index[,x,y] entries separated by :
   * Event types:
   *   3 = mouse/touch move (with x,y)
   *   5 = scroll/timer event
   *   6 = window event (e.g. resize)
   *
   * @param {Object} opts - Options
   * @param {number} opts.startX - Mouse start X
   * @param {number} opts.startY - Mouse start Y
   * @param {number} opts.endX - Mouse end X
   * @param {number} opts.endY - Mouse end Y
   * @param {number} opts.mousePoints - Mouse path sample count
   * @returns {string} Encoded data field string
   */
  function generateEDTData(opts) {
    const { startX, startY, endX, endY, mousePoints } = opts;
    const sentinel = 0xffffffff - Math.floor(Math.random() * 20);
    const entries = [];
    let ts = 0;
    let ei = 0;

    entries.push(f5(0, 0));
    entries.push(fs5(sentinel, 0));
    entries.push(f5(0, 0));
    entries.push(fs5(sentinel, 0));

    ts += ri(5, 20);
    entries.push(f6(ts, ei, 750, 500));
    entries.push(fs6(sentinel, ei, 750, 500));
    ei++;

    for (let i = 0; i < 3; i++) {
      ts += ri(80, 600);
      entries.push(f5(ts, ei));
      entries.push(fs5(sentinel, ei));
      ei++;
    }

    const path = bezierPath(startX, startY, endX, endY, mousePoints);
    let si = 0;
    for (let j = 0; j < path.length; j++) {
      const p = path[j];
      ts += ri(8, 50);
      entries.push(f3(ts, si, Math.round(p.x), Math.round(p.y)));
      entries.push(fs3(sentinel, si, Math.round(p.x), Math.round(p.y)));

      if (j > 0 && j % 12 === 0) {
        ts += ri(20, 60);
        entries.push(f5(ts, ei));
        entries.push(fs5(sentinel, ei));
        ei++;
      }
      si = (si + 1) % 2;
    }

    ts += ri(5, 30);
    entries.push(f3(ts, 1, Math.round(endX + ri(-5, 5)), Math.round(endY + ri(-5, 5))));
    entries.push(fs3(sentinel, 1, Math.round(endX), Math.round(endY)));

    return entries.join(':');
  }

  // ============================================================
  // Export
  // ============================================================

  const fingerprint = { generateWebGLHash, generateEDTData, encryptSid, hex2buf, buf2hex, hexToBase64, ri };

  // Support multiple module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = fingerprint;
  } else {
    root.fingerprint = fingerprint;
  }
})(typeof window !== 'undefined' ? window : globalThis);
