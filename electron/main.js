import { app, ipcMain, globalShortcut, dialog, Notification, shell, session, powerSaveBlocker, nativeImage, screen } from 'electron';
import {
    createWindow, createTray, createTouchBar, startApiServer,
    stopApiServer, registerShortcut,
    playStartupSound, createLyricsWindow, setThumbarButtons,
    registerProtocolHandler, sendHashAfterLoad, getTray, createMvWindow
} from './appServices.js';
import { initializeExtensions, cleanupExtensions } from './extensions/extensions.js';
import { setupAutoUpdater, startUpdateDownload } from './services/updater.js';
import apiService from './services/apiService.js';
import { registerMusicApiBridge, unregisterMusicApiBridge } from './musicApiBridge.js';
import statusBarLyricsService from './services/statusBarLyricsService.js';
import customTrayMenuService from './services/customTrayMenuService.js';
import { setupDesktopShortcutIcon } from './services/desktopShortcutIcon.js';
import { openLogPath, exportLog } from './services/logHelper.js';
import {
    isSystemVolumeSupported,
    getSystemVolume,
    setSystemVolume,
    setSystemMuted
} from './services/systemVolume.js';
import Store from 'electron-store';
import path from 'path';
import { fileURLToPath } from 'url';
import { t } from './language/i18n.js';

let mainWindow = null;
let blockerId = null;
const store = new Store();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
} else {
    let protocolHandler;
    app.on('second-instance', (event, commandLine) => {
        if (!protocolHandler) {
            protocolHandler = registerProtocolHandler(null);
        }
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
        protocolHandler.handleProtocolArgv(commandLine);
    });
}

app.on('ready', () => {
    // Register the renderer-to-main music API bridge before any window loads,
    // so the renderer can route requests via IPC instead of the local HTTP server.
    registerMusicApiBridge();
    startApiServer().then(() => {
        try {
            mainWindow = createWindow();
            createTray(mainWindow);
            customTrayMenuService.init(() => mainWindow, getTray);

            // Initialize status bar lyrics service
            statusBarLyricsService.init(mainWindow, store, getTray, createTray);

            if (process.platform === "darwin" && store.get('settings')?.touchBar == 'on') createTouchBar(mainWindow);
            playStartupSound();
            registerShortcut();
            setupAutoUpdater(mainWindow);
            apiService.init(mainWindow);
            registerProtocolHandler(mainWindow);
            sendHashAfterLoad(mainWindow);
            void initializeExtensions();
            setupDesktopShortcutIcon();
        } catch (error) {
            console.log('初始化应用时发生错误:', error);
            createTray(null);
            dialog.showMessageBox({
                type: 'error',
                title: t('error'),
                message: t('init-error'),
                buttons: [t('ok')]
            }).then(result => {
                if (result.response === 0) {
                    app.isQuitting = true;
                    app.quit();
                }
            });
        }
    }).catch((error) => {
        console.log('API 服务启动失败:', error);
        createTray(null);
        dialog.showMessageBox({
            type: 'error',
            title: t('error'),
            message: t('api-error'),
            buttons: [t('ok')]
        }).then(result => {
            if (result.response === 0) {
                app.isQuitting = true;
                app.quit();
            }
            return;
        });
    });
});

const settings = store.get('settings');
if (settings?.gpuAcceleration === 'on') {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('enable-transparent-visuals');
    app.commandLine.appendSwitch('disable-gpu-compositing');
}

if (settings?.preventAppSuspension === 'on') {
    blockerId = powerSaveBlocker.start('prevent-display-sleep');
}

if (settings?.highDpi === 'on') {
    app.commandLine.appendSwitch('high-dpi-support', '1');
    app.commandLine.appendSwitch('force-device-scale-factor', settings?.dpiScale || '1');
}

if (settings?.apiMode === 'on') {
    apiService.start();
}

// About to quit
app.on('before-quit', () => {
    if (mainWindow && !mainWindow.isMaximized()) {
        const windowBounds = mainWindow.getBounds();
        store.set('windowState', windowBounds);
    }
    if (blockerId !== null) {
        powerSaveBlocker.stop(blockerId);
    }

    // Clean up status bar lyrics service
    setImmediate(() => {
        statusBarLyricsService.cleanup();
        customTrayMenuService.cleanup();

        stopApiServer();
        apiService.stop();
        unregisterMusicApiBridge();
        cleanupExtensions();
        app.exit(0);
    });
});
// Close all windows
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.isQuitting = true;
        app.quit(); // On non-macOS, quit after all windows are closed
    }
});
// Dock/taskbar icon clicked
app.on('activate', () => {
    if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
    } else if (!mainWindow) {
        mainWindow = createWindow();
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Unhandled Exception:', error);
});

// Listen for disclaimer response from renderer
ipcMain.on('disclaimer-response', (event, accepted) => {
    if (accepted) {
        store.set('disclaimerAccepted', true);
    } else {
        app.isQuitting = true;
        app.quit();
    }
});

ipcMain.on('window-control', (event, action) => {
    switch (action) {
        case 'close':
            if (store.get('settings')?.minimizeToTray === 'off') {
                app.isQuitting = true;
                app.quit();
            } else {
                mainWindow.close();
            }
            break;
        case 'minimize':
            mainWindow.minimize();
            break;
        case 'maximize':
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
                store.set('maximize', false);
            } else {
                mainWindow.maximize();
                store.set('maximize', true);
            }
            break;
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
ipcMain.on('save-settings', (event, settings) => {
    store.set('settings', settings);
    if (['on', 'off'].includes(settings?.autoStart)) {
        app.setLoginItemSettings({
            openAtLogin: settings?.autoStart === 'on',
            path: app.getPath('exe'),
        });
    }
});
ipcMain.on('clear-settings', (event) => {
    store.clear();
    session.defaultSession.clearCache();
    session.defaultSession.clearStorageData();
    const userDataPath = app.getPath('userData');
    shell.openPath(userDataPath);
});
ipcMain.on('custom-shortcut', (event) => {
    registerShortcut();
});

ipcMain.on('lyrics-data', (event, lyricsData) => {
    const lyricsWindow = mainWindow?.lyricsWindow;
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
        lyricsWindow.webContents.send('lyrics-data', lyricsData);
    }

    // Status bar lyrics service (macOS only)
    if (process.platform === 'darwin') {
        statusBarLyricsService.handleLyricsData(lyricsData);
    }
});

ipcMain.on('server-lyrics', (event, lyricsData) => {
    apiService.updateLyrics(lyricsData);
});

// Listen for desktop lyrics actions
ipcMain.on('desktop-lyrics-action', (event, action) => {
    switch (action) {
        case 'previous-song':
            mainWindow.webContents.send('play-previous-track');
            break;
        case 'next-song':
            mainWindow.webContents.send('play-next-track');
            break;
        case 'toggle-play':
            mainWindow.webContents.send('toggle-play-pause');
            break;
        case 'close-lyrics':
            const lyricsWindow = mainWindow.lyricsWindow;
            if (lyricsWindow) {
                lyricsWindow.close();
                new Notification({
                    title: t('desktop-lyrics-closed'),
                    icon: path.join(__dirname, '../build/icons/logo.png')
                }).show();
                mainWindow.lyricsWindow = null;
            }
            syncDesktopLyricsSetting('off');
            break;
        case 'display-lyrics':
            if (!mainWindow.lyricsWindow) createLyricsWindow();
            syncDesktopLyricsSetting('on');
            break;
    }
});

const syncDesktopLyricsSetting = (value) => {
    const settings = store.get('settings') || {};
    store.set('settings', {
        ...settings,
        desktopLyrics: value
    });
};

ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
    const lyricsWindow = mainWindow.lyricsWindow;
    if (lyricsWindow) {
        lyricsWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
});

ipcMain.on('window-drag', (event, { x, y, width, height }) => {
    const lyricsWindow = mainWindow.lyricsWindow;
    if (!lyricsWindow) return
    const bounds = lyricsWindow.getBounds();
    const nextBounds = {
        x: Math.round(x ?? bounds.x),
        y: Math.round(y ?? bounds.y),
        width: Math.round(width ?? bounds.width),
        height: Math.round(height ?? bounds.height)
    };
    lyricsWindow.setBounds(nextBounds)
    store.set('lyricsWindowPosition', { x: nextBounds.x, y: nextBounds.y });
    store.set('lyricsWindowSize', { width: nextBounds.width, height: nextBounds.height });
})

ipcMain.on('lyrics-window-fixed-size', (event, { width, height, fixed }) => {
    const lyricsWindow = mainWindow.lyricsWindow;
    if (!lyricsWindow) return
    if (fixed) {
        lyricsWindow.setMaximumSize(Math.round(width), Math.round(height));
        return
    }
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    lyricsWindow.setMaximumSize(screenWidth, screenHeight);
})

ipcMain.handle('lyrics-window-pointer-state', () => {
    const lyricsWindow = mainWindow.lyricsWindow;
    if (!lyricsWindow) return null
    return {
        cursor: screen.getCursorScreenPoint(),
        bounds: lyricsWindow.getBounds()
    };
})

ipcMain.on('play-pause-action', (event, playing, currentTime) => {
    const lyricsWindow = mainWindow.lyricsWindow;
    if (lyricsWindow) {
        lyricsWindow.webContents.send('playing-status', playing);
    }
    apiService.updatePlayerState({ isPlaying: playing, currentTime: currentTime });
    setThumbarButtons(mainWindow, playing);
    customTrayMenuService.updatePlaybackState(playing, currentTime);
})

ipcMain.on('open-url', (event, url) => {
    shell.openExternal(url);
})

ipcMain.on('set-tray-title', (event, title) => {
    createTray(mainWindow, t('now-playing') + title);
    mainWindow.setTitle(title);
})


ipcMain.handle('open-mv-window', (e, url) => {
    return (async () => {
        const mvWindow = createMvWindow();
        try {
            await mvWindow.loadURL(url);
            mvWindow.show();
            return true;
        } catch (error) {
            console.error('[open-mv-window] loadURL failed:', url, error);
            try {
                mvWindow.close();
            } catch {}
            throw error;
        }
    })();
});

ipcMain.handle('open-log-path', async (e) => {
    try {
        const result = await openLogPath();
        return result ? { error: result } : { success: true };
    }
    catch (err) { return { error: err }; }
});

ipcMain.handle('export-log', async (e) => {
    try { return await exportLog(); }
    catch (err) { return { error: err }; }
});

ipcMain.handle('start-update-download', async () => {
    return await startUpdateDownload();
});

ipcMain.handle('system-volume-supported', () => isSystemVolumeSupported());

ipcMain.handle('get-system-volume', async () => {
    try {
        return { success: true, ...(await getSystemVolume()) };
    } catch (error) {
        return { success: false, error: error?.message || String(error) };
    }
});

ipcMain.handle('set-system-volume', async (_event, volume) => {
    try {
        return { success: true, ...(await setSystemVolume(volume)) };
    } catch (error) {
        return { success: false, error: error?.message || String(error) };
    }
});

ipcMain.handle('set-system-muted', async (_event, muted) => {
    try {
        return { success: true, ...(await setSystemMuted(Boolean(muted))) };
    } catch (error) {
        return { success: false, error: error?.message || String(error) };
    }
});
