import i18n from '@/utils/i18n';

const appFontStyleId = 'muses-custom-font';
const defaultFontFamily = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

const escapeCssString = (value) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

export const applyCustomFont = (fontFamily) => {
    if (typeof document === 'undefined') return;

    document.getElementById(appFontStyleId)?.remove();
    if (!fontFamily) return;

    const safeFontFamily = escapeCssString(fontFamily);
    const style = document.createElement('style');
    style.id = appFontStyleId;
    style.textContent = `
body, html, button, input, textarea, select {
    font-family: "${safeFontFamily}", ${defaultFontFamily} !important;
}`;
    document.head.appendChild(style);
};

export const applyColorTheme = (theme) => {
    let colors;
    if (theme === 'green') {
        colors = {
            '--primary-color': '#34C759',
            '--primary-color-rgb': '52, 199, 89',
            '--secondary-color': '#86868b',
            '--background-color': '#ffffff',
            '--background-color-secondary': '#f5f5f7',
            '--color-primary': '#34C759',
            '--color-primary-light': 'rgba(52, 199, 89, 0.12)',
            '--border-color': 'rgba(0, 0, 0, 0.06)',
            '--hover-color': '#f5f5f7',
            '--color-secondary-bg-for-transparent': 'rgba(0, 0, 0, 0.04)',
            '--color-box-shadow': 'rgba(0, 0, 0, 0.08)',
        };
    } else if (theme === 'orange') {
        colors = {
            '--primary-color': '#FF9500',
            '--primary-color-rgb': '255, 149, 0',
            '--secondary-color': '#86868b',
            '--background-color': '#ffffff',
            '--background-color-secondary': '#f5f5f7',
            '--color-primary': '#FF9500',
            '--color-primary-light': 'rgba(255, 149, 0, 0.12)',
            '--border-color': 'rgba(0, 0, 0, 0.06)',
            '--hover-color': '#f5f5f7',
            '--color-secondary-bg-for-transparent': 'rgba(0, 0, 0, 0.04)',
            '--color-box-shadow': 'rgba(0, 0, 0, 0.08)',
        };
    } else if (theme === 'pink') {
        colors = {
            '--primary-color': '#FF2D55',
            '--primary-color-rgb': '255, 45, 85',
            '--secondary-color': '#86868b',
            '--background-color': '#ffffff',
            '--background-color-secondary': '#f5f5f7',
            '--color-primary': '#FF2D55',
            '--color-primary-light': 'rgba(255, 45, 85, 0.12)',
            '--border-color': 'rgba(0, 0, 0, 0.06)',
            '--hover-color': '#f5f5f7',
            '--color-secondary-bg-for-transparent': 'rgba(0, 0, 0, 0.04)',
            '--color-box-shadow': 'rgba(0, 0, 0, 0.08)',
        };
    } else {
        // Default / blue — Apple system blue
        colors = {
            '--primary-color': '#007AFF',
            '--primary-color-rgb': '0, 122, 255',
            '--secondary-color': '#86868b',
            '--background-color': '#ffffff',
            '--background-color-secondary': '#f5f5f7',
            '--color-primary': '#007AFF',
            '--color-primary-light': 'rgba(0, 122, 255, 0.12)',
            '--border-color': 'rgba(0, 0, 0, 0.06)',
            '--hover-color': '#f5f5f7',
            '--color-secondary-bg-for-transparent': 'rgba(0, 0, 0, 0.04)',
            '--color-box-shadow': 'rgba(0, 0, 0, 0.08)',
        };
    }

    Object.keys(colors).forEach(key => {
        document.documentElement.style.setProperty(key, colors[key]);
    });
};


export const getCover = (coverUrl, size) => {
    if (!coverUrl) return './assets/images/ico.png';
    return coverUrl.replace("{size}", size);
};

export const getProfileBgColor = (src, tone = 0.52) => new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
                reject(new Error('Canvas context unavailable'));
                return;
            }
            const sampleWidth = Math.max(8, Math.floor(image.naturalWidth * 0.12));
            const sampleHeight = Math.max(8, image.naturalHeight);
            canvas.width = 24;
            canvas.height = 24;
            context.drawImage(image, 0, 0, sampleWidth, sampleHeight, 0, 0, canvas.width, canvas.height);
            const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
            let red = 0;
            let green = 0;
            let blue = 0;
            let alphaTotal = 0;
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3] / 255;
                red += data[i] * alpha;
                green += data[i + 1] * alpha;
                blue += data[i + 2] * alpha;
                alphaTotal += alpha;
            }
            if (!alphaTotal) {
                reject(new Error('No visible pixels'));
                return;
            }
            const averageRed = Math.round((red / alphaTotal) * tone);
            const averageGreen = Math.round((green / alphaTotal) * tone);
            const averageBlue = Math.round((blue / alphaTotal) * tone);
            resolve(`rgb(${averageRed}, ${averageGreen}, ${averageBlue})`);
        } catch (error) {
            reject(error);
        }
    };
    image.onerror = () => reject(new Error('Image load failed'));
    image.src = src;
});

export const formatMilliseconds = (time) => {
    const milliseconds = time > 3600 ? time : time * 1000;
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return i18n.global.t('fen-miao', { m: minutes, s: seconds });
};

export const formatTimestampToAgo = (timestamp, translate) => {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || ts <= 0) return '';

    const t = typeof translate === 'function' ? translate : i18n.global.t.bind(i18n.global);

    const now = Math.floor(Date.now() / 1000);
    const diff = now - Math.floor(ts);

    if (diff <= 0) return t('shi-jian-gang-gang');
    if (diff < 60) return t('shi-jian-miao-qian', { n: diff });

    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return t('shi-jian-fen-zhong-qian', { n: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('shi-jian-xiao-shi-qian', { n: hours });

    const days = Math.floor(hours / 24);
    if (days < 7) return t('shi-jian-tian-qian', { n: days });

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return t('shi-jian-zhou-qian', { n: weeks });

    const months = Math.floor(days / 30);
    if (months < 12) return t('shi-jian-ge-yue-qian', { n: months });

    const years = Math.floor(months / 12);
    return t('shi-jian-nian-qian', { n: years });
};

export const requestMicrophonePermission = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;

    try {
        if (navigator.permissions?.query) {
            const status = await navigator.permissions.query({ name: 'microphone' });

            if (status.state === 'granted') {
                // No prompt dialog
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                return true;
            }

            if (status.state === 'denied') return false;
        }
    } catch {
        // permissions API unavailable/errors in some envs (e.g. Safari) — use getUserMedia
    }

    try {
        // May prompt for permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch {
        return false;
    }
};

export const getAudioOutputDeviceSignature = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return null;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const signatures = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => `${device.deviceId || ''}:${device.groupId || ''}`)
        .sort();
    return signatures.join('|');
};

let themeMediaQueryListener = null;
export const setTheme = (theme) => {
    const html = document.documentElement;
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    if (themeMediaQueryListener) {
        prefersDarkScheme.removeEventListener('change', themeMediaQueryListener);
        themeMediaQueryListener = null;
    }

    const applyTheme = (isDark) => {
        if (isDark) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
    };

    switch (theme) {
        case 'dark':
            applyTheme(true);
            localStorage.setItem('theme', 'dark');
            break;
        case 'light':
            applyTheme(false);
            localStorage.setItem('theme', 'light');
            break;
        case 'auto':
            localStorage.setItem('theme', 'auto');
            applyTheme(prefersDarkScheme.matches);
            themeMediaQueryListener = (e) => {
                applyTheme(e.matches);
            };
            prefersDarkScheme.addEventListener('change', themeMediaQueryListener);
            break;
    }
};

export const openRegisterUrl = (registerUrl) => {
    if (window.electron) {
        window.electron.ipcRenderer.send('open-url', registerUrl);
    } else {
        window.open(registerUrl, '_blank');
    }
};

export const openMvPlayer = async (router, hash, title = i18n.global.t('shi-pin-bo-fang')) => {
    const resolved = router.resolve({
        path: '/video',
        query: { hash, title }
    });
    const base = window.location.href.split('#')[0];
    const href = resolved.href || '';
    const fullUrl = href.startsWith('#')
        ? `${base}${href}`
        : `${base}#${href.startsWith('/') ? href : `/${href}`}`;

    if (window.electronAPI) {
        await window.electronAPI.openMvWindow(fullUrl);
        return;
    }

    const width = 960;
    const height = 620;
    const left = Math.max(0, Math.round((window.screen.width - width) / 2));
    const top = Math.max(0, Math.round((window.screen.height - height) / 2));
    const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`;

    const popup = window.open(fullUrl, 'muses-mv', features);
    if (popup) {
        popup.focus?.();
        return;
    }

    await router.push(resolved);
};

// Share
import { MusesAuthStore } from '../stores/store';
export const share = (songName, id, type = 0, songDesc = '') => {
    let text = '';
    const MusesAuth = MusesAuthStore();
    let userName = 'Muses';
    if(MusesAuth.isAuthenticated) {
        userName = MusesAuth.UserInfo?.nickname || 'Muses';
    };
    // Client-side share
    let shareUrl = '';
    if (window.electron) {
        if(type == 0){
            // Song
            shareUrl = `https://music.moekoe.cn/share/?hash=${id}`;
        }else{
            // Playlist
            shareUrl = `muses://share?listid=${id}`;
        }
    } else {
        // Web / H5 logic
        shareUrl = (window.location.host + '/#/') + (type == 0 ? `share/?hash=${id}` : `share?listid=${id}`);
    }
    text = i18n.global.t('fen-xiang-wen-ben', { user: userName, desc: songDesc, name: songName, url: shareUrl });

    navigator.clipboard.writeText(text);
    $message.success(
        i18n.global.t('kou-ling-yi-fu-zhi,kuai-ba-ge-qu-fen-xiang-gei-peng-you-ba')
    );
};
