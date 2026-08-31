// Unified entry for the extension system.
import extensionManager from './extensionManager.js';
import { registerExtensionIPC, unregisterExtensionIPC } from './extensionIPC.js';
import nativeHostManager from './nativeHostManager.js';
import log from 'electron-log';

/**
 * Initialize the extension system.
 */
export async function initializeExtensions() {
    try {
        extensionManager.ensureExtensionsDirectory();

        // Sync bundled presets into userData (production only).
        extensionManager.seedBundledExtensions();
        
        registerExtensionIPC();
        
        await extensionManager.loadChromeExtensions();

        syncNativeHosts();
        
        return { success: true };
    } catch (error) {
        log.error('Failed to initialize extension system:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Tear down the extension system.
 */
export async function cleanupExtensions() {
    try {
        // Stop native hosts first and wait for exit, then unload extensions.
        // Order matters: unloading first closes WebSocket and may let hosts exit on their own,
        // but awaiting stopAll ensures restartExtensions does not start new hosts while old ones remain.
        await nativeHostManager.stopAll();
        extensionManager.unloadChromeExtensions();
        
        unregisterExtensionIPC();
        
        return { success: true };
    } catch (error) {
        log.error('Failed to clean up extension system:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Restart the extension system.
 */
export async function restartExtensions() {
    try {
        const cleanupResult = await cleanupExtensions();
        if (!cleanupResult.success) {
            return cleanupResult;
        }
        
        const initResult = await initializeExtensions();
        return initResult;
    } catch (error) {
        log.error('Failed to restart extension system:', error);
        return { success: false, error: error.message };
    }
}

function syncNativeHosts() {
    try {
        nativeHostManager.syncExtensions(
            extensionManager.getLoadedExtensions(),
            extensionManager.scanExtensions()
        );
        nativeHostManager.startAuthorizedAutoHosts();
    } catch (error) {
        log.error('Failed to sync native host index:', error);
    }
}

export {
    extensionManager,
    registerExtensionIPC,
    unregisterExtensionIPC
};

export default {
    initializeExtensions,
    cleanupExtensions,
    restartExtensions,
    extensionManager,
    registerExtensionIPC,
    unregisterExtensionIPC
};
