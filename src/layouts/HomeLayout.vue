<template>
    <Header v-if="navigationMode === 'top'" />
    <SidebarNavigation v-else />
    <main
        ref="mainScrollRef"
        class="app-main-scroll"
        :class="{ 'side-navigation-main-content': navigationMode === 'side', collapsed: sidebarCollapsed }"
        @scroll="handleMainScroll"
    >
        <div v-if="!isOnline" class="network-status">
            {{ $t('wang-luo-yi-duan-kai') }}
        </div>
        <div class="main-content-shell">
            <router-view v-slot="{ Component, route: currentRoute }">
                <div
                    class="page-route-view"
                    :class="{ 'page-route-enter-active': isPageRouteEntering }"
                >
                    <KeepAlive :max="pageCacheMax">
                        <component
                            v-if="shouldCacheRoute(currentRoute)"
                            :is="Component"
                            :key="getRouteCacheKey(currentRoute)"
                            :playerControl="playerControl"
                        />
                    </KeepAlive>
                    <component
                        v-if="!shouldCacheRoute(currentRoute)"
                        :is="Component"
                        :key="currentRoute.fullPath"
                        :playerControl="playerControl"
                    />
                </div>
            </router-view>
        </div>
    </main>
    <PlayerControl ref="playerControl" />
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Header from "@/components/Header.vue";
import SidebarNavigation from "@/components/SidebarNavigation.vue";
import PlayerControl from "@/components/PlayerControl.vue";
import { setTheme, applyColorTheme, applyCustomFont } from '../utils/utils';

const { t } = useI18n();
const route = useRoute();
const playerControl = ref(null);
const mainScrollRef = ref(null);
const isOnline = ref(navigator.onLine);
const navigationMode = ref('top');
const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === '1');
const playerBarLayout = ref('full');
const isPageRouteEntering = ref(false);
// const routeViewKey = computed(() => route.fullPath);
const routeViewKey = computed(() => route.name);
const cacheableRouteNames = new Set([
    'Index',
    'Share',
    'Discover',
    'Library',
    'Search',
    'RecommendedSearch',
    'Ranking'
]);
const pageCacheMax = cacheableRouteNames.size;
const routeScrollPositions = new Map();
let pageRouteAnimationFrame = null;

// Listen for network status changes
const handleNetworkChange = (online) => {
    isOnline.value = online;

    const title = online ? t('wang-luo-yi-lian-jie') : t('wang-luo-yi-duan-kai');
    const body = online ? t('wang-luo-yi-hui-fu') : t('qing-jian-cha-wang-luo');

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    new Notification(title, {
        body,
        icon: './assets/images/logo.png'
    });
};

const handleOnline = () => handleNetworkChange(true);
const handleOffline = () => handleNetworkChange(false);
const loadNavigationMode = (settings = JSON.parse(localStorage.getItem('settings')) || {}) => {
    navigationMode.value = settings.navigationMode === 'side' ? 'side' : 'top';
    playerBarLayout.value = settings.playerBarLayout === 'content' ? 'content' : 'full';
    applyPlayerBarLayout();
};
const handleSettingsChange = (event) => {
    loadNavigationMode(event.detail?.settings);
};
const handleSidebarCollapseChange = (event) => {
    sidebarCollapsed.value = event.detail?.collapsed === true;
    applyPlayerBarLayout();
};
const applyPlayerBarLayout = () => {
    const enabled = navigationMode.value === 'side' && playerBarLayout.value === 'content';
    document.body.classList.toggle('player-bar-content-layout', enabled);
    document.documentElement.style.setProperty('--side-navigation-width', sidebarCollapsed.value ? '64px' : '226px');
};

const shouldCacheRoute = (currentRoute) => cacheableRouteNames.has(String(currentRoute?.name || ''));

const getRouteCacheKey = (currentRoute) => String(currentRoute?.name || currentRoute?.path || '');

const getScrollRouteKey = (currentRoute) => String(currentRoute?.fullPath || currentRoute?.path || '');

const saveRouteScrollPosition = (currentRoute, scrollTop) => {
    routeScrollPositions.set(getScrollRouteKey(currentRoute), scrollTop);
};

const restoreRouteScrollPosition = (currentRoute) => {
    nextTick(() => {
        if (!mainScrollRef.value) return;
        const scrollTop = routeScrollPositions.get(getScrollRouteKey(currentRoute)) ?? 0;
        mainScrollRef.value.scrollTop = scrollTop;
    });
};

const handleMainScroll = (event) => {
    saveRouteScrollPosition(route, event.target.scrollTop);
};

const stopPageRouteAnimation = () => {
    if (pageRouteAnimationFrame !== null) {
        window.cancelAnimationFrame(pageRouteAnimationFrame);
        pageRouteAnimationFrame = null;
    }
};

const replayPageRouteAnimation = () => {
    stopPageRouteAnimation();
    isPageRouteEntering.value = false;
    pageRouteAnimationFrame = window.requestAnimationFrame(() => {
        isPageRouteEntering.value = true;
        pageRouteAnimationFrame = null;
    });
};

watch(routeViewKey, (to, from) => {
    if (from && mainScrollRef.value) {
        saveRouteScrollPosition({ fullPath: from }, mainScrollRef.value.scrollTop);
    }
    replayPageRouteAnimation();
    restoreRouteScrollPosition(route);
});

onMounted(() => {
    const savedConfig = JSON.parse(localStorage.getItem('settings')) || {};
    const themeColor = savedConfig.themeColor === 'pink' || !savedConfig.themeColor
        ? 'blue'
        : savedConfig.themeColor;
    applyColorTheme(themeColor);
    applyCustomFont(savedConfig.font || '');
    loadNavigationMode(savedConfig);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    }

    // Add network status listener
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('settings-change', handleSettingsChange);
    window.addEventListener('sidebar-collapse-change', handleSidebarCollapseChange);

    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    replayPageRouteAnimation();
});

// Remove event listeners on unmount
onUnmounted(() => {
    stopPageRouteAnimation();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('settings-change', handleSettingsChange);
    window.removeEventListener('sidebar-collapse-change', handleSidebarCollapseChange);
    document.body.classList.remove('player-bar-content-layout');
    document.documentElement.style.removeProperty('--side-navigation-width');
});
</script>

<style>
:root {
    /* Apple-inspired design tokens */
    --primary-color: #007aff;
    --primary-color-rgb: 0, 122, 255;
    --secondary-color: #86868b;
    --text-color: #1d1d1f;
    --background-color: #ffffff;
    --background-color-secondary: #f5f5f7;
    --color-primary: #007aff;
    --color-primary-light: rgba(0, 122, 255, 0.12);
    --border-color: rgba(0, 0, 0, 0.06);
    --hover-color: #f5f5f7;
    --color-secondary-bg-for-transparent: rgba(0, 0, 0, 0.04);
    --color-box-shadow: rgba(0, 0, 0, 0.08);
    --color-navbar-bg: rgba(255, 255, 255, 0.72);
    --color-body-bg: #ffffff;
    --apple-label: #1d1d1f;
    --apple-secondary-label: #86868b;
    --apple-tertiary-label: #aeaeb2;
    --apple-fill: #f2f2f7;
    --apple-separator: rgba(60, 60, 67, 0.12);
    --apple-radius: 12px;
    --apple-radius-lg: 18px;
}

html.dark {
    --text-color: rgba(255, 255, 255, 0.92);
    --background-color: #1c1c1e;
    --background-color-secondary: #2c2c2e;
    --color-primary-light: rgba(10, 132, 255, 0.18);
    --border-color: rgba(255, 255, 255, 0.08);
    --hover-color: #2c2c2e;
    --color-secondary-bg-for-transparent: rgba(255, 255, 255, 0.08);
    --color-box-shadow: rgba(0, 0, 0, 0.45);
    --color-navbar-bg: rgba(28, 28, 30, 0.72);
    --color-body-bg: #000000;
    --apple-label: rgba(255, 255, 255, 0.92);
    --apple-secondary-label: rgba(235, 235, 245, 0.6);
    --apple-tertiary-label: rgba(235, 235, 245, 0.4);
    --apple-fill: #2c2c2e;
    --apple-separator: rgba(84, 84, 88, 0.65);
}

* {
    user-select: none;
}

body,
html {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    letter-spacing: -0.01em;
    background-color: var(--color-body-bg);
    color: var(--text-color);
    height: 100%;
}

body {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

::-webkit-scrollbar {
    width: 0;
    height: 0;
}

main {
    height: 100vh;
    width: 100%;
    margin: 0;
    padding-top: 80px;
    padding-bottom: 150px;
    box-sizing: border-box;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    background-color: var(--color-body-bg);
}

#app {
    min-height: 100%;
    background-color: var(--color-body-bg);
}

.main-content-shell {
    width: min(1200px, 100%);
    margin: 0 auto;
    position: relative;
    overflow: visible;
}

.page-route-view {
    width: 100%;
}

.page-route-enter-active {
    animation: page-route-enter 0.45s ease-out;
    will-change: opacity;
}

@keyframes page-route-enter {
    from {
        opacity: 0;
        transform: translate3d(0, 6px, 0);
    }

    to {
        opacity: 1;
        transform: translate3d(0, 0, 0);
    }
}

main.side-navigation-main-content {
    --side-main-width: 226px;
    width: calc(100% - var(--side-main-width));
    margin-left: var(--side-main-width);
    margin-right: 0;
    padding-top: 52px;
}

main.side-navigation-main-content.collapsed {
    --side-main-width: 64px;
}

a {
    text-decoration: none;
    color: inherit;
    display: block;
}

.network-status {
    position: fixed;
    top: 80px;
    left: 0;
    right: 0;
    background-color: #ff4757;
    color: white;
    text-align: center;
    padding: 8px;
    z-index: 1000;
}

body.player-bar-content-layout .side-navigation {
    bottom: 0;
}

body:not(.player-bar-content-layout) .side-navigation {
    z-index: 98;
}

body.player-bar-content-layout .player-container {
    left: var(--side-navigation-width);
    width: calc(100% - var(--side-navigation-width));
}
</style>
