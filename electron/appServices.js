import { app, ipcMain, BrowserWindow, screen, Tray, Menu, TouchBar, globalShortcut, dialog, shell, nativeImage } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import log from 'electron-log';
import Store from 'electron-store';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import fs from 'fs';
import { exec } from 'child_process';
import { checkForUpdates } from './services/updater.js';
import { Notification } from 'electron';
import { t } from './language/i18n.js';
import { bindExternalLinkHandler } from './services/externalLinkHandler.js';
import customTrayMenuService from './services/customTrayMenuService.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const store = new Store();
const { TouchBarLabel, TouchBarButton, TouchBarGroup, TouchBarSpacer } = TouchBar;
let mainWindow = null;
let apiProcess = null;
let tray = null;

// Create main window
export function createWindow() {
    const savedConfig = store.get('settings');
    const useNativeTitleBar = savedConfig?.nativeTitleBar === 'on' ? true : false;
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    const windowWidth = Math.min(1200, screenWidth * 0.8);
    const windowHeight = Math.min(938, screenHeight * 0.9);
    const lastWindowState = store.get('windowState') || {};

    let x = lastWindowState.x;
    let y = lastWindowState.y;
    let width = lastWindowState.width || windowWidth;
    let height = lastWindowState.height || windowHeight;

    width = Math.min(width, screenWidth);
    height = Math.min(height, screenHeight);

    const isValidPosition = x !== undefined && y !== undefined &&
        x >= 0 && x <= screenWidth &&
        y >= 0 && y <= screenHeight;

    if (!isValidPosition) {
        x = Math.floor((screenWidth - width) / 2);
        y = Math.floor((screenHeight - height) / 2);
    }

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        x: x,
        y: y,
        minWidth: 890,
        minHeight: 750,
        show: savedConfig?.startMinimized === 'on' ? false : true,
        frame: useNativeTitleBar,
        titleBarStyle: useNativeTitleBar ? 'default' : 'hiddenInset',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false, // Disable CORS and same-origin policy
            allowRunningInsecureContent: true, // Allow mixed content
            // Throttling on by default; disable when user enables the setting to fix Web Audio effects when backgrounded/minimized
            backgroundThrottling: savedConfig?.backgroundThrottling !== 'on',
            zoomFactor: 1.0
        },
        icon: getIconPath('icon.ico')
    });
    bindExternalLinkHandler(mainWindow);

    // Remove default menu to prevent Alt from opening menu bar with native window decorations
    mainWindow.setMenu(null);

    if (store.get('maximize')) {
        mainWindow.maximize();
    }

    if (isDev) {
        mainWindow.loadURL('http://localhost:8080');
        mainWindow.webContents.openDevTools();
    } else {
        if (savedConfig?.networkMode == 'devnet') { // Dev network
            mainWindow.loadURL('http://localhost:8080');
        } else if (savedConfig?.networkMode == 'testnet') { // Test network
            mainWindow.loadURL('https://app.testnet.music.moekoe.cn');
        } else { // Main network
            mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        }
    }

    mainWindow.webContents.on('dom-ready', () => {
        console.log('DOM Ready');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });

    mainWindow.once('ready-to-show', () => {
        if (savedConfig?.startMinimized === 'on') {
            mainWindow.hide();
        }
    });

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Page Loaded Successfully');
        mainWindow.webContents.insertCSS('::-webkit-scrollbar { display: none; }');
        if (!store.get('disclaimerAccepted')) {
            mainWindow.webContents.send('show-disclaimer');
        }
        mainWindow.webContents.send('version', app.getVersion());
    });

    mainWindow.on('close', (event) => {
        const savedConfig = store.get('settings');
        if (savedConfig?.minimizeToTray === 'off') {
            app.isQuitting = true;
            app.quit();
        }
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    if (process.platform === 'win32') {
        setThumbarButtons(mainWindow);
    }

    if (savedConfig?.desktopLyrics === 'on') {
        createLyricsWindow();
    }
    return mainWindow;
}

let lyricsWindow;

const persistLyricsWindowBounds = () => {
    if (!lyricsWindow || lyricsWindow.isDestroyed()) return;
    const { x, y, width, height } = lyricsWindow.getBounds();
    store.set('lyricsWindowPosition', { x, y });
    store.set('lyricsWindowSize', { width, height });
};

export function createLyricsWindow() {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = Math.floor(screenWidth * 0.7);
    const windowHeight = 128;
    const legacyWindowHeight = 200;

    const savedLyricsPosition = store.get('lyricsWindowPosition') || {};
    const savedLyricsSize = store.get('lyricsWindowSize') || {
        width: windowWidth,
        height: windowHeight
    };

    let x = savedLyricsPosition.x;
    let y = savedLyricsPosition.y;
    let width = savedLyricsSize.width || windowWidth;
    let height = savedLyricsSize.height || windowHeight;
    if (height === legacyWindowHeight) height = windowHeight;

    // Clamp window size to screen bounds
    width = Math.min(width, screenWidth);
    height = Math.min(height, screenHeight);

    // Check whether position is valid
    const isValidPosition = x !== undefined && y !== undefined &&
        x >= 0 && x <= screenWidth &&
        y >= 0 && y <= screenHeight;

    // Use default position if saved position is invalid
    if (!isValidPosition) {
        x = Math.floor((screenWidth - width) / 2);
        y = screenHeight - height;
    }

    lyricsWindow = new BrowserWindow({
        width: width,
        height: height,
        x: x,
        y: y,
        minWidth: 800,
        minHeight: windowHeight,
        maxWidth: screenWidth,
        maxHeight: screenHeight,
        alwaysOnTop: true,
        frame: false,
        transparent: true,
        resizable: true,
        skipTaskbar: true,
        hasShadow: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false, // Disable CORS and same-origin policy
            allowRunningInsecureContent: true, // Allow mixed content
            backgroundThrottling: false,
            zoomFactor: 1.0
        }
    });

    lyricsWindow.on('resize', persistLyricsWindowBounds);
    lyricsWindow.on('move', persistLyricsWindowBounds);
    mainWindow.lyricsWindow = lyricsWindow;
    lyricsWindow.on('closed', () => {
        mainWindow.lyricsWindow = null;
    });
    if (isDev) {
        lyricsWindow.loadURL('http://localhost:8080/#/lyrics');
        lyricsWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        lyricsWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
            hash: 'lyrics'
        });
    }



    // Set always-on-top level
    lyricsWindow.setAlwaysOnTop(true, 'screen-saver');
    lyricsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Enable window transparency
    lyricsWindow.setBackgroundColor('#00000000');
}

export function createMvWindow() {
    const { screenWidth, screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    return new BrowserWindow({
        width: Math.min(screenWidth * 0.8, 1280),
        height: Math.min(screenHeight * 0.8, 720),
        frame: false,
        transparent: true,
        show: false,
        titleBarStyle: 'hiddenInset',
        autoHideMenuBar: true,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false, // Disable CORS and same-origin policy
            allowRunningInsecureContent: true, // Allow mixed content
            zoomFactor: 1.0,
            devTools: isDev
        },
        icon: getIconPath('icon.ico')
    });
}

const getIconPath = (iconName, subPath = '') => path.join(
    isDev ? __dirname + '/../build/icons' : process.resourcesPath + '/icons',
    subPath,
    iconName
);

export function getTray() {
    return tray;
}

// Create tray icon and menu
export function createTray(mainWindow, title = '') {
    if (tray && title) {
        tray.setToolTip(title);
        return tray;
    }

    let trayIconName
    if (process.platform === 'linux') {
        trayIconName = 'linux-icon.png'
    } else if (process.platform === 'darwin') {
        trayIconName = 'tray-icon.png'
    } else {
        trayIconName = 'tray-icon.ico'
    }

    tray = new Tray(getIconPath(trayIconName));
    tray.setToolTip('Muses');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: t('show-hide'),
            accelerator: 'CmdOrCtrl+Shift+S',
            icon: getIconPath('show.png', 'menu'),
            click: () => {
                if (mainWindow) {
                    if (mainWindow.isVisible()) {
                        mainWindow.hide();
                    } else {
                        mainWindow.show();
                    }
                }
            }
        },
        { type: 'separator' },
        {
            label: t('prev-track'),
            icon: getIconPath('prev.png', 'menu'),
            accelerator: 'Alt+CommandOrControl+Left',
            click: () => {
                mainWindow.webContents.send('play-previous-track');
            }
        },
        {
            label: t('pause'),
            accelerator: 'Alt+CommandOrControl+Space',
            icon: getIconPath('play.png', 'menu'),
            click: () => {
                mainWindow.webContents.send('toggle-play-pause');
            }
        },
        {
            label: t('next-track'),
            accelerator: 'Alt+CommandOrControl+Right',
            icon: getIconPath('next.png', 'menu'),
            click: () => {
                mainWindow.webContents.send('play-next-track');
            }
        },
        { type: 'separator' },
        {
            label: t('project-home'),
            icon: getIconPath('home.png', 'menu'),
            click: () => {
                shell.openExternal('https://Music.MoeKoe.cn');
            }
        },
        {
            label: t('report-bug'),
            icon: getIconPath('bug.png', 'menu'),
            click: () => {
                shell.openExternal('https://github.com/iAJue/MoeKoeMusic/issues');
            }
        },
        {
            label: t('check-updates'),
            icon: getIconPath('update.png', 'menu'),
            click: () => {
                checkForUpdates(false);
            }
        },
        {
            label: t('restart-app'),
            icon: getIconPath('restart.png', 'menu'),
            click: () => {
                app.relaunch();
                app.isQuitting = true;
                app.quit();
            }
        },
        { type: 'separator' },
        {
            label: t('quit'),
            accelerator: 'CmdOrCtrl+Q',
            icon: getIconPath('quit.png', 'menu'),
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    const useCustomTrayMenu = !!mainWindow && store.get('settings')?.customTrayMenu === 'custom';
    const useLinuxCustomTrayMenu = process.platform === 'linux' && useCustomTrayMenu;
    switch (process.platform) {
        case 'linux':
            if (useLinuxCustomTrayMenu) {
                tray.on('click', () => {
                    void customTrayMenuService.toggle();
                });
                break;
            }
            customTrayMenuService.hide();
            tray.setContextMenu(contextMenu);
            break;
        default:
            tray.on('right-click', () => {
                if (useCustomTrayMenu) {
                    void customTrayMenuService.toggle();
                    return;
                }
                customTrayMenuService.hide();
                tray.popUpContextMenu(contextMenu);
            });
    }
    if (!useLinuxCustomTrayMenu) {
        tray.on('click', () => {
            customTrayMenuService.hide();
            if (!mainWindow.isVisible()) {
                mainWindow.show();
            } else if (!mainWindow.isFocused()) {
                mainWindow.show();
                mainWindow.focus();
            } else {
                mainWindow.hide(); // Unlikely to ever run
            }
        });
        tray.on('double-click', () => {
            customTrayMenuService.hide();
            mainWindow.show();
        });
    }
    return tray;
}

// Create TouchBar
export function createTouchBar(mainWindow) {
    const ICON_SIZE = 16;

    let isPlaying = false;

    const iconPath = (iconName) => {
        const originalIcon = nativeImage.createFromPath(
            getIconPath(`${iconName}.png`)
        );

        // Resize icon
        return originalIcon.resize({
            width: ICON_SIZE,
            height: ICON_SIZE,
        });
    };

    const prevButton = new TouchBarButton({
        icon: iconPath("prev"),
        iconPosition: "center",
        click: () => {
            mainWindow.webContents.send("play-previous-track");
        },
    });

    const playPauseButton = new TouchBarButton({
        icon: iconPath(isPlaying ? "pause" : "play"),
        iconPosition: "center",
        click: () => {
            isPlaying = !isPlaying;
            playPauseButton.icon = iconPath(isPlaying ? "pause" : "play");
            mainWindow.webContents.send("toggle-play-pause");
        },
    });

    const nextButton = new TouchBarButton({
        icon: iconPath("next"),
        iconPosition: "center",
        click: () => {
            mainWindow.webContents.send("play-next-track");
        },
    });

    // Lyrics
    const lyricsLabel = new TouchBarLabel({
        label: t('no-lyrics'),
        textColor: "#FFFFFF",
    });

    const touchBar = new TouchBar({
        items: [
            prevButton,
            new TouchBarSpacer({ size: "small" }),
            playPauseButton,
            new TouchBarSpacer({ size: "small" }),
            nextButton,
            new TouchBarSpacer({ size: "flexible" }),
            lyricsLabel,
            new TouchBarSpacer({ size: "flexible" }),
        ],
    });

    mainWindow.setTouchBar(touchBar);

    // Listen for playback state changes
    ipcMain.on("play-pause-action", (event, playing) => {
        isPlaying = playing;
        playPauseButton.icon = iconPath(isPlaying ? "pause" : "play");
    });

    // Listen for lyrics updates
    ipcMain.on("update-current-lyrics", (event, currentLyric) => {
        if (currentLyric) {
            lyricsLabel.label = currentLyric;
        }
    });

    return touchBar;
}

const API_PORT = 6521;

async function isApiAlreadyRunning(port = API_PORT) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 800);
        const response = await fetch(`http://127.0.0.1:${port}/`, {
            signal: controller.signal
        });
        clearTimeout(timer);
        return response.ok;
    } catch {
        return false;
    }
}

// Start API server
export function startApiServer() {
    return new Promise(async (resolve, reject) => {
        let settled = false;
        const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            fn(value);
        };

        // Dev (vite/electron) and packaged builds route renderer requests through the
        // IPC bridge instead of the local HTTP API server. Never bind the port so the
        // packaged app cannot conflict with other services listening on 127.0.0.1:6521.
        if (isDev || app.isPackaged) {
            return finish(resolve);
        }

        // Reuse existing API when dev leftovers or another instance already holds the port
        if (await isApiAlreadyRunning()) {
            log.info(`检测到本地 API 已在 ${API_PORT} 运行，跳过启动`);
            return finish(resolve);
        }

        let apiPath = '';
        switch (process.platform) {
            case 'win32':
                apiPath = path.join(process.resourcesPath, '../api', 'app_win.exe');
                break;
            case 'darwin':
                apiPath = path.join(process.resourcesPath, '../api', 'app_macos');
                break;
            case 'linux':
                apiPath = path.join(process.resourcesPath, '../api', 'app_linux');
                break;
            default:
                finish(reject, new Error(`Unsupported platform: ${process.platform}`));
                return;
        }

        log.info(`API路径: ${apiPath}`);

        if (!fs.existsSync(apiPath)) {
            const error = new Error(`API可执行文件未找到：${apiPath}`);
            log.error(error.message);
            finish(reject, error);
            return;
        }

        const savedConfig = store.get('settings') || {};
        const proxy = savedConfig?.proxy;
        const proxyUrl = savedConfig?.proxyUrl;
        const dataSource = savedConfig?.dataSource || 'concept';

        const Args = [];
        if (dataSource === 'concept') {
            Args.push('--platform=lite');
            log.info('API data source: concept (lite mode)');
        }
        if (proxy === 'on' && proxyUrl) {
            const proxyAddress = String(proxyUrl).trim();
            if (proxyAddress) {
                Args.push(`--proxy=${proxyAddress}`);
                log.info(`API proxy enabled: ${proxyAddress}`);
            }
        }
        Args.push(`--port=${API_PORT}`);

        let stderrBuffer = '';
        apiProcess = spawn(apiPath, Args, { windowsHide: true });

        const startupTimer = setTimeout(async () => {
            if (settled) return;
            if (await isApiAlreadyRunning()) {
                log.info('API 启动超时，但端口已可访问，继续启动应用');
                finish(resolve);
                return;
            }
            finish(reject, new Error(stderrBuffer.trim() || 'API 启动超时'));
        }, 12000);

        const clearStartupTimer = () => clearTimeout(startupTimer);

        apiProcess.stdout.on('data', (data) => {
            const text = data.toString();
            log.info(`API输出: ${text}`);
            if (text.includes('running')) {
                clearStartupTimer();
                finish(resolve);
            }
        });

        apiProcess.stderr.on('data', async (data) => {
            const text = data.toString();
            stderrBuffer += text;
            log.error(`API 错误: ${text}`);

            // If port is in use but a working service exists, reuse it instead of failing
            if (text.includes('EADDRINUSE')) {
                if (await isApiAlreadyRunning()) {
                    log.info(`端口 ${API_PORT} 已被可用 API 占用，复用现有服务`);
                    clearStartupTimer();
                    try {
                        if (apiProcess && !apiProcess.killed) {
                            apiProcess.kill();
                        }
                    } catch (_) { /* ignore */ }
                    apiProcess = null;
                    finish(resolve);
                }
            }
        });

        apiProcess.on('close', (code) => {
            log.info(`API 关闭，退出码: ${code}`);
            clearStartupTimer();
            if (!settled) {
                if (String(stderrBuffer).includes('EADDRINUSE')) {
                    isApiAlreadyRunning().then((ok) => {
                        if (ok) finish(resolve);
                        else finish(reject, new Error(`端口 ${API_PORT} 被占用，且现有服务不可用`));
                    });
                    return;
                }
                finish(reject, new Error(stderrBuffer.trim() || `API 异常退出，退出码: ${code}`));
            }
        });

        apiProcess.on('error', (error) => {
            log.error('启动 API 失败:', error);
            clearStartupTimer();
            finish(reject, error);
        });
    });
}

// Stop API server
export function stopApiServer() {
    if (apiProcess) {
        process.kill(apiProcess.pid, 'SIGKILL');
        apiProcess = null;
    }
}

// Register global shortcuts
export function registerShortcut() {
    try {
        const settings = store.get('settings');
        globalShortcut.unregisterAll();
        let clickFunc = () => { app.isQuitting = true; };
        if (process.platform === 'darwin') {
            app.on('before-quit', clickFunc);
        } else {
            clickFunc = () => {
                app.isQuitting = true;
                app.quit();
            };
            if (settings?.shortcuts?.quitApp) {
                globalShortcut.register(settings?.shortcuts?.quitApp, clickFunc);
            } else if (!settings?.shortcuts) {
                globalShortcut.register('CmdOrCtrl+Q', clickFunc);
            }
        }

        clickFunc = () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                }
            }
        }
        if (settings?.shortcuts?.mainWindow) {
            globalShortcut.register(settings?.shortcuts?.mainWindow, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('CmdOrCtrl+Shift+S', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('play-previous-track');
        if (settings?.shortcuts?.prevTrack) {
            globalShortcut.register(settings?.shortcuts?.prevTrack, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+Left', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('play-next-track');
        if (settings?.shortcuts?.nextTrack) {
            globalShortcut.register(settings?.shortcuts?.nextTrack, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+Right', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('volume-up');
        if (settings?.shortcuts?.volumeUp) {
            globalShortcut.register(settings?.shortcuts?.volumeUp, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+Up', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('volume-down');
        if (settings?.shortcuts?.volumeDown) {
            globalShortcut.register(settings?.shortcuts?.volumeDown, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+Down', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('toggle-play-pause');
        if (settings?.shortcuts?.playPause) {
            globalShortcut.register(settings?.shortcuts?.playPause, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+Space', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('toggle-mute');
        if (settings?.shortcuts?.mute) {
            globalShortcut.register(settings?.shortcuts?.mute, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+M', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('toggle-like');
        if (settings?.shortcuts?.like) {
            globalShortcut.register(settings?.shortcuts?.like, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+L', clickFunc);
        }

        clickFunc = () => mainWindow.webContents.send('toggle-mode');
        if (settings?.shortcuts?.mode) {
            globalShortcut.register(settings?.shortcuts?.mode, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+CommandOrControl+P', clickFunc);
        }

        clickFunc = () => {
            if (mainWindow.lyricsWindow) {
                mainWindow.lyricsWindow.close();
                mainWindow.lyricsWindow = null;
                new Notification({
                    title: t('desktop-lyrics-closed'),
                    icon: getIconPath('logo.png')
                }).show();
                syncDesktopLyricsSetting('off');
            } else {
                createLyricsWindow();
                syncDesktopLyricsSetting('on');
            }
        }
        if (settings?.shortcuts?.toggleDesktopLyrics) {
            globalShortcut.register(settings.shortcuts.toggleDesktopLyrics, clickFunc);
        } else if (!settings?.shortcuts) {
            globalShortcut.register('Alt+Ctrl+D', clickFunc);
        }
    } catch {
        dialog.showMessageBox({
            type: 'error',
            title: t('hint'),
            message: t('shortcut-failed'),
            buttons: [t('ok')]
        });
    }
}

const syncDesktopLyricsSetting = (value) => {
    const settings = store.get('settings') || {};
    store.set('settings', {
        ...settings,
        desktopLyrics: value
    });
};

// Play startup greeting sound
export function playStartupSound() {
    const savedConfig = store.get('settings');
    if (!savedConfig || (savedConfig['greetings'] !== 'on' && savedConfig['greetings'] !== 'null')) {
        return;
    }
    const audioFiles = [
        '/assets/sound/yise-jp.mp3',
        '/assets/sound/qiqi-jp.mp3',
        '/assets/sound/qiqi-zh.mp3'
    ];
    const randomIndex = Math.floor(Math.random() * audioFiles.length);
    const soundPath = isDev
        ? path.join(__dirname, '..', 'public', audioFiles[randomIndex])
        : path.join(process.resourcesPath, 'public', audioFiles[randomIndex]);
    try {
        switch (process.platform) {
            case 'win32':
                const escapedPath = soundPath.replace(/'/g, "''");
                exec(`powershell -c "Add-Type -AssemblyName PresentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open('${escapedPath}'); $player.Play(); Start-Sleep -s 3; $player.Stop()"`);
                break;
            case 'darwin':
                exec(`afplay "${soundPath}"`);
                break;
            case 'linux':
                exec(`paplay "${soundPath}"`, (error) => {
                    if (error) {
                        exec(`play "${soundPath}"`);
                    }
                });
                break;
        }
    } catch (error) {
        log.error('播放启动问候语失败:', error);
    }
}

// Set taskbar thumbnail toolbar buttons
export function setThumbarButtons(mainWindow, isPlaying = false) {
    const buttons = [
        {
            tooltip: t('prev-track'),
            icon: getIconPath('prev.png'),
            click: () => {
                mainWindow.webContents.send('play-previous-track');
                setThumbarButtons(mainWindow, true);
            }
        },
        {
            tooltip: t('pause'),
            icon: getIconPath('pause.png'),
            click: () => {
                mainWindow.webContents.send('toggle-play-pause');
                setThumbarButtons(mainWindow, false);
            }
        },
        {
            tooltip: t('next-track'),
            icon: getIconPath('next.png'),
            click: () => {
                mainWindow.webContents.send('play-next-track');
                setThumbarButtons(mainWindow, true);
            }
        }
    ];

    if (!isPlaying) {
        buttons[1] = {
            tooltip: t('play'),
            icon: getIconPath('play.png'),
            click: () => {
                mainWindow.webContents.send('toggle-play-pause');
                setThumbarButtons(mainWindow, true);
            }
        };
    }

    mainWindow.setThumbarButtons(buttons);
}

// Custom protocol handling
let hash = "";
let listid = "";
let teamcode = "";
let protocolMainWindow = null;

// Register custom protocol
export function registerProtocolHandler(mainWindow) {
    const PROTOCOL = "muses";

    // Keep mainWindow reference
    if (mainWindow) {
        protocolMainWindow = mainWindow;
    }

    // Register protocol handler
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath);

    // Handle launch argv
    handleArgv(process.argv);

    // Handle second-instance launch argv
    app.on('second-instance', (event, commandLine) => {
        if (protocolMainWindow) {
            if (protocolMainWindow.isMinimized()) protocolMainWindow.restore();
            protocolMainWindow.show();
            protocolMainWindow.focus();
            handleArgv(commandLine);
        }
    });

    // macOS: handle open-url event
    if (process.platform === 'darwin') {
        app.on('open-url', (event, urlStr) => {
            event.preventDefault();
            handleUrl(urlStr);
        });
    }

    return {
        getHash: () => hash,
        handleProtocolArgv: handleArgv
    };
}

// Parse command-line arguments
function handleArgv(argv) {
    const PROTOCOL = "muses";
    const prefix = `${PROTOCOL}:`;
    const url = argv.find(arg => arg.startsWith(prefix));
    if (url) handleUrl(url);
}

// Handle protocol URL
function handleUrl(url) {
    const urlObj = new URL(url);

    // Extract params and update globals
    hash = urlObj.searchParams.get("hash") || "";
    listid = urlObj.searchParams.get("listid") || "";
    teamcode = urlObj.searchParams.get("code") || "";

    // Decide what to send to renderer based on path and params
    if (protocolMainWindow && protocolMainWindow.webContents) {
        // Send all params as one payload
        protocolMainWindow.webContents.send('url-params', {
            hash,
            listid,
            teamcode,
            urlPath: urlObj.pathname.substring(1) // Strip leading slash
        });
    }
}

// If launched from URL with hash params, send after page load completes
export function sendHashAfterLoad(mainWindow) {
    if (mainWindow) {
        protocolMainWindow = mainWindow;
    }

    if ((hash || listid || teamcode) && protocolMainWindow) {
        protocolMainWindow.webContents.on('did-finish-load', () => {
            setTimeout(() => {
                protocolMainWindow.webContents.send('url-params', {
                    hash,
                    listid,
                    teamcode,
                    urlPath: 'share'
                });
            }, 1000);
        });
    }
}

