<template>
    <header class="app-header">
        <nav class="navigation">
            <div class="navigation">
                <button class="nav-arrow" @click="goBack" :disabled="!canGoBack">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="nav-arrow" @click="goForward" :disabled="!canGoForward">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <button class="nav-arrow" @click="refreshPage">
                    <i class="fas fa-redo"></i>
                </button>
            </div>
            <div class="nav-links">
                <router-link to="/">{{ $t('shou-ye') }}</router-link>
                <router-link to="/discover">{{ $t('fa-xian') }}</router-link>
                <router-link to="/library">{{ $t('yin-le-ku') }}</router-link>
            </div>
            <div class="search-profile">
                <div class="search-bar">
                    <input
                        v-model="searchQuery"
                        type="text"
                        :placeholder="$t('sou-suo-yin-le-ge-shou-ge-dan')"
                        :readonly="searchMode === 'recommend'"
                        @click="getSearch"
                        @keydown.enter="getSearch"
                    >
                    <router-link to="/recognize" class="header-recognize-entry" :title="$t('ting-ge-shi-qu')">
                        <i class="fas fa-microphone"></i>
                    </router-link>
                </div>
                <div class="profile" @click="toggleProfile">
                    <img
                        v-if="MusesAuth.UserInfo?.pic"
                        :src="MusesAuth.UserInfo.pic"
                        alt="Profile Picture"
                    >
                    <span v-else class="profile-avatar-fallback" aria-hidden="true">
                        <i class="fas fa-cog"></i>
                    </span>
                    <div v-if="showProfile" class="profile-menu">
                        <ul>
                            <li>
                                <router-link to="/settings">
                                    <i class="fas fa-cog"></i> {{ $t('she-zhi') }}
                                </router-link>
                            </li>
                            <li>
                                <a v-if="MusesAuth.isAuthenticated" @click="logout"><i class="fas fa-sign-out-alt"></i>{{ $t('tui-chu') }}</a>
                                <router-link v-else to="/login">
                                    <i class="fas fa-sign-in-alt"></i> {{ $t('deng-lu') }}
                                </router-link>
                            </li>
                            <li>
                                <a style="position: relative;" @click="handleUpdateEntryClick">
                                    <i class="fab fa-github"></i> {{ $t('geng-xin') }}
                                    <i v-if="showNewBadge" class="new-badge">{{ $t('new') }}</i>
                                </a>
                            </li>
                            <li>
                                <a @click="Disclaimer()">
                                    <i class="fas fa-info-circle"></i> {{ $t('guan-yu') }}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </nav>
    </header>
    <div v-if="isDisclaimerVisible" class="modal-overlay" @click="Disclaimer">
        <div class="modal-content" @click.stop>
            <img class="modal-banner" :src="DISCLAIMER_BANNER_SRC" alt="Banner">
            <h2>{{ $t('mian-ze-sheng-ming') }}</h2>
            <p v-for="key in ABOUT_DISCLAIMER_KEYS" :key="key">{{ $t(key) }}</p>
            <button @click="Disclaimer">{{ $t('guan-bi-an-niu') }}</button>
            <div class="version-number">© Muses <span v-if="appVersion">V{{ appVersion }} - {{ platform }}</span></div>
        </div>
    </div>
    <AppUpdateDialog ref="updateDialogRef" :app-version="appVersion" :platform="platform" @badge-change="showNewBadge = $event" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { MusesAuthStore } from '../stores/store';
import { useI18n } from 'vue-i18n';
import AppUpdateDialog from './AppUpdateDialog.vue';
import { ABOUT_DISCLAIMER_KEYS, DISCLAIMER_BANNER_SRC } from '../config/disclaimer';

const MusesAuth = MusesAuthStore();
const searchQuery = ref('');
const isDisclaimerVisible = ref(false);
const router = useRouter();
const route = useRoute();
const canGoBack = ref(false);
const canGoForward = ref(false);
const forwardStack = ref([]);
const { t } = useI18n();
const showNewBadge = ref(false);
const appVersion = ref('');
const platform = ref('');
const searchMode = ref('quick');
const showProfile = ref(false);
const updateDialogRef = ref(null);
const removeAfterEach = router.afterEach(() => {
    updateNavigationStatus();
});

onMounted(() => {
    updateNavigationStatus();
    if (window.electron) {
        window.electron.ipcRenderer.on('version', (_event, version) => {
            appVersion.value = version;
            platform.value = window.electron.platform;
            localStorage.setItem('version', version);
        });
    } else {
        appVersion.value = __VERSION__ || '';
        platform.value = 'Web';
    }
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    removeAfterEach();
});

const Disclaimer = () => {
    isDisclaimerVisible.value = !isDisclaimerVisible.value;
};

const updateNavigationStatus = () => {
    canGoBack.value = window.history.length > 1;
    canGoForward.value = forwardStack.value.length > 0;
};

const goBack = () => {
    if (canGoBack.value) {
        forwardStack.value.push(route.fullPath);
        router.back();
    }
    updateNavigationStatus();
};

const goForward = () => {
    if (canGoForward.value) {
        const forwardRoute = forwardStack.value.pop();
        router.push(forwardRoute);
    }
    updateNavigationStatus();
};

const refreshPage = () => {
    window.location.reload();
};

const logout = async () => {
    const result = await window.$modal.confirm(t('ni-que-ren-yao-tui-chu-deng-lu-ma'));
    if (result) {
        MusesAuth.clearData();
        router.push({ path: '/' });
    }
};

const toggleProfile = () => {
    showProfile.value = !showProfile.value;
};

const getSearch = () => {
    const keyword = searchQuery.value.trim();
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    searchMode.value = settings?.searchMode === 'recommend' ? 'recommend' : 'quick';

    if (searchMode.value === 'recommend') {
        const nextQuery = keyword ? { q: keyword } : {};
        if (route.path === '/search/recommend' && JSON.stringify(route.query) === JSON.stringify(nextQuery)) {
            return;
        }
        router.push({
            path: '/search/recommend',
            query: nextQuery
        });
        return;
    }

    if (keyword !== '') {
        if (keyword.includes('collection_')) {
            router.push({
                path: '/PlaylistDetail',
                query: { global_collection_id: keyword }
            });
            return;
        }
        router.push({
            path: '/search',
            query: { q: keyword }
        });
    }
};

const handleClickOutside = (event) => {
    const queueProfile = document.querySelector('.profile-menu');
    if (queueProfile && !queueProfile.contains(event.target) && !event.target.closest('.profile')) {
        showProfile.value = false;
    }
};

const handleUpdateEntryClick = () => {
    showProfile.value = false;
    updateDialogRef.value?.handleEntryClick();
};
</script>

<style lang="scss" scoped>
.app-header {
    --header-surface: var(--color-navbar-bg, rgba(255, 255, 255, 0.72));
    --header-shadow: none;
    --header-nav-icon: #1d1d1f;
    --header-nav-disabled: #c7c7cc;
    --header-nav-hover-bg: var(--color-secondary-bg-for-transparent);

    &:is(.dark .app-header) {
        --header-surface: rgba(28, 28, 30, 0.72);
        --header-shadow: none;
        --header-nav-icon: rgba(255, 255, 255, 0.92);
        --header-nav-disabled: #636366;
        --header-nav-hover-bg: rgba(255, 255, 255, 0.08);
    }
}

.navigation {
    display: flex;
    gap: 10px;
}

.nav-arrow {
    background: none;
    border: none;
    cursor: pointer;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:disabled i {
        color: var(--header-nav-disabled);
        cursor: not-allowed;
    }

    i {
        font-size: 24px;
        color: var(--header-nav-icon);
    }

    &:hover {
        background-color: var(--header-nav-hover-bg);
    }
}

button {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px;
    background: transparent;
    margin: 4px;
    border-radius: 25%;
    transition: 0.2s;

    .svg-icon {
        color: var(--color-text);
        height: 16px;
        width: 16px;
    }

    &:first-child {
        margin-left: 0;
    }

    &:hover {
        background: var(--color-secondary-bg-for-transparent);
    }

    &:active {
        transform: scale(0.92);
    }
}

header {
    background-color: var(--header-surface);
    padding: 12px 0;
    box-shadow: var(--header-shadow);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 1px solid var(--border-color);
    position: fixed;
    left: 0;
    right: 0;
    width: 100%;
    top: 0px;
    z-index: 9;
}

header::before {
    content: '';
    position: absolute;
    inset: 0 100px 0 0;
    -webkit-app-region: drag;
}

.nav-arrow,
.nav-links a,
.search-bar input,
.header-recognize-entry,
.profile,
.profile img,
.profile-avatar-fallback {
    -webkit-app-region: no-drag;
}

.navigation {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.nav-links {
    display: flex;
    gap: 4px;
    justify-content: center;
    flex-grow: 1;

    a {
        text-decoration: none;
        color: var(--apple-secondary-label, var(--secondary-color));
        -webkit-app-region: no-drag;
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.02em;
        border-radius: 999px;
        padding: 6px 14px;
        transition: 0.2s;
        -webkit-user-drag: none;
        margin-right: 2px;
        margin-left: 2px;

        &:hover {
            color: var(--apple-label, var(--text-color));
            background: var(--color-secondary-bg-for-transparent);
            text-decoration: none;
        }

        &:active {
            transform: scale(0.92);
            transition: 0.2s;
        }

        &.router-link-active,
        &.active {
            color: var(--primary-color);
        }
    }
}

.search-profile {
    display: flex;
    align-items: center;
    gap: 20px;
}

.search-bar {
    position: relative;

    input {
        box-sizing: border-box;
        padding: 8px 42px 8px 15px;
        border-radius: 999px;
        border: none;
        background: var(--apple-fill, var(--background-color-secondary));
        color: var(--text-color);
        font-size: 14px;
        width: 200px;
        transition: width 0.3s ease, background 0.2s ease;

        &::placeholder {
            color: var(--apple-secondary-label, var(--secondary-color));
        }

        &:focus {
            width: 250px;
            outline: none;
            background: var(--color-primary-light);
        }
    }
}

.header-recognize-entry {
    position: absolute;
    top: 50%;
    right: 1px;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #6a6a6a;
    text-decoration: none;
    transition: 0.2s;

    &:hover {
        color: var(--color-primary);
        background: var(--header-nav-hover-bg);
    }

    &:active {
        transform: translateY(-50%) scale(0.92);
    }

    transform: translateY(-50%);
}

.profile {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: transparent;
    cursor: pointer;
    position: relative;
    display: grid;
    place-items: center;
    flex-shrink: 0;

    img {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: 50%;
    }
}

.profile-avatar-fallback {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: linear-gradient(160deg, #64d2ff 0%, #0a84ff 100%);
    color: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    pointer-events: none;

    i {
        font-size: 16px;
        line-height: 1;
    }
}

.profile-menu {
    position: absolute;
    top: 50px;
    right: 0;
    z-index: 1000;
    background-color: #fff;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    padding: 10px;
    width: 150px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation: fadeInOut 0.3s ease-in-out;

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    li a {
        display: flex;
        align-items: center;
        gap: 15px;
        cursor: pointer;
        padding: 7px 5px;
        border-radius: 5px;
        color: #000;
        text-decoration: none;

        &:hover {
            background-color: var(--secondary-color);
        }
    }
}

@keyframes fadeInOut {
    0% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    position: relative;
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    max-width: 700px;
    width: 90%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    text-align: left;
    animation: fadeIn 0.3s ease;

    .modal-banner {
        position: absolute;
        top: 0;
        right: 15px;
        width: 180px;
        max-width: 35%;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
    }

    h2 {
        margin-top: 20px;
        color: var(--primary-color);
    }

    p {
        margin: 10px 0;
        line-height: 1.6;
    }

    button {
        margin-top: 15px;
        padding: 8px 12px;
        background-color: var(--primary-color);
        color: #fff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.new-badge {
    position: absolute;
    top: 1px;
    left: 67px;
    background-color: red;
    color: white;
    padding: 0px 4px;
    border-radius: 5px;
    font-size: 14px;
}

.version-number {
    position: absolute;
    bottom: 10px;
    right: 10px;
    font-size: 12px;
    color: #666;
}
</style>
