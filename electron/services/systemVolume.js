import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const clampVolume = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const runOsascript = async (script) => {
    const { stdout } = await execFileAsync('osascript', ['-e', script], {
        timeout: 2000,
        maxBuffer: 1024 * 1024
    });
    return String(stdout || '').trim();
};

const getDarwinVolume = async () => {
    const output = await runOsascript('output volume of (get volume settings)');
    const mutedOutput = await runOsascript('output muted of (get volume settings)');
    return {
        volume: clampVolume(output),
        muted: mutedOutput === 'true'
    };
};

const setDarwinVolume = async (volume) => {
    const next = clampVolume(volume);
    await runOsascript(`set volume output volume ${next}`);
    if (next === 0) {
        await runOsascript('set volume with output muted');
    } else {
        await runOsascript('set volume without output muted');
    }
    return {
        volume: next,
        muted: next === 0
    };
};

const setDarwinMuted = async (muted) => {
    if (muted) {
        await runOsascript('set volume with output muted');
    } else {
        await runOsascript('set volume without output muted');
    }
    return getDarwinVolume();
};

export const isSystemVolumeSupported = () => process.platform === 'darwin';

export const getSystemVolume = async () => {
    if (process.platform === 'darwin') {
        return getDarwinVolume();
    }
    throw new Error('System volume sync is only supported on macOS');
};

export const setSystemVolume = async (volume) => {
    if (process.platform === 'darwin') {
        return setDarwinVolume(volume);
    }
    throw new Error('System volume sync is only supported on macOS');
};

export const setSystemMuted = async (muted) => {
    if (process.platform === 'darwin') {
        return setDarwinMuted(muted);
    }
    throw new Error('System volume sync is only supported on macOS');
};
