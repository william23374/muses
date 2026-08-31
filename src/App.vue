<template>
    <div id="app">
        <TitleBar v-if="showTitleBar && !isLyricsRoute" />
        <RouterView />
        <Disclaimer v-if="!isLyricsRoute" />
        <StatusBarLyrics v-if="!isLyricsRoute" ref="statusBarLyricsRef" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import Disclaimer from '@/components/Disclaimer.vue';
import TitleBar from '@/components/TitleBar.vue';
import StatusBarLyrics from '@/components/StatusBarLyrics.vue';
import { MusesAuthStore } from '@/stores/store';
import logoImageSrc from '@/assets/images/tray/tray-icon@2x.png?url';

const route = useRoute();
const isLyricsRoute = computed(() => route.path === '/lyrics');

// Status bar lyrics logic
const statusBarLyricsRef = ref(null);
let cleanupStatusBarIPC = null;

// Dynamically control TitleBar visibility
const showTitleBar = ref(true);

onMounted(async () => {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    showTitleBar.value = settings.nativeTitleBar !== 'on'; // Hide TitleBar when value is 'on'

    const MusesAuth = MusesAuthStore();
    await MusesAuth.initDevice();

    // Init status bar lyrics
    cleanupStatusBarIPC = statusBarLyricsRef.value?.initStatusBar(logoImageSrc, settings);
});

onUnmounted(() => {
    statusBarLyricsRef.value?.cleanupStatusBar();
    cleanupStatusBarIPC?.();
});
</script>

<style scoped>
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}
</style>
