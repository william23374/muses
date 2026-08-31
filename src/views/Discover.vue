<template>
    <div class="discover-page">
        <div class="discover-switch" :style="discoverSwitchStyle">
            <button v-for="tab in discoverTabs" :key="tab.key" class="switch-item"
                :class="{ active: activeDiscoverTab === tab.key }" @click="handleDiscoverTabClick(tab)">
                {{ tab.label }}
            </button>
        </div>

        <DiscoverPlaylistContent v-if="activeDiscoverTab === 'playlist'" />

        <RankingContent v-else-if="activeDiscoverTab === 'ranking'" :player-control="props.playerControl" />

        <DiscoverNewAlbumContent v-else-if="activeDiscoverTab === 'newAlbum'" />

        <DiscoverNewSongContent v-else-if="activeDiscoverTab === 'newSong'" :player-control="props.playerControl" />

        <BackToTop />
    </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import DiscoverNewAlbumContent from '../components/discover/DiscoverNewAlbumContent.vue';
import DiscoverNewSongContent from '../components/discover/DiscoverNewSongContent.vue';
import DiscoverPlaylistContent from '../components/discover/DiscoverPlaylistContent.vue';
import RankingContent from '../components/discover/RankingContent.vue';
import BackToTop from '../components/BackToTop.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const props = defineProps({
    playerControl: Object
});

const discoverTabs = computed(() => [
    { key: 'playlist', label: t('discover-tab-playlist') },
    { key: 'ranking', label: t('discover-tab-ranking') },
    { key: 'newAlbum', label: t('discover-tab-new-album') },
    { key: 'newSong', label: t('discover-tab-new-song') }
]);

const normalizeDiscoverTab = (view) => {
    return discoverTabs.value.some(tab => tab.key === view) ? view : 'playlist';
};

const activeDiscoverTab = computed(() => {
    return normalizeDiscoverTab(route.query.view);
});

const activeDiscoverTabIndex = computed(() => {
    return discoverTabs.value.findIndex(tab => tab.key === activeDiscoverTab.value);
});

const discoverSwitchStyle = computed(() => {
    return {
        '--discover-slider-x': `${activeDiscoverTabIndex.value * 100}%`
    };
});

const handleDiscoverTabClick = (tab) => {
    const nextQuery = { ...route.query };

    if (tab.key === 'playlist') {
        delete nextQuery.view;
    } else {
        nextQuery.view = tab.key;
    }

    router.replace({
        path: '/discover',
        query: nextQuery
    });
};
</script>

<style lang="scss" scoped>
.discover-page {
    position: relative;
    --discover-switch-top: 28px;
    padding: var(--discover-switch-top) 20px 20px;
    --discover-switch-bg: #f2f2f7;
    --discover-switch-border: transparent;
    --discover-switch-text: #6e6e73;
    --discover-switch-active-bg: #ffffff;
    --discover-switch-active-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

    &:is(.dark .discover-page) {
        --discover-switch-bg: #2c2c2e;
        --discover-switch-border: transparent;
        --discover-switch-text: rgba(235, 235, 245, 0.55);
        --discover-switch-active-bg: #3a3a3c;
        --discover-switch-active-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
    }
}

.discover-switch {
    position: relative;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    padding: 4px;
    margin-bottom: 24px;
    background: var(--discover-switch-bg);
    border: 1px solid var(--discover-switch-border);
    border-radius: 999px;

    &::before {
        content: "";
        position: absolute;
        top: 4px;
        bottom: 4px;
        left: 4px;
        z-index: 0;
        width: calc((100% - 8px) / 4);
        background: var(--discover-switch-active-bg);
        border-radius: 999px;
        box-shadow: var(--discover-switch-active-shadow);
        transform: translateX(var(--discover-slider-x));
        transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.2s ease, box-shadow 0.2s ease;
    }
}

.switch-item {
    position: relative;
    z-index: 1;
    flex: 1;
    min-width: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--discover-switch-text);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 40px;
    cursor: pointer;
    transition: all 0.2s ease;

    &.active {
        color: #1d1d1f;
    }

    &:is(.dark .switch-item.active) {
        color: rgba(255, 255, 255, 0.92);
    }
}

@media (max-width: 768px) {
    .discover-switch {
        padding: 4px;

        &::before {
            top: 4px;
            bottom: 4px;
            left: 4px;
            width: calc((100% - 8px) / 4);
        }
    }

    .switch-item {
        font-size: 12px;
        line-height: 36px;
    }
}
</style>
