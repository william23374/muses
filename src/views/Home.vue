<template>
    <div class="container">
        <HomeRecommendations :playerControl="playerControl" />
        <h2 class="section-title" @click="addAllSongsToQueue">
            {{ $t('mei-ri-tui-jian') }}
        </h2>
        <CommonSkeleton v-if="isLoading" variant="compact-grid" :count="20" />
        <div v-else class="song-list">
            <div class="song-item" v-for="(song, index) in songs" :key="index"
                @click="playSong(song['hash'], song.ori_audio_name, $getCover(song.sizable_cover, 480), song.author_name)"
                @contextmenu.prevent="showContextMenu($event, song)">
                <img :src="$getCover(song.sizable_cover, 64)" :alt="song.ori_audio_name" class="song-cover">
                <div class="song-info">
                    <div class="song-title">{{ song.ori_audio_name }}</div>
                    <div class="song-artist">{{ song.author_name }}</div>
                </div>
            </div>
        </div>
        <h2 class="section-title">{{ $t('tui-jian-ge-dan') }}</h2>
        <div class="playlist-grid">
            <div class="playlist-item" v-for="(playlist, index) in special_list" :key="index">
                <router-link :to="{
                    path: '/PlaylistDetail',
                    query: { global_collection_id: playlist.global_collection_id }
                }">
                    <div class="playlist-cover-wrap">
                        <img :src="$getCover(playlist.flexible_cover, 240)" class="playlist-cover">
                        <span class="cover-play"><i class="fas fa-play"></i></span>
                    </div>
                    <div class="playlist-info">
                        <div class="playlist-title">{{ playlist.specialname }}</div>
                        <div class="playlist-description">{{ playlist.intro }}</div>
                    </div>
                </router-link>
            </div>
        </div>
        <ContextMenu ref="contextMenuRef" :playerControl="playerControl" />
        <BackToTop />
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { get } from '../utils/request';
import ContextMenu from '../components/ContextMenu.vue';
import BackToTop from '../components/BackToTop.vue';
import CommonSkeleton from '../components/CommonSkeleton.vue';
import HomeRecommendations from '../components/home/HomeRecommendations.vue';
import { useRoute, useRouter } from 'vue-router';
import { getCover } from '../utils/utils';
import { useActivatedWatch } from '../composables/useActivatedWatch';

const router = useRouter();
const route = useRoute();
const songs = ref([]);
const special_list = ref([]);
const isLoading = ref(true);
const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};
const contextMenuRef = ref(null);
const showContextMenu = (event, song) => {
    if (contextMenuRef.value) {
        contextMenuRef.value.openContextMenu(event, {
            OriSongName: song.filename,
            FileHash: song.hash,
            cover: song.sizable_cover?.replace("{size}", 480) || './assets/images/ico.png',
            timeLength: song.time_length
        });
    }
};
const props = defineProps({
    playerControl: Object
});

onMounted(() => {
    recommend();
    playlist();
});

const handleShareRoute = async (onCleanup) => {
    if (window.electron) return;

    let cancelled = false;
    await new Promise(resolve => {
        const timer = setTimeout(resolve, 1000);
        onCleanup(() => {
            cancelled = true;
            clearTimeout(timer);
        });
    });

    if (cancelled) return;

    if (route.query.hash) {
        privilegeSong(route.query.hash).then(res => {
            if (cancelled) return;
            if (res.status == 1) {
                const songInfo = res.data[0];
                playSong(songInfo.hash, songInfo.albumname, getCover(songInfo.info.image, 480), songInfo.singername)
                router.push('/');
            }
        })
    } else if (route.query.listid) {
        router.push({
            path: '/PlaylistDetail',
            query: { global_collection_id: route.query.listid }
        });
    }
};

useActivatedWatch(() => [route.query.hash, route.query.listid], (_value, _oldValue, onCleanup) => {
    handleShareRoute(onCleanup);
}, { immediate: true });

const recommend = async () => {
    const response = await get('/everyday/recommend');
    if (response.status == 1) {
        songs.value = response.data.song_list.sort(() => Math.random() - 0.5);
    }
    isLoading.value = false;
}

const playlist = async () => {
    const response = await get(`/top/playlist?category_id=0`);
    if (response.status == 1) {
        special_list.value = response.data.special_list;
    }
}

const privilegeSong = async (hash) => {
    const response = await get(`/privilege/lite`, { hash: hash });
    return response;
}
const addAllSongsToQueue = () => {
    props.playerControl.addPlaylistToQueue(songs.value.map(song => ({
        hash: song.hash,
        name: song.ori_audio_name,
        cover: song.sizable_cover?.replace("{size}", 480),
        author: song.author_name,
        timelen: song.time_length
    })));
};

</script>

<style lang="scss" scoped>
.container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 28px 40px;
    --home-song-title: var(--text-color);
    --home-song-artist: var(--secondary-color);
    --home-song-hover-bg: var(--background-color-secondary);
}

.section-title {
    position: relative;
    font-size: 28px;
    font-weight: 700;
    margin: 8px 0 18px;
    color: #1d1d1f;
    letter-spacing: -0.03em;
    cursor: pointer;

    &:is(.dark .section-title) {
        color: rgba(255, 255, 255, 0.92);
    }
}

.song-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px 24px;
    margin-bottom: 40px;
}

.song-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 8px 10px;
    border-radius: 10px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
        background-color: var(--home-song-hover-bg);

        .song-cover {
            filter: brightness(0.72);
        }

        &::after {
            opacity: 1;
            transform: scale(1);
        }
    }

    &::after {
        content: "\f04b";
        font-family: "Font Awesome 5 Free";
        font-weight: 900;
        position: absolute;
        left: 26px;
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        color: #fff;
        font-size: 12px;
        opacity: 0;
        transform: scale(0.9);
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: none;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
        z-index: 1;
    }
}

.song-cover {
    flex: 0 0 auto;
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 8px;
    transition: filter 0.2s ease;
}

.song-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.song-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--home-song-title);
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.song-artist {
    margin-top: 2px;
    font-size: 13px;
    color: var(--home-song-artist);
    opacity: 0.78;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.playlist-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 28px 20px;
}

.playlist-item {
    min-width: 0;
    padding: 0;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
    cursor: pointer;
    transition: transform 0.25s ease;

    &:hover {
        transform: none;

        .playlist-cover {
            transform: scale(1.02);
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
        }

        .cover-play {
            opacity: 1;
            transform: translateY(0);
        }
    }

    a {
        display: block;
        color: inherit;
        text-decoration: none;
    }
}

.playlist-cover-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 12px;
    background: var(--background-color-secondary);
}

.playlist-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 12px;
    transition: transform 0.35s ease, box-shadow 0.35s ease;
}

.cover-play {
    position: absolute;
    right: 10px;
    bottom: 10px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--primary-color);
    color: #fff;
    display: grid;
    place-items: center;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.25s ease, transform 0.25s ease;
    box-shadow: 0 6px 16px rgba(var(--primary-color-rgb), 0.35);
    pointer-events: none;
    font-size: 12px;
}

.playlist-info {
    padding: 10px 2px 0;
}

.playlist-title {
    font-weight: 600;
    margin-bottom: 4px;
    font-size: 16px;
    color: var(--text-color);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.35;
    min-height: 0;
}

.playlist-description {
    color: var(--secondary-color);
    font-size: 13px;
    opacity: 0.72;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.45;
    min-height: 0;
}

@media screen and (max-width: 1100px) {
    .playlist-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media screen and (max-width: 768px) {
    .container {
        padding: 16px;
    }

    .song-list {
        grid-template-columns: 1fr;
        gap: 2px;
    }

    .playlist-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px 12px;
    }

    .section-title {
        font-size: 24px;
    }
}
</style>
