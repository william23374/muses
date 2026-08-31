// Renderer-side bridge helper. Decides whether music-API requests should go over
// the IPC bridge (inside Electron) or over HTTP (browser / remote API URL).
import { getApiBaseUrl } from './apiBaseUrl';

/**
 * True when the app runs inside Electron (preload exposes `window.electronAPI.musicApi`)
 * AND the configured API base URL is the embedded/default local server.
 *
 * A user-configured remote `apiBaseUrl` is honoured over HTTP, so the bridge only
 * takes over the local-default case — exactly the "no port conflict" requirement.
 */
export function isBridgeEnabled() {
    if (typeof window === 'undefined') return false;
    if (typeof window.electronAPI?.musicApi !== 'function') return false;
    const base = getApiBaseUrl();
    if (!base) return true;
    return /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])(:\d+)?$/i.test(base);
}

/**
 * Raw IPC call to the main-process music API bridge.
 * @param {Object} payload { method, url, params, data, cookie, headers }
 * @returns {Promise<Object>} { status, body, headers, cookie }
 */
export function ipcRawRequest(payload) {
    if (!isBridgeEnabled()) {
        return Promise.reject(new Error('IPC music-api bridge unavailable'));
    }
    return window.electronAPI.musicApi(payload);
}

/**
 * Call via IPC and unwrap to the module body, matching what the axios response
 * interceptor returns for HTTP requests (i.e. `response.data`).
 * @param {Object} payload
 * @returns {Promise<any>} The module response body.
 */
export async function ipcRequest(payload) {
    const res = await ipcRawRequest(payload);
    if (res && typeof res === 'object' && 'body' in res) return res.body;
    return res;
}
