<template>
    <!-- Offscreen Canvas for StatusBar image (logical 200pt * 2 = 400px wide, 22pt * 2 = 44px tall) -->
    <canvas ref="canvasRef" width="400" height="44" style="display: none;"></canvas>
</template>

<script setup>
import { ref } from 'vue';

// Config constants
const CONFIG = {
    SCROLL_SPEED: 8,         // Scroll speed 8px/frame (~240px/s)
    FRAME_INTERVAL: 33,      // 30 FPS
    LOGO_WIDTH: 50,          // Logo area width
    FONT_SIZE: 26,           // Font size
    PAUSE_AT_START: 1200,    // Pause before scroll (ms)
    MAX_RENDER_FAILS: 3,     // Max retry count
};

// State (closure locals; factory only if multi-instance — singleton here)
const scrollState = {
    animationTimer: null,
    fullText: '',
    textWidth: 0,
    scrollOffset: 0,
    isScrolling: false,
    renderFailCount: 0,
    hasPlayedLyrics: false,
};

const canvasRef = ref(null);
const logoImage = ref(null);

// Clear state
const clearScrollState = () => {
    if (scrollState.animationTimer) {
        clearTimeout(scrollState.animationTimer);
        scrollState.animationTimer = null;
    }
    scrollState.fullText = '';
    scrollState.textWidth = 0;
    scrollState.scrollOffset = 0;
    scrollState.isScrolling = false;
    scrollState.renderFailCount = 0;
};

// Render one frame
const renderFrameWithOffset = (text, offsetX = 0, isMarquee = false) => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Width anchor
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, 1, height);
    ctx.fillRect(width - 1, 0, 1, height);

    // Layout calculation
    const CONTENT_START_X = CONFIG.LOGO_WIDTH;
    const CONTENT_WIDTH = width - CONTENT_START_X;
    const CONTENT_CENTER_X = CONTENT_START_X + (CONTENT_WIDTH / 2);

    // Font
    const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial';
    ctx.font = `600 ${CONFIG.FONT_SIZE}px ${fontFamily}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';

    // 1. Draw logo
    if (logoImage.value && logoImage.value.complete && logoImage.value.naturalHeight !== 0) {
        try {
            const targetHeight = 32;
            const scale = targetHeight / logoImage.value.naturalHeight;
            const targetWidth = logoImage.value.naturalWidth * scale;
            const x = (CONFIG.LOGO_WIDTH - targetWidth) / 2;
            const y = (height - targetHeight) / 2;
            ctx.drawImage(logoImage.value, x, y, targetWidth, targetHeight);
        } catch (e) { /* ignore */ }
    }

    // 2. Prepare text
    let textToDraw = text;
    let isPlaceholder = false;

    if (!text || text.trim().length === 0) {
        if (scrollState.hasPlayedLyrics) {
            textToDraw = '♩ ♩ ♩';
        } else {
            textToDraw = '♪ Muses';
        }
        isPlaceholder = true;
    } else {
        scrollState.hasPlayedLyrics = true;
    }

    // 3. Draw text (with clipping)
    ctx.save();
    ctx.beginPath();
    ctx.rect(CONTENT_START_X, 0, CONTENT_WIDTH, height);
    ctx.clip();

    if (isPlaceholder) {
        ctx.textAlign = 'center';
        ctx.fillText(textToDraw, CONTENT_CENTER_X, height / 2 + 2);
    } else if (isMarquee) {
        ctx.textAlign = 'left';
        const textX = CONTENT_START_X + 10 - offsetX;
        ctx.fillText(textToDraw, textX, height / 2 + 2);
    } else {
        ctx.textAlign = 'center';
        ctx.fillText(textToDraw, CONTENT_CENTER_X, height / 2 + 2);
    }

    ctx.restore();

    // 4. Send to main process
    try {
        const dataUrl = canvas.toDataURL('image/png');
        if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.send('update-statusbar-image', dataUrl);
        }
        scrollState.renderFailCount = 0;
    } catch (e) {
        console.error('[Status Bar] Render failed:', e);
        scrollState.renderFailCount++;
        if (scrollState.renderFailCount >= CONFIG.MAX_RENDER_FAILS) {
            clearScrollState();
        }
    }
};

// Animation loop
const startMarqueeAnimation = () => {
    const canvas = canvasRef.value;
    const contentWidth = canvas ? (canvas.width - CONFIG.LOGO_WIDTH - 20) : 330;
    const maxOffset = scrollState.textWidth - contentWidth;

    const animate = () => {
        if (!scrollState.isScrolling) {
            scrollState.animationTimer = null;
            return;
        }

        scrollState.scrollOffset += CONFIG.SCROLL_SPEED;
        let shouldStop = false;

        if (scrollState.scrollOffset >= maxOffset) {
            scrollState.scrollOffset = maxOffset;
            shouldStop = true;
        }

        renderFrameWithOffset(scrollState.fullText, scrollState.scrollOffset, true);

        if (shouldStop) {
            scrollState.animationTimer = null;
            return;
        }
        scrollState.animationTimer = setTimeout(animate, CONFIG.FRAME_INTERVAL);
    };

    if (scrollState.animationTimer) clearTimeout(scrollState.animationTimer);
    scrollState.animationTimer = setTimeout(animate, CONFIG.FRAME_INTERVAL);
};

// Measure text width
const getTextWidth = (text) => {
    const canvas = canvasRef.value;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    const fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial';
    ctx.font = `600 ${CONFIG.FONT_SIZE}px ${fontFamily}`;
    return ctx.measureText(text).width;
};

// Public API: update display
const updateStatusBarImage = (text) => {
    if (!canvasRef.value) return;

    // Deduplicate
    if (text === scrollState.fullText && scrollState.isScrolling) return;

    clearScrollState();

    if (!text || text.trim().length === 0) {
        renderFrameWithOffset('', 0, false);
        return;
    }

    const textWidth = getTextWidth(text);
    const contentWidth = canvasRef.value.width - CONFIG.LOGO_WIDTH - 20;

    scrollState.fullText = text;
    scrollState.textWidth = textWidth;

    if (textWidth <= contentWidth) {
        // Short lyrics
        scrollState.isScrolling = false;
        renderFrameWithOffset(text, 0, false);
    } else {
        // Long lyrics
        scrollState.isScrolling = true;
        scrollState.scrollOffset = 0;
        renderFrameWithOffset(text, 0, true);

        setTimeout(() => {
            if (scrollState.isScrolling && scrollState.fullText === text) {
                startMarqueeAnimation();
            }
        }, CONFIG.PAUSE_AT_START);
    }
};

// Init image
const initLogo = (src) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        logoImage.value = img;
        // Render placeholder once after first load
        updateStatusBarImage('');
    };
};

// Init status bar lyrics
const initStatusBar = (logoSrc, settings) => {
    if (!window.electron?.ipcRenderer) return null;
    const shouldEnable = settings.statusBarLyrics === 'on';
    if (!shouldEnable) return null;

    // Init logo
    initLogo(logoSrc);

    // Remove old listeners
    try {
        window.electron.ipcRenderer.removeAllListeners('generate-statusbar-image');
    } catch (e) { }

    // Create message handler
    const handler = (_event, text) => {
        try {
            updateStatusBarImage(text);
        } catch (e) { }
    };

    // Register listener
    window.electron.ipcRenderer.on('generate-statusbar-image', handler);

    // Return cleanup function
    return () => {
        if (window.electron?.ipcRenderer) {
            try {
                window.electron.ipcRenderer.removeListener('generate-statusbar-image', handler);
            } catch (e) { }
        }
    };
};

defineExpose({
    initStatusBar,
    cleanupStatusBar: clearScrollState,
});
</script>

