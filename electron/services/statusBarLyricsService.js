import { ipcMain, nativeImage } from 'electron';

class StatusBarLyricsService {
    constructor() {
        this.mainWindow = null;
        this.store = null;
        this.tray = null;
        this.clearLyricsTimeout = null;
        this.lastStatusBarLyric = '';
        this.lastTrayUpdateTime = 0;
        this.lastTrayImageHash = '';
        this.TRAY_UPDATE_THROTTLE = 30; // 30ms throttle
        this.getTrayCallback = null;
        this.createTrayCallback = null;
    }

    init(mainWindow, store, getTrayCallback, createTrayCallback) {
        this.mainWindow = mainWindow;
        this.store = store;
        this.getTrayCallback = getTrayCallback;
        this.createTrayCallback = createTrayCallback;

        if (process.platform === 'darwin') {
            this.registerListeners();
            this.initializeOnStartup();  // Auto-initialize
        }
    }

    // Check whether status bar lyrics are enabled
    isStatusBarLyricsEnabled() {
        if (process.platform !== 'darwin') return false;

        const settings = this.store.get('settings') || {};
        return settings.statusBarLyrics === 'on';
    }

    registerListeners() {
        // Listen for images from renderer and update Tray
        ipcMain.on('update-statusbar-image', (event, dataUrl) => {
            this.handleUpdateImage(dataUrl);
        });
    }

    // Main window may be destroyed; check before accessing webContents to avoid "Object has been destroyed"
    getLiveWebContents() {
        const win = this.mainWindow;
        if (!win || win.isDestroyed()) return null;
        return win.webContents;
    }

    // Handle lyrics data (called from main.js)
    handleLyricsData(lyricsData) {
        if (!this.isStatusBarLyricsEnabled()) {
            this.handleDisabledState();
            return;
        }

        const currentLyric = lyricsData?.currentLyric || '';

        if (currentLyric) {
            // Has lyrics: clear debounce timer and update immediately
            if (this.clearLyricsTimeout) {
                clearTimeout(this.clearLyricsTimeout);
                this.clearLyricsTimeout = null;
            }

            if (currentLyric !== this.lastStatusBarLyric) {
                this.getLiveWebContents()?.send('generate-statusbar-image', currentLyric);
                this.lastStatusBarLyric = currentLyric;
            }
        } else {
            // No lyrics (interlude): start 5s debounce
            if (!this.clearLyricsTimeout && this.lastStatusBarLyric !== '') {
                this.clearLyricsTimeout = setTimeout(() => {
                    // Re-check settings in case feature was disabled during debounce
                    if (this.isStatusBarLyricsEnabled()) {
                        this.getLiveWebContents()?.send('generate-statusbar-image', ''); // Send empty string to trigger placeholder
                        this.lastStatusBarLyric = '';
                    }
                    this.clearLyricsTimeout = null;
                }, 5000);
            }
        }
    }

    // Clean up state when feature is disabled
    handleDisabledState() {
        if (this.lastStatusBarLyric !== '') {
            if (this.clearLyricsTimeout) {
                clearTimeout(this.clearLyricsTimeout);
                this.clearLyricsTimeout = null;
            }

            const tray = this.getTrayCallback ? this.getTrayCallback() : null;
            if (tray && !tray.isDestroyed()) {
                tray.setTitle(''); // Clear title text
                tray.setImage(nativeImage.createEmpty()); // Clear image

                // To restore the original Tray icon, createTray may need to be called here
                if (this.createTrayCallback && this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.createTrayCallback(this.mainWindow);
                }

                this.lastStatusBarLyric = '';
            }
        }
    }

    // Handle image update (update Tray)
    handleUpdateImage(dataUrl) {
        // Throttle
        const now = Date.now();
        if (now - this.lastTrayUpdateTime < this.TRAY_UPDATE_THROTTLE) return;

        // Tray check
        const tray = this.getTrayCallback ? this.getTrayCallback() : null;
        if (!tray || tray.isDestroyed()) return;

        if (!dataUrl) return;

        // Hash deduplication
        const imageHash = dataUrl.slice(-100);
        if (imageHash === this.lastTrayImageHash) return;

        this.lastTrayUpdateTime = now;
        this.lastTrayImageHash = imageHash;

        try {
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const image = nativeImage.createEmpty();

            // Logical size 200x22, actual buffer 400x44 (@2x)
            image.addRepresentation({
                scaleFactor: 2.0,
                width: 200,
                height: 22,
                buffer: buffer
            });

            image.setTemplateImage(true);

            if (tray && !tray.isDestroyed()) {
                tray.setImage(image);
                tray.setTitle(''); // Ensure no title text is shown
            }
        } catch (e) {
            console.error('[StatusBarService] Failed to set tray image:', e);
        }
    }

    // Initialize status bar lyrics on app startup (private)
    initializeOnStartup() {
        if (!this.isStatusBarLyricsEnabled()) {
            return;
        }

        // Wait for window ready, then trigger rendering
        this.mainWindow.webContents.once('did-finish-load', () => {
            setTimeout(() => {
                const webContents = this.getLiveWebContents();
                if (webContents) {
                    console.log('[StatusBarLyricsService] 启动时主动触发状态栏歌词渲染');
                    webContents.send('generate-statusbar-image', '');
                }
            }, 1000);
        });
    }

    // Clean up resources (called on app quit)
    cleanup() {
        // Clear timers
        if (this.clearLyricsTimeout) {
            clearTimeout(this.clearLyricsTimeout);
            this.clearLyricsTimeout = null;
        }

        // Clean up Tray (prevent flicker after quit)
        const tray = this.getTrayCallback ? this.getTrayCallback() : null;
        if (tray && !tray.isDestroyed()) {
            try {
                tray.setImage(nativeImage.createEmpty());
                tray.setTitle('');
                tray.destroy();
            } catch (e) {
                console.error('[StatusBarLyricsService] Error cleaning up tray:', e);
            }
        }
    }
}

export default new StatusBarLyricsService();
