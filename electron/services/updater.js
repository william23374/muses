import { app, dialog } from 'electron';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import { t } from '../language/i18n.js';

let silentCheck = false;
let suppressUpdateAvailableDialog = 0;
autoUpdater.autoDownload = false; // Auto-download updates
autoUpdater.autoInstallOnAppQuit = false; // Auto-install updates on quit
// Simulate packaged state in development
Object.defineProperty(app, 'isPackaged', {
    get() {
        return true;
    }
});

function showUpdateUnavailableMessage() {
    dialog.showMessageBox({
        type: 'info',
        title: t('update-hint'),
        message: t('non-update'),
        buttons: [t('ok')]
    });
}
async function checkForUpdatesSilently() {
    suppressUpdateAvailableDialog += 1;
    try {
        return await autoUpdater.checkForUpdates();
    } finally {
        suppressUpdateAvailableDialog -= 1;
    }
}

// Configure update feed URL
export function setupAutoUpdater(mainWindow) {
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'MoeKoeMusic',
        repo: 'MoeKoeMusic',
        releaseType: 'release'
    });

    autoUpdater.channel = 'latest';
    // Update check error
    autoUpdater.on('error', (error) => {
        console.error('Update check failed:', error.message);
        mainWindow.webContents.send('update-error', {
            message: error.message
        });
        dialog.showMessageBox({
            type: 'error',
            message: error.message.includes('ETIMEDOUT')
                ? t('update-timeout')
                : (error.message || t('update-failed'))
        });
    });
    // New version available
    autoUpdater.on('update-available', (info) => {
        if (suppressUpdateAvailableDialog > 0) {
            return;
        }
        const notes = info.releaseNotes?.replace(/<[^>]*>/g, '') || t('no-release-notes');
        const msg = t('new-version-msg').replace('{version}', info.version).replace('{notes}', notes);
        dialog.showMessageBox({
            type: 'info',
            title: t('new-version'),
            message: msg,
            buttons: [t('update-now'), t('later')],
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });
    // Already on latest version
    autoUpdater.on('update-not-available', () => {
        if (!silentCheck) {
            dialog.showMessageBox({
                type: 'info',
                title: t('update-hint'),
                message: t('already-latest'),
                buttons: [t('ok')]
            });
        }
    });
    // Update download progress
    autoUpdater.on('download-progress', (progressObj) => {
        mainWindow.setProgressBar(progressObj.percent / 100);
        mainWindow.webContents.send('update-progress', progressObj);
    });
    // Update download complete
    autoUpdater.on('update-downloaded', () => {
        mainWindow.setProgressBar(-1);
        mainWindow.webContents.send('update-downloaded');
        dialog.showMessageBox({
            type: 'info',
            title: t('update-ready'),
            message: t('update-ready-msg'),
            buttons: [t('install-now'), t('install-later')],
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                app.isQuitting = true;
                autoUpdater.quitAndInstall(true, true);
            }
        });
    });
}
// Check for updates
export function checkForUpdates(silent = false) {
    silentCheck = silent;

    if (!autoUpdater.isUpdaterActive()) {
        if (!silent) {
            showUpdateUnavailableMessage();
        }
        return;
    }

    autoUpdater.checkForUpdates()
        .then(result => {
            if (!result && !silent) {
                showUpdateUnavailableMessage();
            }
        })
        .catch(error => {
            console.error('Update check error:', error);
        });
}

export async function startUpdateDownload() {
    silentCheck = true;

    if (!autoUpdater.isUpdaterActive()) {
        return {
            success: false,
            reason: 'unsupported'
        };
    }

    try {
        if (!autoUpdater.updateInfoAndProvider) {
            const result = await checkForUpdatesSilently();
            if (!result?.isUpdateAvailable) {
                return {
                    success: false,
                    reason: 'not-available'
                };
            }
        }

        await autoUpdater.downloadUpdate();
        return {
            success: true
        };
    } catch (error) {
        console.error('Start update download error:', error);
        return {
            success: false,
            reason: 'error',
            message: error?.message || String(error)
        };
    }
}
