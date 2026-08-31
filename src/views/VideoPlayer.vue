<template>
    <div class="video-player-page">
        <div class="video-container">
            <div class="video-header">
                <button class="back-btn" @click="handleBackAction">
                    <i class="fas" :class="{ 'fa-xmark': shouldCloseWindow, 'fa-arrow-left': !shouldCloseWindow }"></i>
                    {{ shouldCloseWindow ? $t('guan-bi') : $t('fan-hui') }}
                </button>
                <h2 class="video-title">{{ videoTitle }}</h2>
            </div>

            <div class="video-wrapper" v-if="videoUrl">
                <video ref="videoPlayer" class="video-element" :src="videoUrl" controls autoplay
                    @error="handleVideoError" @loadedmetadata="handleVideoLoaded">
                    {{ $t('liu-lan-qi-bu-zhi-chi-shi-pin') }}
                </video>
            </div>

            <div class="loading-container" v-else-if="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>{{ $t('zheng-zai-jia-zai-shi-pin') }}</p>
            </div>

            <div class="error-container" v-else-if="error">
                <i class="fas fa-exclamation-circle"></i>
                <p>{{ error }}</p>
                <button class="retry-btn" @click="retryLoad">
                    <i class="fas fa-redo"></i> {{ $t('chong-shi') }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { get } from '../utils/request';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const videoPlayer = ref(null);
const videoUrl = ref('');
const videoTitle = ref(t('shi-pin-bo-fang'));
const loading = ref(true);
const error = ref('');

const isElectron = !!window.electron;
const shouldCloseWindow = isElectron || !!window.opener || window.history.length <= 1;

const mvhash = ref(route.query.hash || '');

const fetchVideoUrl = async () => {
    if (!mvhash.value) {
        error.value = t('que-shao-shi-pin-can-shu');
        loading.value = false;
        return;
    }

    try {
        loading.value = true;
        error.value = '';

        const videoResponse = await get('/video/url', {
            hash: mvhash.value
        });

        if (videoResponse.status === 1 && videoResponse.data) {
            // Get first key (dynamic hash value)
            const videoKey = Object.keys(videoResponse.data)[0];
            const videoData = videoResponse.data[videoKey];

            if (videoData && (videoData.backupdownurl || videoData.downurl)) {
                // Prefer backupdownurl; use first element if array
                const backupUrl = Array.isArray(videoData.backupdownurl)
                    ? videoData.backupdownurl[0]
                    : videoData.backupdownurl;

                videoUrl.value = backupUrl || videoData.downurl;

                if (route.query.title) {
                    videoTitle.value = decodeURIComponent(route.query.title);
                }
            } else {
                error.value = t('huo-qu-shi-pin-bo-fang-di-zhi-shi-bai');
            }
        } else {
            error.value = t('huo-qu-shi-pin-xin-xi-shi-bai');
        }
    } catch (err) {
        error.value = t('jia-zai-shi-pin-shi-bai');
    } finally {
        loading.value = false;
    }
};

const retryLoad = () => {
    fetchVideoUrl();
};

const handleVideoLoaded = () => {
    console.log('视频加载完成');
};

const handleVideoError = () => {
    error.value = t('shi-pin-bo-fang-shi-bai');
};

const goBack = () => {
    router.back();
};

const closeWindow = () => {
    window.close();
};

const handleBackAction = () => {
    if (shouldCloseWindow) {
        closeWindow();
        if (!window.closed && !window.opener && !isElectron) {
            router.push('/');
        }
        return;
    }
    goBack();
};

onMounted(() => {
    fetchVideoUrl();
});

onBeforeUnmount(() => {
    if (videoPlayer.value) {
        videoPlayer.value.pause();
        videoPlayer.value.src = '';
    }
});
</script>

<style lang="scss" scoped>
.video-player-page {
    width: 100%;
    height: 100vh;
    background-color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.video-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.video-header {
    background-color: rgba(0, 0, 0, 0.8);
    padding: 15px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
}

.back-btn {
    background: transparent;
    border: none;
    color: white;
    font-size: 16px;
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 4px;
    transition: background-color 0.3s;

    &:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
}

.video-title {
    color: white;
    font-size: 18px;
    margin: 0;
    flex: 1;
}

.video-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #000;
}

.video-element {
    width: 100%;
    height: 100%;
    max-height: 100%;
    object-fit: contain;
}

.loading-container,
.error-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    gap: 15px;

    i {
        font-size: 48px;
    }

    p {
        font-size: 16px;
        margin: 0;
    }
}

.loading-container i {
    color: #42b983;
}

.error-container i {
    color: #ff6b6b;
}

.retry-btn {
    background-color: #42b983;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s;

    &:hover {
        background-color: #35a372;
    }

    i {
        margin-right: 5px;
    }
}
</style>
