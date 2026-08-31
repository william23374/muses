import { session, app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import AdmZip from 'adm-zip';
import { validateNativeHostManifest } from './nativeHostManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Chrome extension root: userData in production, repo plugins/extensions in development.
const EXTENSIONS_DIR = !isDev
    ? path.join(app.getPath('userData'), 'extensions')
    : path.join(__dirname, '../../plugins/extensions');

/**
 * Bundled preset extensions directory (production: resources/extensions).
 */
export function getBundledExtensionsDirectory() {
    if (isDev) {
        return path.join(__dirname, '../../plugins/extensions');
    }
    return path.join(process.resourcesPath, 'extensions');
}

function compareVersions(a, b) {
    const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const x = pa[i] || 0;
        const y = pb[i] || 0;
        if (x > y) return 1;
        if (x < y) return -1;
    }
    return 0;
}

function readManifestVersion(dir) {
    try {
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
        return manifest.version || '0.0.0';
    } catch {
        return null;
    }
}

function getRemovedMarkerPath(pluginName) {
    return path.join(EXTENSIONS_DIR, `${pluginName}.removed`);
}

function clearRemovedMarker(pluginName) {
    if (!pluginName) {
        return;
    }
    const removedMarker = getRemovedMarkerPath(pluginName);
    if (fs.existsSync(removedMarker)) {
        fs.rmSync(removedMarker, { force: true });
    }
}

function resolvePluginFolderName(extensionDir = '') {
    const name = path.basename(String(extensionDir || '').trim());
    if (!name || name === '.' || name === '..') {
        return '';
    }
    return name;
}

/**
 * Sync bundled preset extensions into the user extensions directory (production only).
 * - Copy when missing
 * - Overwrite when the bundled version is newer
 * - Skip user-removed presets (`.removed` marker) unless the bundled version is newer
 */
export function seedBundledExtensions() {
    if (isDev) {
        return { success: true, seeded: [] };
    }

    const bundledDir = getBundledExtensionsDirectory();
    if (!fs.existsSync(bundledDir)) {
        return { success: true, seeded: [] };
    }

    ensureExtensionsDirectory();
    const seeded = [];

    try {
        const entries = fs.readdirSync(bundledDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith('.'));

        for (const entry of entries) {
            const name = entry.name;
            const src = path.join(bundledDir, name);
            const dest = path.join(EXTENSIONS_DIR, name);

            if (!fs.existsSync(path.join(src, 'manifest.json'))) {
                continue;
            }

            const bundledVersion = readManifestVersion(src);
            if (!bundledVersion) {
                continue;
            }

            const removedMarker = getRemovedMarkerPath(name);
            if (fs.existsSync(removedMarker)) {
                let removedVersion = '0.0.0';
                try {
                    removedVersion = fs.readFileSync(removedMarker, 'utf8').trim() || '0.0.0';
                } catch {
                    removedVersion = '0.0.0';
                }
                if (compareVersions(bundledVersion, removedVersion) <= 0) {
                    continue;
                }
                fs.rmSync(removedMarker, { force: true });
            }

            if (fs.existsSync(dest)) {
                const installedVersion = readManifestVersion(dest);
                if (installedVersion && compareVersions(bundledVersion, installedVersion) <= 0) {
                    continue;
                }
                fs.rmSync(dest, { recursive: true, force: true });
            }

            fs.cpSync(src, dest, { recursive: true });
            seeded.push({ name, version: bundledVersion });
            log.info(`Synced preset extension: ${name} (${bundledVersion})`);
        }
    } catch (error) {
        log.error('Failed to sync preset extensions:', error);
        return { success: false, message: error.message, seeded };
    }

    return { success: true, seeded };
}

/**
 * Load Chrome extensions from EXTENSIONS_DIR.
 */
export async function loadChromeExtensions() {
    if (!fs.existsSync(EXTENSIONS_DIR)) {
        fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
        log.info('Created extensions directory:', EXTENSIONS_DIR);
    }

    try {
        const extensionDirs = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const loadTasks = [];

        for (const extensionDir of extensionDirs) {
            const extensionPath = path.join(EXTENSIONS_DIR, extensionDir);
            const manifestPath = path.join(extensionPath, 'manifest.json');
            
            if (fs.existsSync(manifestPath)) {
                try {
                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    
                    // Validate required manifest fields before loading.
                    if (manifest.manifest_version && manifest.name && manifest.version) {
                        loadTasks.push(
                            session.defaultSession.loadExtension(extensionPath, {
                                allowFileAccess: true
                            }).then((extension) => {
                                log.info(`Loaded extension: ${manifest.name} (${extension.id})`);
                            }).catch((error) => {
                                log.error(`Failed to load extension ${extensionDir}:`, error);
                            })
                        );
                    } else {
                        log.warn(`Invalid manifest.json for extension ${extensionDir}`);
                    }
                } catch (error) {
                    log.error(`Failed to parse manifest.json for ${extensionDir}:`, error);
                }
            } else {
                log.warn(`Extension directory ${extensionDir} is missing manifest.json`);
            }
        }

        await Promise.allSettled(loadTasks);
    } catch (error) {
        log.error('Failed to scan extensions directory:', error);
    }
}

/**
 * Unload all extensions from the session.
 */
export function unloadChromeExtensions() {
    try {
        const extensions = session.defaultSession.getAllExtensions();
        extensions.forEach(extension => {
            session.defaultSession.removeExtension(extension.id);
            log.info(`Unloaded extension: ${extension.name}`);
        });
    } catch (error) {
        log.error('Failed to unload extensions:', error);
    }
}

/**
 * Get extensions currently loaded in the session.
 */
export function getLoadedExtensions() {
    try {
        return session.defaultSession.getAllExtensions();
    } catch (error) {
        log.error('Failed to get loaded extensions:', error);
        return [];
    }
}

/**
 * Load a single extension from disk into the session.
 * @param {string} extensionPath Absolute path to the extension folder
 */
export async function installExtension(extensionPath) {
    try {
        const extension = await session.defaultSession.loadExtension(extensionPath, {
            allowFileAccess: true
        });
        const folderName = resolvePluginFolderName(extensionPath);
        if (folderName && path.resolve(path.dirname(extensionPath)) === path.resolve(EXTENSIONS_DIR)) {
            clearRemovedMarker(folderName);
        }
        log.info(`Installed extension: ${extension.name}`);
        return { success: true, extension: { id: extension.id, name: extension.name } };
    } catch (error) {
        log.error('Failed to install extension:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Unload an extension and delete its files from EXTENSIONS_DIR.
 * @param {string} extensionId Chrome extension id
 * @param {string} extensionDir Folder name under EXTENSIONS_DIR
 */
export function uninstallExtension(extensionId, extensionDir = '') {
    try {
        let removedFromSession = false;
        let removedFiles = false;
        let targetDirPath = '';

        const pluginFolderName = resolvePluginFolderName(extensionDir);
        if (pluginFolderName) {
            targetDirPath = path.join(EXTENSIONS_DIR, pluginFolderName);
            // Never allow deleting the extensions root itself.
            if (path.resolve(targetDirPath) === path.resolve(EXTENSIONS_DIR)) {
                targetDirPath = '';
            }
        }

        try {
            session.defaultSession.removeExtension(extensionId);
            removedFromSession = true;
            log.info(`Removed extension session: ${extensionId}`);
        } catch (error) {
            log.warn(`Failed to remove extension session ${extensionId}:`, error);
        }

        if (targetDirPath && fs.existsSync(targetDirPath)) {
            fs.rmSync(targetDirPath, { recursive: true, force: true });
            removedFiles = true;
            log.info(`Deleted extension directory: ${targetDirPath}`);
        }

        // Mark bundled presets as removed so seedBundledExtensions will not restore them.
        if (pluginFolderName && !isDev) {
            const bundledPath = path.join(getBundledExtensionsDirectory(), pluginFolderName);
            if (fs.existsSync(path.join(bundledPath, 'manifest.json'))) {
                const version = readManifestVersion(bundledPath) || '0.0.0';
                ensureExtensionsDirectory();
                fs.writeFileSync(getRemovedMarkerPath(pluginFolderName), version, 'utf8');
                log.info(`Marked preset extension as removed: ${pluginFolderName} (${version})`);
            }
        }

        if (!removedFromSession && !removedFiles) {
            return { success: false, message: '未找到可卸载的插件会话或目录' };
        }

        return {
            success: true,
            removedFromSession,
            removedFiles,
            path: targetDirPath || ''
        };
    } catch (error) {
        log.error('Failed to uninstall extension:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Reload all extensions (unload then load).
 */
export async function reloadExtensions() {
    try {
        unloadChromeExtensions();
        await loadChromeExtensions();
        return { success: true, message: '插件重新加载成功' };
    } catch (error) {
        log.error('Failed to reload extensions:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Get the active extensions directory path.
 */
export function getExtensionsDirectory() {
    return EXTENSIONS_DIR;
}

/**
 * Ensure the extensions directory exists.
 */
export function ensureExtensionsDirectory() {
    if (!fs.existsSync(EXTENSIONS_DIR)) {
        fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
        log.info('Created extensions directory:', EXTENSIONS_DIR);
    }
    return EXTENSIONS_DIR;
}

/**
 * Validate an extension manifest.json file.
 * @param {string} manifestPath Path to manifest.json
 */
export function validateManifest(manifestPath) {
    try {
        if (!fs.existsSync(manifestPath)) {
            return { valid: false, error: 'manifest.json 文件不存在' };
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Required Manifest V3 fields.
        const requiredFields = ['manifest_version', 'name', 'version'];
        for (const field of requiredFields) {
            if (!manifest[field]) {
                return { valid: false, error: `缺少必需字段: ${field}` };
            }
        }

        if (manifest.manifest_version !== 3) {
            return { valid: false, error: '仅支持 Manifest V3 格式' };
        }

        // Native Host is a local-process capability; reject unsafe declarations early.
        const nativeHostError = validateNativeHostManifest(manifest);
        if (nativeHostError) {
            return { valid: false, error: nativeHostError };
        }

        return { valid: true, manifest };
    } catch (error) {
        return { valid: false, error: `解析 manifest.json 失败: ${error.message}` };
    }
}

function getExtensionPopupPath(manifest) {
    const popupPath = manifest?.action?.default_popup || '';

    return typeof popupPath === 'string' ? popupPath.trim() : '';
}

function hasExtensionPopupFile(extensionPath, manifest) {
    const popupPath = getExtensionPopupPath(manifest);
    if (!popupPath) {
        return false;
    }

    const normalizedPopupPath = popupPath.replace(/[\\/]+/g, path.sep);
    const fullPopupPath = path.join(extensionPath, normalizedPopupPath);
    return fs.existsSync(fullPopupPath);
}

/**
 * Get detailed info for an extension folder.
 * @param {string} extensionDir Folder name under EXTENSIONS_DIR
 */
export function getExtensionInfo(extensionDir) {
    const extensionPath = path.join(EXTENSIONS_DIR, extensionDir);
    const manifestPath = path.join(extensionPath, 'manifest.json');
    
    const validation = validateManifest(manifestPath);
    if (!validation.valid) {
        return { error: validation.error };
    }

    const manifest = validation.manifest;
    const stats = fs.statSync(extensionPath);
    const popupPath = getExtensionPopupPath(manifest);
    const hasPopup = hasExtensionPopupFile(extensionPath, manifest);
    
    return {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description || '',
        author: manifest.author || '',
        permissions: manifest.permissions || [],
        path: extensionPath,
        size: getDirectorySize(extensionPath),
        lastModified: stats.mtime,
        manifest: manifest,
        popupPath,
        hasPopup
    };
}

/**
 * Recursively compute directory size in bytes.
 * @param {string} dirPath Directory path
 */
function getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
                totalSize += getDirectorySize(filePath);
            } else {
                totalSize += stats.size;
            }
        }
    } catch (error) {
        log.error('Failed to calculate directory size:', error);
    }
    
    return totalSize;
}

/**
 * Install an extension from a zip package.
 * @param {string} zipPath Path to the zip file
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function installPluginFromZip(zipPath) {
    try {
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();

        ensureExtensionsDirectory();

        // Find the first top-level directory that contains manifest.json.
        let pluginEntry = null;
        let manifestEntry = null;
        for (const entry of zipEntries) {
            const parts = entry.entryName.split('/');
            if (parts.length === 2 && parts[1] === 'manifest.json') {
                manifestEntry = entry;
                pluginEntry = parts[0];
                break;
            }
        }

        if (!manifestEntry || !pluginEntry) {
            return { success: false, message: '无效的插件包格式：未找到 manifest.json' };
        }

        const manifestContent = zip.readAsText(manifestEntry);
        try {
            const manifest = JSON.parse(manifestContent);
            // Validate the parsed object directly (no temp file needed).
            if (!manifest.manifest_version || !manifest.name || !manifest.version) {
                return { success: false, message: '清单文件缺少必需字段' };
            }
            if (manifest.manifest_version !== 3) {
                return { success: false, message: '仅支持 Manifest V3 格式' };
            }
            // Apply the same Native Host checks used for local installs.
            const nativeHostError = validateNativeHostManifest(manifest);
            if (nativeHostError) {
                return { success: false, message: nativeHostError };
            }
        } catch (error) {
            return { success: false, message: `manifest.json 解析失败: ${error.message}` };
        }

        // Normalize folder name (strip a trailing -main suffix from GitHub zips).
        const pluginName = pluginEntry.replace(/-main$/, '');
        const targetDir = path.join(EXTENSIONS_DIR, pluginName);
        
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
        }

        fs.mkdirSync(targetDir, { recursive: true });

        // Extract while preserving relative paths under the plugin root.
        for (const entry of zipEntries) {
            const entryName = entry.entryName;
            if (entryName.startsWith(pluginEntry + '/')) {
                const relativePath = entryName.substring(pluginEntry.length + 1);
                if (relativePath) {
                    const targetPath = path.join(targetDir, relativePath);
                    if (entry.isDirectory) {
                        fs.mkdirSync(targetPath, { recursive: true });
                    } else {
                        const targetDirPath = path.dirname(targetPath);
                        fs.mkdirSync(targetDirPath, { recursive: true });
                        fs.writeFileSync(targetPath, entry.getData());
                    }
                }
            }
        }

        const result = await installExtension(targetDir);
        if (!result.success) {
            if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true, force: true });
            }
            return { success: false, message: '插件加载失败：' + result.message };
        }

        // Manual reinstall clears the preset-removed marker.
        clearRemovedMarker(pluginName);

        return { 
            success: true, 
            message: `插件安装成功`,
            extension: result.extension
        };
    } catch (error) {
        log.error('Failed to install plugin from zip:', error);
        return { success: false, message: '安装插件失败：' + error.message };
    }
}

/**
 * Download a zip package and install or update a plugin from a remote URL.
 * @param {string} downloadUrl
 * @param {string} extensionId
 * @param {string} extensionDir
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function installPluginFromUrl(downloadUrl, extensionId = '', extensionDir = '') {
    const tempZipPath = path.join(app.getPath('temp'), `muses-plugin-${Date.now()}.zip`);

    try {
        if (!downloadUrl || typeof downloadUrl !== 'string') {
            return { success: false, message: 'Invalid plugin download url' };
        }

        const response = await fetch(downloadUrl);
        if (!response.ok) {
            return {
                success: false,
                message: `Failed to download plugin package: ${response.status} ${response.statusText || ''}`.trim()
            };
        }

        const arrayBuffer = await response.arrayBuffer();
        const zipBuffer = Buffer.from(arrayBuffer);

        if (!isZipBuffer(zipBuffer)) {
            return { success: false, message: '下载内容不是有效的 zip 插件包' };
        }

        fs.writeFileSync(tempZipPath, zipBuffer);

        if (extensionId || extensionDir) {
            const uninstallResult = uninstallExtension(extensionId, extensionDir);
            if (!uninstallResult.success) {
                log.warn('Failed to remove existing plugin before update:', uninstallResult.message);
            }
        }

        return await installPluginFromZip(tempZipPath);
    } catch (error) {
        log.error('Failed to install plugin from url:', error);
        return { success: false, message: error.message };
    } finally {
        if (fs.existsSync(tempZipPath)) {
            fs.rmSync(tempZipPath, { force: true });
        }
    }
}

function isZipBuffer(buffer) {
    return Boolean(buffer) &&
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        (
            (buffer[2] === 0x03 && buffer[3] === 0x04) ||
            (buffer[2] === 0x05 && buffer[3] === 0x06) ||
            (buffer[2] === 0x07 && buffer[3] === 0x08)
        );
}

/**
 * Format a byte size for display.
 * @param {number} bytes Size in bytes
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Scan EXTENSIONS_DIR and return metadata for each valid extension.
 */
export function scanExtensions() {
    ensureExtensionsDirectory();
    
    try {
        const extensionDirs = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const extensions = [];
        
        for (const extensionDir of extensionDirs) {
            const info = getExtensionInfo(extensionDir);
            if (!info.error) {
                extensions.push({
                    ...info,
                    directory: extensionDir,
                    installed: isExtensionInstalled(info.name)
                });
            } else {
                log.warn(`Failed to read extension info for ${extensionDir}:`, info.error);
            }
        }
        
        return extensions;
    } catch (error) {
        log.error('Failed to scan extensions:', error);
        return [];
    }
}

/**
 * Check whether an extension name is currently loaded in the session.
 * @param {string} extensionName Extension display name
 */
function isExtensionInstalled(extensionName) {
    try {
        const loadedExtensions = getLoadedExtensions();
        return loadedExtensions.some(ext => ext.name === extensionName);
    } catch (error) {
        return false;
    }
}

export default {
    loadChromeExtensions,
    unloadChromeExtensions,
    getLoadedExtensions,
    installExtension,
    uninstallExtension,
    reloadExtensions,
    getExtensionsDirectory,
    getBundledExtensionsDirectory,
    ensureExtensionsDirectory,
    seedBundledExtensions,
    validateManifest,
    getExtensionInfo,
    formatFileSize,
    scanExtensions,
    installPluginFromZip,
    installPluginFromUrl
};
