import { BrowserWindow, app } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import log from 'electron-log';
import treeKill from 'tree-kill';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NATIVE_HOST_PERMISSION = 'muses:nativeHost';
const LEGACY_NATIVE_HOST_PERMISSION = 'moekoe:nativeHost';
const SUPPORTED_PLATFORMS = ['win32', 'darwin', 'linux'];
const MAX_MESSAGE_BYTES = 64 * 1024;
const SHUTDOWN_TIMEOUT = 1500;

// Custom permissions should not go in Chrome standard permissions; the loader may treat them as unknown.
// Also supports Muses (muses_*) and legacy MoeKoe (moekoe_*) manifest fields.
function hasNativeHostPermission(manifest) {
    const permissions = [
        ...(Array.isArray(manifest?.permissions) ? manifest.permissions : []),
        ...(Array.isArray(manifest?.muses_permissions) ? manifest.muses_permissions : []),
        ...(Array.isArray(manifest?.moekoe_permissions) ? manifest.moekoe_permissions : []),
    ];
    return permissions.includes(NATIVE_HOST_PERMISSION) || permissions.includes(LEGACY_NATIVE_HOST_PERMISSION);
}

function fsExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch {
        return false;
    }
}

function getPlatformEntries(host) {
    if (!host?.platforms || typeof host.platforms !== 'object' || Array.isArray(host.platforms)) {
        return {};
    }

    return host.platforms;
}

function isRelativePluginPath(filePath) {
    const value = typeof filePath === 'string' ? filePath.trim() : '';
    const normalizedPath = path.posix.normalize(value.replace(/[\\]+/g, '/'));

    return Boolean(value) &&
        !path.isAbsolute(value) &&
        !/^[a-zA-Z]:/.test(value) &&
        !normalizedPath.startsWith('/') &&
        normalizedPath !== '..' &&
        !normalizedPath.startsWith('../');
}

class NativeHostManager {
    constructor() {
        // electron-store writes to the user's app config dir to persist authorization choices.
        this.store = new Store();
        // extensionId -> extension runtime info. extensionId comes from Electron/Chromium after load.
        this.extensions = new Map();
        // `${extensionId}:${hostId}` -> child process info.
        this.processes = new Map();
        // `${extensionId}:${hostId}` -> hidden bridge window.
        this.bridgeWindows = new Map();
    }

    syncExtensions(loadedExtensions = [], scannedExtensions = []) {
        // Rebuild index after extension load/refresh; authorization, status, and messaging depend on it.
        this.extensions.clear();

        for (const extension of loadedExtensions) {
            const scanned = scannedExtensions.find(item => item.name === extension.name);
            const manifest = extension.manifest || scanned?.manifest || {};
            const extensionPath = scanned?.path || '';
            const pluginId = this.getPluginId(extension.id, scanned?.directory, manifest);

            this.extensions.set(extension.id, {
                extensionId: extension.id,
                pluginId,
                name: extension.name,
                directory: scanned?.directory || '',
                extensionPath,
                manifest
            });
        }
    }

    startAuthorizedAutoHosts() {
        // Only handle the three supported desktop platforms; skip others.
        if (!SUPPORTED_PLATFORMS.includes(process.platform)) {
            return;
        }

        for (const record of this.extensions.values()) {
            for (const host of this.getHosts(record)) {
                // auto_start only controls exe auto-launch; bridge opens after authorization
                // so background/service worker can communicate even without a popup.
                if (host.autoStart && host.authorized && host.valid && host.supported) {
                    this.startHost(record, host);
                }
                if (host.authorized && host.valid && host.supported) {
                    this.openBridge(record, host);
                }
            }
        }
    }

    describeHosts(extensionId, manifest, extensionPath, directory = '') {
        // For management UI: return declaration, authorization, and run state without starting processes.
        const record = {
            extensionId,
            pluginId: this.getPluginId(extensionId, directory, manifest || {}),
            name: manifest?.name || '',
            directory,
            extensionPath,
            manifest: manifest || {}
        };

        return this.getHosts(record);
    }

    setAuthorization(extensionId, hostId, authorized) {
        // Management page authorize/revoke entry. Records persisted by pluginId + hostId key.
        const record = this.extensions.get(extensionId);
        if (!record) {
            return { success: false, message: '未找到插件' };
        }

        const host = this.getHosts(record).find(item => item.id === hostId);
        if (!host) {
            return { success: false, message: '未找到本地程序声明' };
        }
        if (!host.valid) {
            return { success: false, message: host.errors.join('; ') };
        }
        if (!host.supported) {
            return { success: false, message: '当前平台不支持该本地程序' };
        }

        this.store.set(this.getPermissionKey(record.pluginId, host.id), authorized === true);

        if (authorized) {
            if (host.autoStart) {
                this.startHost(record, host);
            }
            this.openBridge(record, host);
        } else {
            this.stopHostByKey(this.getKey(record.extensionId, host.id), true);
            this.closeBridge(this.getKey(record.extensionId, host.id));
        }

        return { success: true };
    }

    clearExtensionAuthorization(extensionId) {
        const record = this.extensions.get(extensionId);
        if (!record) {
            return;
        }

        for (const host of this.getHosts(record)) {
            this.store.delete(this.getPermissionKey(record.pluginId, host.id));
        }
    }

    getStatusFromSender(extensionId, hostId) {
        // Extension-side host status query. extensionId from senderFrame.url; no cross-extension queries.
        const record = this.extensions.get(extensionId);
        if (!record) {
            return { success: false, message: '未找到插件' };
        }

        const host = this.getHosts(record).find(item => item.id === hostId);
        if (!host) {
            return { success: false, message: '未找到本地程序声明' };
        }

        return { success: true, host };
    }

    sendFromSender(extensionId, hostId, payload) {
        // Extension-side business messages. Re-check authorization, platform, and declaration before writing stdin.
        const record = this.extensions.get(extensionId);
        if (!record) {
            return { success: false, message: '未找到插件' };
        }

        const host = this.getHosts(record).find(item => item.id === hostId);
        if (!host) {
            return { success: false, message: '未找到本地程序声明' };
        }
        if (!host.authorized) {
            return { success: false, message: '本地程序尚未授权' };
        }
        if (!host.valid) {
            return { success: false, message: host.errors.join('; ') };
        }
        if (!host.supported) {
            return { success: false, message: '当前平台不支持该本地程序' };
        }

        const processInfo = this.startHost(record, host);
        this.openBridge(record, host);

        if (!processInfo?.process || processInfo.process.killed) {
            return { success: false, message: '本地程序未运行' };
        }

        const message = JSON.stringify({ type: 'message', payload });
        if (Buffer.byteLength(message, 'utf8') > MAX_MESSAGE_BYTES) {
            return { success: false, message: '发送给本地程序的消息过大' };
        }

        // JSON Lines protocol with exe: each JSON object followed by a newline.
        this.writeToHost(processInfo, { type: 'message', payload });
        return { success: true };
    }

    stopExtension(extensionId, clearAuthorization = false) {
        // Stop all hosts on extension unload/reload; clear authorization on uninstall.
        const record = this.extensions.get(extensionId);
        if (!record) {
            return;
        }

        for (const host of this.getHosts(record)) {
            const key = this.getKey(record.extensionId, host.id);
            this.stopHostByKey(key, true);
            this.closeBridge(key);
            if (clearAuthorization) {
                this.store.delete(this.getPermissionKey(record.pluginId, host.id));
            }
        }
    }

    async stopAll() {
        // Called on app quit or extension cleanup: shut down all managed processes and bridges.
        // Await real process exit before returning to avoid port conflicts when restartExtensions
        // races with old processes still running.
        const waiters = [];

        for (const key of [...this.processes.keys()]) {
            const processInfo = this.processes.get(key);
            if (!processInfo?.process) continue;

            const child = processInfo.process;

            // Remove Map entry but keep child reference to wait for exit
            if (this.processes.get(key) === processInfo) {
                this.processes.delete(key);
            }

            this.writeToHost(processInfo, { type: 'shutdown' }, true);

            // Wait for exit (exit event or SHUTDOWN_TIMEOUT + 500ms fallback)
            waiters.push(new Promise(resolve => {
                let settled = false;
                const done = () => { if (!settled) { settled = true; resolve(); } };

                child.on('exit', done);
                child.on('error', done);

                setTimeout(() => {
                    if (!settled) {
                        if (!child.killed && child.exitCode === null) {
                            treeKill(child.pid, 'SIGKILL', err => {
                                if (err) log.warn(`强制结束本地程序失败 ${key}:`, err);
                            });
                        }
                        done();
                    }
                }, SHUTDOWN_TIMEOUT + 500);
            }));
        }

        for (const key of [...this.bridgeWindows.keys()]) {
            this.closeBridge(key);
        }

        if (waiters.length > 0) {
            await Promise.all(waiters);
        }
    }

    startHost(record, host) {
        // Reuse process if same host is already running to avoid duplicate exe instances.
        const key = this.getKey(record.extensionId, host.id);
        const existing = this.processes.get(key);
        if (existing?.process && !existing.process.killed && existing.process.exitCode === null) {
            return existing;
        }
        if (existing) {
            this.processes.delete(key);
        }
        if (!host.executablePath || !fsExists(host.executablePath)) {
            log.error(`本地程序文件不存在 ${record.pluginId}/${host.id}: ${host.executablePath}`);
            return null;
        }

        try {
            // Do not use shell to prevent command injection via argument concatenation.
            const child = spawn(host.executablePath, host.args, {
                cwd: path.dirname(host.executablePath),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const processInfo = {
                process: child,
                record,
                host,
                stdoutBuffer: ''
            };

            this.processes.set(key, processInfo);

            child.stdin.on('error', error => {
                if (error?.code !== 'EPIPE') {
                    log.warn(`本地程序标准输入错误 ${record.pluginId}/${host.id}:`, error);
                }
            });
            child.stdout.on('data', data => {
                this.handleStdout(key, data);
            });
            child.stderr.on('data', data => {
                log.warn(`本地程序标准错误输出 ${record.pluginId}/${host.id}: ${data}`);
            });
            child.on('exit', (code, signal) => {
                log.info(`本地程序已退出 ${record.pluginId}/${host.id}: ${code} ${signal || ''}`);
                if (this.processes.get(key) === processInfo) {
                    this.processes.delete(key);
                }
            });
            child.on('error', error => {
                log.error(`本地程序运行错误 ${record.pluginId}/${host.id}:`, error);
                if (this.processes.get(key) === processInfo) {
                    this.processes.delete(key);
                }
            });

            return processInfo;
        } catch (error) {
            log.error(`启动本地程序失败 ${record.pluginId}/${host.id}:`, error);
            return null;
        }
    }

    stopHostByKey(key, forceKill) {
        // Give exe a graceful shutdown first; tree-kill child tree on timeout.
        const processInfo = this.processes.get(key);
        if (!processInfo?.process) {
            return;
        }

        const child = processInfo.process;
        if (this.processes.get(key) === processInfo) {
            this.processes.delete(key);
        }

        this.writeToHost(processInfo, { type: 'shutdown' }, true);

        setTimeout(() => {
            if (!forceKill || child.killed || child.exitCode !== null) {
                return;
            }

            treeKill(child.pid, 'SIGKILL', error => {
                if (error) {
                    log.warn(`强制结束本地程序失败 ${key}:`, error);
                }
            });
        }, SHUTDOWN_TIMEOUT);
    }

    // Safe write to exe stdin. During shutdown exe may close the pipe first;
    // Windows throws EPIPE; shutdown flow may ignore this to avoid unhandled main-process exceptions.
    writeToHost(processInfo, payload, ignoreBrokenPipe = false) {
        const child = processInfo?.process;
        if (!child || child.killed || child.stdin.destroyed || child.stdin.writableEnded || !child.stdin.writable) {
            return false;
        }

        try {
            child.stdin.write(`${JSON.stringify(payload)}\n`, error => {
                if (!error) {
                    return;
                }
                if (ignoreBrokenPipe && error.code === 'EPIPE') {
                    return;
                }
                log.warn(`写入本地程序标准输入失败 ${processInfo.record.pluginId}/${processInfo.host.id}:`, error);
            });
            return true;
        } catch (error) {
            if (!(ignoreBrokenPipe && error?.code === 'EPIPE')) {
                log.warn(`写入本地程序标准输入失败 ${processInfo.record.pluginId}/${processInfo.host.id}:`, error);
            }
            return false;
        }
    }

    openBridge(record, host) {
        // Bridge is a hidden extension page with chrome.runtime and electronAPI via preload.
        // background/service worker cannot use Electron preload directly, so this relay page is needed.
        if (!host.bridge) {
            return;
        }

        const key = this.getKey(record.extensionId, host.id);
        const existing = this.bridgeWindows.get(key);
        if (existing && !existing.isDestroyed()) {
            return;
        }

        const bridgeWindow = new BrowserWindow({
            width: 1,
            height: 1,
            show: false,
            skipTaskbar: true,
            webPreferences: {
                preload: path.join(__dirname, '../preload.cjs'),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                webSecurity: false
            }
        });

        bridgeWindow.loadURL(`chrome-extension://${record.extensionId}/${host.bridge}`).catch(error => {
            log.error(`加载本地程序桥接页失败 ${record.pluginId}/${host.id}:`, error);
            this.closeBridge(key);
        });
        bridgeWindow.on('closed', () => {
            if (this.bridgeWindows.get(key) === bridgeWindow) {
                this.bridgeWindows.delete(key);
            }
        });

        this.bridgeWindows.set(key, bridgeWindow);
    }

    closeBridge(key) {
        const window = this.bridgeWindows.get(key);
        this.bridgeWindows.delete(key);
        if (window && !window.isDestroyed()) {
            window.close();
        }
    }

    handleStdout(key, data) {
        // exe stdout may return partial or multiple lines; buffer and split on newlines.
        const processInfo = this.processes.get(key);
        if (!processInfo) {
            return;
        }

        processInfo.stdoutBuffer += data.toString('utf8');
        if (Buffer.byteLength(processInfo.stdoutBuffer, 'utf8') > MAX_MESSAGE_BYTES) {
            log.warn(`本地程序标准输出消息过大 ${key}`);
            processInfo.stdoutBuffer = '';
            return;
        }

        const lines = processInfo.stdoutBuffer.split(/\r?\n/);
        processInfo.stdoutBuffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                continue;
            }

            try {
                const message = JSON.parse(trimmed);
                // Forward parsed message to bridge/popup pages under the same chrome-extension:// extension.
                this.sendToExtension(processInfo.record.extensionId, {
                    hostId: processInfo.host.id,
                    message
                });
            } catch (error) {
                log.warn(`本地程序输出的 JSON 无效 ${key}:`, error);
            }
        }
    }

    sendToExtension(extensionId, payload) {
        // Broadcast only to pages with the same extensionId to prevent cross-extension native host messages.
        const extensionUrl = `chrome-extension://${extensionId}/`;
        for (const window of BrowserWindow.getAllWindows()) {
            if (window.isDestroyed()) {
                continue;
            }

            const url = window.webContents.getURL();
            if (url.startsWith(extensionUrl)) {
                window.webContents.send('native-host-message', payload);
            }
        }
    }

    getHosts(record) {
        // Without muses/moekoe_native_hosts in manifest, extension is a plain Chrome extension.
        const declaredHosts = Array.isArray(record.manifest?.muses_native_hosts)
            ? record.manifest.muses_native_hosts
            : (Array.isArray(record.manifest?.moekoe_native_hosts)
                ? record.manifest.moekoe_native_hosts
                : []);

        return declaredHosts.map(rawHost => this.normalizeHost(record, rawHost));
    }

    normalizeHost(record, rawHost) {
        // Convert manifest declaration into a structure usable by UI and runtime.
        const host = rawHost && typeof rawHost === 'object' ? rawHost : {};
        const errors = validateNativeHostDeclaration(record.manifest, host);
        const id = typeof host.id === 'string' ? host.id.trim() : '';
        const platformEntries = getPlatformEntries(host);
        const platformConfig = platformEntries[process.platform] && typeof platformEntries[process.platform] === 'object'
            ? platformEntries[process.platform]
            : null;
        const hostPath = typeof platformConfig?.path === 'string' ? platformConfig.path.trim() : '';
        const args = Array.isArray(platformConfig?.args) ? platformConfig.args : [];
        const executablePath = hostPath && record.extensionPath
            ? path.resolve(record.extensionPath, hostPath)
            : '';
        const bridge = typeof host.bridge === 'string' ? host.bridge.trim().replace(/[\\/]+/g, '/') : '';
        const platforms = Object.keys(platformEntries);
        const supported = SUPPORTED_PLATFORMS.includes(process.platform) && Boolean(platformConfig);
        const key = this.getKey(record.extensionId, id);

        return {
            id,
            path: hostPath,
            args,
            platform: process.platform,
            platforms,
            autoStart: host.auto_start === true,
            bridge,
            executablePath,
            supported,
            valid: errors.length === 0,
            errors,
            authorized: this.store.get(this.getPermissionKey(record.pluginId, id)) === true,
            running: this.processes.has(key)
        };
    }

    getPluginId(extensionId, directory, manifest) {
        return manifest?.plugin_id || directory || extensionId;
    }

    getPermissionKey(pluginId, hostId) {
        // Authorization record example: nativeHostPermissions.moekoe-native-host-test.echo-host = true
        return `nativeHostPermissions.${pluginId}.${hostId}`;
    }

    getKey(extensionId, hostId) {
        return `${extensionId}:${hostId}`;
    }
}

export function validateNativeHostManifest(manifest) {
    const hosts = manifest?.muses_native_hosts ?? manifest?.moekoe_native_hosts;
    if (hosts === undefined) {
        return null;
    }
    if (!Array.isArray(hosts)) {
        return 'muses_native_hosts / moekoe_native_hosts 必须是数组';
    }
    if (!hasNativeHostPermission(manifest)) {
        return `native hosts 需要声明 ${NATIVE_HOST_PERMISSION} 或 ${LEGACY_NATIVE_HOST_PERMISSION} 权限`;
    }

    for (const host of hosts) {
        const errors = validateNativeHostDeclaration(manifest, host);
        if (errors.length > 0) {
            return errors[0];
        }
    }

    return null;
}

function validateNativeHostDeclaration(manifest, host) {
    const errors = [];
    if (!host || typeof host !== 'object') {
        return ['本地程序声明必须是对象'];
    }
    if (!hasNativeHostPermission(manifest)) {
        errors.push(`缺少 ${NATIVE_HOST_PERMISSION} 权限声明`);
    }
    if (typeof host.id !== 'string' || !host.id.trim()) {
        errors.push('本地程序 id 不能为空');
    }
    if (!host.platforms || typeof host.platforms !== 'object' || Array.isArray(host.platforms)) {
        errors.push('本地程序 platforms 必须是平台配置对象');
    } else {
        const entries = Object.entries(host.platforms);
        if (entries.length === 0) {
            errors.push('本地程序 platforms 不能为空');
        }

        for (const [platform, config] of entries) {
            if (!SUPPORTED_PLATFORMS.includes(platform)) {
                errors.push('本地程序 platforms 只能包含 win32、darwin、linux');
                continue;
            }
            if (!config || typeof config !== 'object' || Array.isArray(config)) {
                errors.push(`本地程序 ${platform} 配置必须是对象`);
                continue;
            }
            if (typeof config.path !== 'string' || !config.path.trim()) {
                errors.push(`本地程序 ${platform}.path 不能为空`);
            } else {
                if (!isRelativePluginPath(config.path)) {
                    errors.push(`本地程序 ${platform}.path 必须位于插件目录内`);
                }
                if (platform === 'win32' && path.extname(config.path).toLowerCase() !== '.exe') {
                    errors.push('Windows 本地程序路径必须以 .exe 结尾');
                }
            }
            if (config.args !== undefined && (!Array.isArray(config.args) || config.args.some(arg => typeof arg !== 'string'))) {
                errors.push(`本地程序 ${platform}.args 必须是字符串数组`);
            }
        }
    }
    if (host.bridge !== undefined) {
        if (typeof host.bridge !== 'string' || !host.bridge.trim()) {
            errors.push('本地程序 bridge 必须是非空字符串');
        } else if (!isRelativePluginPath(host.bridge)) {
            errors.push('本地程序 bridge 必须位于插件目录内');
        }
    }

    return errors;
}

const nativeHostManager = new NativeHostManager();

app.on('before-quit', () => {
    nativeHostManager.stopAll();
});

export default nativeHostManager;
