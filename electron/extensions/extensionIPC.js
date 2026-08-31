import { ipcMain, shell, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import { fileURLToPath } from 'url';
import extensionManager from './extensionManager.js';
import nativeHostManager from './nativeHostManager.js';
import { bindExternalLinkHandler } from '../services/externalLinkHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function syncNativeHosts() {
    nativeHostManager.syncExtensions(
        extensionManager.getLoadedExtensions(),
        extensionManager.scanExtensions()
    );
    nativeHostManager.startAuthorizedAutoHosts();
}

function getSenderExtensionId(event) {
    // native-host-send/status must come from a chrome-extension:// page.
    // Parse extension ID from senderFrame.url to prevent spoofing another extension's ID.
    const senderUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
    try {
        const url = new URL(senderUrl);
        return url.protocol === 'chrome-extension:' ? url.hostname : '';
    } catch {
        return '';
    }
}

// Get extension icon data
function getExtensionIconData(extension, extensionPath) {
    if (extension.manifest?.icons) {
        const icons = extension.manifest.icons;
        const iconSizes = Object.keys(icons);
        if (iconSizes.length > 0) {
            const iconSize = iconSizes[0];
            const iconPath = icons[iconSize];
            const fullIconPath = path.join(extensionPath, iconPath);
            
            try {
                if (fs.existsSync(fullIconPath)) {
                    const iconData = fs.readFileSync(fullIconPath);
                    const ext = path.extname(iconPath).toLowerCase();
                    let mimeType = 'image/png';
                    if (ext === '.jpg' || ext === '.jpeg') {
                        mimeType = 'image/jpeg';
                    }
                    return `data:${mimeType};base64,${iconData.toString('base64')}`;
                }
            } catch (error) {
                log.error('读取插件图标失败:', error);
            }
        }
    }
    return null;
}

/**
 * Register extension-related IPC handlers
 */
export function registerExtensionIPC() {
    // Management page: authorize or revoke a native host declared by an extension.
    ipcMain.handle('set-native-host-authorization', (event, extensionId, hostId, authorized) => {
        try {
            // Extension pages also see electronAPI from preload, so authorization must be validated in main.
            // Requests from chrome-extension:// are treated as self-calls and cannot modify authorization.
            if (getSenderExtensionId(event)) {
                return { success: false, message: '本地程序授权只能在Muses插件管理页操作' };
            }

            return nativeHostManager.setAuthorization(extensionId, hostId, authorized === true);
        } catch (error) {
            log.error('设置本地程序授权失败:', error);
            return { success: false, message: error.message };
        }
    });

    // Extension bridge/popup: query native host status.
    ipcMain.handle('native-host-get-status', (event, hostId) => {
        try {
            const extensionId = getSenderExtensionId(event);
            if (!extensionId) {
                return { success: false, message: '本地程序状态查询必须来自插件页面' };
            }

            return nativeHostManager.getStatusFromSender(extensionId, hostId);
        } catch (error) {
            log.error('获取本地程序状态失败:', error);
            return { success: false, message: error.message };
        }
    });

    // Extension bridge/popup: send business messages to native host stdin.
    ipcMain.handle('native-host-send', (event, hostId, payload) => {
        try {
            const extensionId = getSenderExtensionId(event);
            if (!extensionId) {
                return { success: false, message: '本地程序消息发送必须来自插件页面' };
            }

            return nativeHostManager.sendFromSender(extensionId, hostId, payload);
        } catch (error) {
            log.error('发送本地程序消息失败:', error);
            return { success: false, message: error.message };
        }
    });
    // Get extension list
    ipcMain.handle('get-extensions', () => {
        try {
            const loadedExtensions = extensionManager.getLoadedExtensions();
            const scannedExtensions = extensionManager.scanExtensions();
            // Sync on each list read so authorization buttons find the matching extension record immediately.
            nativeHostManager.syncExtensions(loadedExtensions, scannedExtensions);
            
            const extensions = loadedExtensions.map(ext => {
                const scannedExt = scannedExtensions.find(scanned => scanned.name === ext.name);
                let iconData = null;
                const manifestAuthor = ext.manifest?.author ?? scannedExt?.manifest?.author;
                const authorName = typeof manifestAuthor === 'string'
                    ? manifestAuthor
                    : (manifestAuthor?.name || '');
                const authorUrl = typeof manifestAuthor === 'object'
                    ? (manifestAuthor?.url || '')
                    : '';
                
                if (scannedExt?.path) {
                    iconData = getExtensionIconData(ext, scannedExt.path);
                }
                
                return {
                    id: ext.id,
                    pluginId: ext.manifest?.plugin_id || scannedExt?.manifest?.plugin_id || '',
                    name: ext.name,
                    directory: scannedExt?.directory || '',
                    version: ext.version,
                    enabled: true,
                    description: ext.manifest?.description || '',
                    author: authorName,
                    authorUrl: authorUrl,
                    permissions: ext.manifest?.permissions || [],
                    iconData: iconData,
                    moeKoeAdapted: ext.manifest?.muses === true || ext.manifest?.moekoe === true
                        || scannedExt?.manifest?.muses === true || scannedExt?.manifest?.moekoe === true,
                    minversion: ext.manifest?.minversion || scannedExt?.manifest?.minversion || '',
                    popupPath: scannedExt?.popupPath || '',
                    hasPopup: scannedExt?.hasPopup === true,
                    nativeHosts: nativeHostManager.describeHosts(
                        ext.id,
                        ext.manifest || scannedExt?.manifest || {},
                        scannedExt?.path || '',
                        scannedExt?.directory || ''
                    )
                };
            });
            
            return {
                success: true,
                extensions: extensions
            };
        } catch (error) {
            log.error('获取插件列表失败:', error);
            return {
                success: false,
                error: error.message,
                extensions: []
            };
        }
    });

    // Get detailed extension info
    ipcMain.handle('get-extensions-detailed', () => {
        try {
            return extensionManager.scanExtensions();
        } catch (error) {
            log.error('获取详细插件信息失败:', error);
            return [];
        }
    });

    // Reload extensions
    ipcMain.handle('reload-extensions', async () => {
        try {
            // Stop all native hosts and wait for exit first to avoid port conflicts from race on restart
            await nativeHostManager.stopAll();
            const result = await extensionManager.reloadExtensions();
            syncNativeHosts();
            return result;
        } catch (error) {
            log.error('重新加载插件失败:', error);
            return { success: false, message: error.message };
        }
    });

    // Open extensions directory
    ipcMain.handle('open-extensions-dir', () => {
        try {
            const extensionsDir = extensionManager.getExtensionsDirectory();
            shell.openPath(extensionsDir);
            return { success: true, path: extensionsDir };
        } catch (error) {
            log.error('打开插件目录失败:', error);
            return { success: false, message: error.message };
        }
    });

    // Open extension popup
    ipcMain.handle('open-extension-popup', (event, extensionId) => {
        try {
            const extension = extensionManager.getLoadedExtensions()
                .find(item => item.id === extensionId);
            const manifest = extension?.manifest || {};
            const popupPath = manifest?.action?.default_popup || '';
            const popupUrl = `chrome-extension://${extensionId}/${popupPath}`;
            // Create popup window
            const popupWindow = new BrowserWindow({
                width: 400,
                height: 600,
                webPreferences: {
                    preload: path.join(__dirname, '../preload.cjs'),
                    nodeIntegration: false,
                    contextIsolation: true,
                    enableRemoteModule: false,
                    sandbox: false,
                    webSecurity: false // Allow loading extension content
                },
                title: '插件弹窗',
                resizable: true,
                minimizable: true,
                maximizable: false,
                alwaysOnTop: false,
                show: false,
                autoHideMenuBar: true, // Hide menu bar
                menuBarVisible: false  // Do not show menu bar
            });

            // Remove menu bar entirely
            popupWindow.setMenuBarVisibility(false);
            popupWindow.removeMenu();

            bindExternalLinkHandler(
                popupWindow,
                (url) => /^(https?:|mailto:|tel:)/i.test(url)
            );
            
            popupWindow.loadURL(popupUrl).then(() => {
                popupWindow.show();
            }).catch((error) => {
                log.error('加载插件弹窗失败:', error);
                popupWindow.close();
            });

            return { success: true, extensionId };
        } catch (error) {
            log.error('打开插件弹窗失败:', error);
            return { success: false, message: error.message };
        }
    });

    // Install extension
    ipcMain.handle('install-extension', async (event, extensionPath) => {
        try {
            const result = await extensionManager.installExtension(extensionPath);
            if (result?.success) {
                syncNativeHosts();
            }
            return result;
        } catch (error) {
            log.error('手动安装插件失败:', error);
            return { success: false, message: error.message };
        }
    });

    // Uninstall extension
    ipcMain.handle('uninstall-extension', (event, extensionId, extensionDir) => {
        try {
            nativeHostManager.stopExtension(extensionId, true);
            const result = extensionManager.uninstallExtension(extensionId, extensionDir);
            return result;
        } catch (error) {
            log.error('卸载插件失败:', error);
            return { success: false, message: error.message };
        }
    });

    // Validate extension manifest
    ipcMain.handle('validate-extension', async (event, extensionPath) => {
        try {
            const manifestPath = path.join(extensionPath, 'manifest.json');
            const validation = extensionManager.validateManifest(manifestPath);
            return validation;
        } catch (error) {
            log.error('验证插件失败:', error);
            return { valid: false, error: error.message };
        }
    });

    // Get extensions directory path
    ipcMain.handle('get-extensions-directory', () => {
        try {
            return {
                success: true,
                path: extensionManager.getExtensionsDirectory()
            };
        } catch (error) {
            log.error('获取插件目录路径失败:', error);
            return { success: false, message: error.message };
        }
    });

    // Install extension from zip
    ipcMain.handle('install-plugin-from-zip', async (event, zipPath) => {
        try {
            const result = await extensionManager.installPluginFromZip(zipPath);
            if (result?.success) {
                syncNativeHosts();
            }
            return result;
        } catch (error) {
            log.error('安装插件失败:', error);
            return { success: false, message: error.message };
        }
    });
    
    // Install extension from URL
    ipcMain.handle('install-plugin-from-url', async (event, payload = {}) => {
        try {
            const result = await extensionManager.installPluginFromUrl(
                payload.downloadUrl,
                payload.extensionId,
                payload.extensionDir
            );
            if (result?.success) {
                syncNativeHosts();
            }
            return result;
        } catch (error) {
            log.error('Failed to install remote plugin:', error);
            return { success: false, message: error.message };
        }
    });
    
    // Show file open dialog
    ipcMain.handle('show-open-dialog', async (event, options) => {
        try {
            const result = await dialog.showOpenDialog({
                ...options,
                properties: [...(options.properties || [])],
                filters: [...(options.filters || [])]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                return { success: true, filePath: result.filePaths[0] };
            }
            return { success: false, message: '未选择文件' };
        } catch (error) {
            log.error('打开文件对话框失败:', error);
            return { success: false, message: error.message };
        }
    });

    // Ensure extensions directory exists
    ipcMain.handle('ensure-extensions-directory', () => {
        try {
            const path = extensionManager.ensureExtensionsDirectory();
            return { success: true, path };
        } catch (error) {
            log.error('创建插件目录失败:', error);
            return { success: false, message: error.message };
        }
    });

    log.info('插件 IPC 处理程序已注册');
}

/**
 * Unregister extension-related IPC handlers
 */
export function unregisterExtensionIPC() {
    const channels = [
        'get-extensions',
        'get-extensions-detailed',
        'reload-extensions',
        'open-extensions-dir',
        'open-extension-popup',
        'install-extension',
        'uninstall-extension',
        'validate-extension',
        'get-extensions-directory',
        'ensure-extensions-directory',
        'install-plugin-from-zip',
        'install-plugin-from-url',
        'show-open-dialog',
        'set-native-host-authorization',
        'native-host-get-status',
        'native-host-send'
    ];

    channels.forEach(channel => {
        ipcMain.removeHandler(channel);
    });

    log.info('插件 IPC 处理程序已注销');
}

export default {
    registerExtensionIPC,
    unregisterExtensionIPC
};
