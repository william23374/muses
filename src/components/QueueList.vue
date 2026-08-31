<template>
    <transition name="fade">
        <div v-if="showQueue" class="queue-popup">
            <div class="queue-header">
                <h3>
                    <span>{{ $t('bo-fang-lie-biao') }}</span> ({{ musicQueueStore.queue.length }})
                    <i class="fas fa-trash-alt close-store" @click="musicQueueStore.clearQueue()" :title="$t('qing-kong')"></i>
                </h3>
            </div>

            <RecycleScroller :items="musicQueueStore.queue" :item-size="50" key-field="id" :buffer="200"
                :items-limit="2000" :prerender="Math.min(10, musicQueueStore.queue.length)" ref="queueScroller"
                class="queue-list">
                <template #default="{ item, index }">
                    <li class="queue-item"
                        :class="{
                            'playing': currentSong.hash == item.hash && playing,
                            'paused': currentSong.hash == item.hash && !playing
                        }"
                        :key="item.id">
                        <div class="queue-song-info">
                            <span class="queue-song-title">{{ item.name }}</span>
                            <span class="queue-artist">{{ $formatMilliseconds(item.timeLength) }}</span>
                        </div>
                        <div class="queue-actions">
                            <button
                                class="queue-play-btn"
                                @click="handleQueuePlaybackClick(item)"
                            >
                                <i :class="queuePlaybackIcon(item)"></i>
                            </button>
                            <i
                                v-if="currentSong.hash != item.hash"
                                class="fas fa-times close-store"
                                @click="removeSongFromQueue(index);"
                            ></i>
                        </div>
                    </li>
                </template>
            </RecycleScroller>
        </div>
    </transition>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { RecycleScroller } from 'vue3-virtual-scroller';
import { useMusicQueueStore } from '../stores/musicQueue';
import { getTrackPlaybackIcon, getTrackPlaybackState, TRACK_PLAYBACK } from '../utils/playbackState';
import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css';

const props = defineProps({
    currentSong: {
        type: Object,
        required: true
    },
    playing: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    'update:showQueue',
    'addSongToQueue',
    'addCloudMusicToQueue',
    'addLocalMusicToQueue',
    'togglePlayPause'
]);

const musicQueueStore = useMusicQueueStore();
const queueScroller = ref(null);
const showQueue = ref(false);

const isLocalSong = (song) => !!song?.isLocal || String(song?.hash || '').startsWith('local_');

const queuePlaybackState = (item) => getTrackPlaybackState({
    isCurrent: props.currentSong?.hash === item?.hash,
    isPlaying: props.playing
});

const queuePlaybackIcon = (item) => getTrackPlaybackIcon(queuePlaybackState(item));

// Remove song from queue
const removeSongFromQueue = (index) => {
    const updatedQueue = [...musicQueueStore.queue];
    updatedQueue.splice(index, 1);
    updatedQueue.forEach((song, i) => {
        song.id = i + 1;
    });
    musicQueueStore.setQueue(updatedQueue);
};

// Play queue item
const playQueueItem = (item) => {
    console.log('[QueueList] 点击播放队列中的歌曲:', item.name);
    showQueue.value = false; // Close queue panel on click
    if (item.isCloud) {
        emit('addCloudMusicToQueue', item.hash, item.name, item.author, item.timeLength, item.img);
    } else if (isLocalSong(item)) {
        emit('addLocalMusicToQueue', {
            ...item,
            isLocal: true
        });
    } else {
        emit('addSongToQueue', item.hash, item.name, item.img, item.author);
    }
};

const handleQueuePlaybackClick = (item) => {
    const state = queuePlaybackState(item);
    if (state === TRACK_PLAYBACK.PLAYING || state === TRACK_PLAYBACK.PAUSED) {
        emit('togglePlayPause');
        return;
    }
    playQueueItem(item);
};

// Scroll to current playing song position
const openQueue = async () => {
    showQueue.value = !showQueue.value;
    if (showQueue.value) {
        await nextTick();
        setTimeout(() => {
            const currentIndex = musicQueueStore.queue.findIndex(song => song.hash === props.currentSong.hash);
            queueScroller.value.scrollToItem(currentIndex - 3);
        }, 100);
    }
};

const handleClickOutside = (event) => {
    const queuePopup = document.querySelector('.queue-popup');
    if (queuePopup && !queuePopup.contains(event.target) && !event.target.closest('.extra-btn')) {
        showQueue.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});

defineExpose({
    openQueue,
    removeSongFromQueue
});
</script>
<style lang="scss" scoped>
.queue-popup {
    position: fixed;
    right: 20px;
    bottom: 100px;
    width: 300px;
    max-height: 400px;
    background: #fff;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    padding: 10px;
    z-index: 2;
    overflow-y: auto;
}

.queue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    position: sticky;
    top: 0px;
    z-index: 1;
    border-radius: 5px;
    padding: 5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    h3 {
        margin: 0;
        font-size: 1.2em;
        color: var(--text-color);
    }
}

.queue-list {
    list-style: none;
    padding: 0;
    margin: 0;
    flex: 1;
    overflow-y: auto;
    height: 350px;
    scroll-behavior: smooth;
}

.queue-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #ddd;

    &.playing,
    &.paused {
        .queue-song-title {
            color: var(--primary-color);
            font-weight: bold;
        }

        .queue-artist {
            color: var(--primary-color);
        }
    }
}

.queue-song-info {
    display: flex;
    flex-direction: column;
}

.queue-song-title {
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 250px;
}

.queue-artist {
    font-size: 0.9em;
    color: #666;
}

.queue-actions {
    display: flex;
    align-items: center;
}

.queue-play-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--primary-color);
    cursor: pointer;
}

.close-store {
    margin-left: 8px;
    cursor: pointer;
    font-size: 14px;
}
</style>
