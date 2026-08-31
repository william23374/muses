<template>
    <div class="detail-page">
        <!-- Header info section -->
        <div class="header detail-sliver-header" :style="headerStyle">
            <CommonSkeleton v-if="loading" variant="detail-header" />
            <template v-else>
                <div class="cover-art system-cover cloud" :style="coverStyle">
                    <i class="fas fa-cloud"></i>
                </div>
            <div class="info" :style="infoStyle">
                <h1 class="title" :style="titleStyle">{{ $t('wo-de-yun-pan') }}</h1>
                <div class="expanded-info" :style="detailsStyle">
                    <p class="subtitle">{{ $t('yun-pan-ge-qu-shu') }}: {{ displayTrackCount }}</p>
                    <div class="storage-info" v-if="storageInfo.totalSize > 0">
                        <div class="storage-progress">
                            <div class="storage-progress-bar" :style="storageUsageStyle"></div>
                        </div>
                        <div class="storage-text">
                            {{ formatStorageSize(storageInfo.usedSize) }} / {{ formatStorageSize(storageInfo.totalSize) }}
                            ({{ $t('ke-yong') }}: {{ formatStorageSize(storageInfo.availableSize) }})
                        </div>
                    </div>
                    <div class="description">{{ $t('yun-pan-miao-shu') }}</div>
                    <div class="actions">
                        <button class="primary-btn" @click="addPlaylistToQueue($event)">
                            <i class="fas fa-play"></i> {{ $t('bo-fang') }}
                        </button>
                        <button class="upload-btn" :class="{ 'uploading': isUploading }" @click="uploadMusic">
                            <i class="fas" :class="isUploading ? 'fa-spinner fa-spin' : 'fa-upload'"></i>
                            {{ isUploading ? t('shang-chuan-zhong', { current: uploadProgress.current, total: uploadProgress.total, percent: uploadProgress.percent }) : $t('shang-chuan-yin-le') }}
                        </button>
                        <input ref="uploadInputRef" type="file" multiple
                            accept=".mp3,.flac,.wav,.m4a,.aac,.ogg,.ape,.wma" style="display: none"
                            @change="handleFileSelect" />
                    </div>
                </div>
            </div>
            <button class="collapsed-play-btn" :style="collapsedActionsStyle" @click="addPlaylistToQueue($event)"
                :title="$t('bo-fang')">
                <i class="far fa-play-circle"></i>
            </button>
            </template>
        </div>
        <div class="detail-sliver-spacer" :style="spacerStyle"></div>

        <!-- Navigation buttons -->
        <i class="location-arrow fas fa-crosshairs" @click="scrollToItem" :title="t('dang-qian-bo-fang-ge-qu')"></i>

        <!-- Song list -->
        <div class="track-list-container">
            <div class="track-list-header" :style="listHeaderStyle">
                <h2 class="track-list-title" :style="listTitleStyle"><span>{{ $t('yun-pan-ge-qu') }}</span> ( {{ displayTrackCount }} )</h2>
                <div class="track-list-actions">
                    <div class="batch-action-container">
                        <button class="batch-action-btn" @click="toggleBatchSelection"
                            :class="{ 'active': batchSelectionMode }">
                            <input type="checkbox" v-model="batchSelectionMode" /> {{ $t('pi-liang-cao-zuo') }}
                            <span v-if="selectedTracks.length > 0" class="selected-count">{{ selectedTracks.length
                                }}</span>
                        </button>
                        <div v-if="batchSelectionMode && isBatchMenuVisible && selectedTracks.length > 0"
                            class="batch-actions-menu">
                            <ul>
                                <li @click="appendSelectedToQueue"><i class="fas fa-list"></i> {{ $t('tian-jia-dao-bo-fang-lie-biao') }}</li>
                                <li @click="deleteSelectedFromCloud"><i class="fas fa-trash-alt"></i> {{
                                    $t('cong-yun-pan-shan-chu') }}</li>
                            </ul>
                        </div>
                    </div>
                    <button class="view-mode-btn" @click="toggleListMode"
                        :title="listMode === 'list' ? t('qie-huan-dao-wang-ge-shi-tu') : t('qie-huan-dao-lie-biao-shi-tu')">
                        <i class="fas" :class="listMode === 'list' ? 'fa-th' : 'fa-list'"></i>
                    </button>
                    <input type="text" v-model="searchQuery" @keyup.enter="searchTracks"
                        :placeholder="t('sou-suo-ge-qu')" class="search-input" />
                </div>
            </div>

            <!-- Table header -->
            <div class="track-list-header-row" :style="trackHeaderStyle">
                <div class="track-checkbox-header" v-if="batchSelectionMode">
                    <input type="checkbox" :checked="isAllSelected" @click="toggleSelectAll">
                </div>
                <div class="track-number-header" v-else>♪</div>
                <div class="track-title-header" @click="sortTracks('name')">
                    {{ $t('lie-biao-wen-jian-ming') }} <i class="fas" :class="getSortIconClass('name')"></i>
                </div>
                <div class="track-artist-header" @click="sortTracks('author')">
                    {{ $t('lie-biao-ge-shou') }} <i class="fas" :class="getSortIconClass('author')"></i>
                </div>
                <div class="track-size-header" @click="sortTracks('size')">
                    {{ $t('lie-biao-wen-jian-da-xiao') }} <i class="fas" :class="getSortIconClass('size')"></i>
                </div>
                <div class="track-timelen-header" @click="sortTracks('timelen')">
                    {{ $t('lie-biao-shi-jian') }} <i class="fas" :class="getSortIconClass('timelen')"></i>
                </div>
            </div>

            <div v-if="isSearching" class="search-loading-overlay">
                <div class="search-loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>{{ $t('zheng-zai-jia-zai-quan-bu-ge-qu') }}</span>
                </div>
            </div>

            <RecycleScroller v-else ref="recycleScrollerRef" :items="filteredTracks" :item-size="listMode === 'list' ? 50 : 70"
                class="track-list" key-field="hash" page-mode :buffer="400" :emit-update="true"
                @update="handleVirtualUpdate">
                <template #default="{ item, index }">
                    <div class="li" :key="item.hash"
                        :class="{ 'cover-view': listMode === 'grid', 'selected': batchSelectionMode && selectedTracks.includes(index) }"
                        @click="batchSelectionMode ? selectTrack(index, $event) : handleTrackPlaybackClick(item)">

                        <!-- Checkbox or index number -->
                        <div class="track-checkbox" v-if="batchSelectionMode">
                            <input type="checkbox" :checked="selectedTracks.includes(index)"
                                @click.stop="selectTrack(index, $event)">
                        </div>
                        <div class="track-number" v-else :class="trackPlaybackClass(item)">
                            <div v-if="trackPlaybackStateForItem(item) === 'playing'" class="sound-wave">
                                <span></span><span></span><span></span>
                            </div>
                            <span v-else class="track-index">{{ index + 1 }}</span>
                            <button
                                class="track-playback-btn"
                                type="button"
                                :class="trackPlaybackIcon(item)"
                                @click.stop="handleTrackPlaybackClick(item)"
                            ></button>
                        </div>

                        <!-- Grid mode cover -->
                        <div class="track-cover" v-if="listMode === 'grid'">
                            <img :src="item.cover || './assets/images/ico.png'" alt="Cover">
                            <div class="track-cover-overlay">
                                <i :class="trackPlaybackIcon(item)"></i>
                            </div>
                        </div>

                        <!-- Song info -->
                        <div class="track-title" :title="item.name">{{ item.name }}
                            <span v-if="item.qualityInfo" class="icon" :class="item.qualityInfo.class">{{
                                item.qualityInfo.text }}</span>
                        </div>
                        <div class="track-artist" :title="item.author">{{ item.author }}</div>
                        <div class="track-size" :title="item.filesize">{{ item.filesize }}</div>
                        <div class="track-timelen">
                            {{ $formatMilliseconds(item.timelen) }}
                        </div>
                    </div>
                </template>
            </RecycleScroller>
        </div>

        <div class="note-container">
            <transition-group name="fly-note">
                <div v-for="note in flyingNotes" :key="note.id" class="flying-note" :style="note.style">♪</div>
            </transition-group>
        </div>
    </div>
    <PageScrollbar />
    <BackToTop bottom="100px" right="12px" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import { RecycleScroller } from 'vue3-virtual-scroller';
import PageScrollbar from '../components/PageScrollbar.vue';
import BackToTop from '../components/BackToTop.vue';
import CommonSkeleton from '../components/CommonSkeleton.vue';
import { get, post } from '../utils/request';
import { useRouter } from 'vue-router';
import { MusesAuthStore } from '../stores/store';
import { useI18n } from 'vue-i18n';
import { useStickyDetailHeader } from '@/composables/useStickyDetailHeader';
import {
    getTrackPlaybackIcon,
    getTrackPlaybackState,
    TRACK_PLAYBACK
} from '@/utils/playbackState';


const { t } = useI18n();
const MusesAuth = MusesAuthStore();
const router = useRouter();

// Shared state
const tracks = ref([]);
const filteredTracks = ref([]);
const searchQuery = ref('');
const pageSize = 60;
const maxPageSize = 300;
const currentPage = ref(1);
const hasMore = ref(true);
const isLoadingMore = ref(false);
const totalCount = ref(0);
const recycleScrollerRef = ref(null);
const loading = ref(true);
const isSearching = ref(false);
const flyingNotes = ref([]);
let noteId = 0;

// Upload state
const uploadInputRef = ref(null);
const isUploading = ref(false);
const uploadProgress = ref({ current: 0, total: 0, percent: 0 });
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // Server request body limit 100MB
// Bypass API 2-minute response cache after upload
let cacheBust = 0;
const cacheBustParams = () => (cacheBust ? { timestamp: cacheBust } : {});

// Cloud drive storage info
const storageInfo = ref({
    totalSize: 0,
    usedSize: 0,
    availableSize: 0
});

// Batch selection state
const batchSelectionMode = ref(false);
const isBatchMenuVisible = ref(false);
const selectedTracks = ref([]);
let lastSelectedIndex = -1;

// Sort state
const sortField = ref('');
const sortOrder = ref('asc');

// List mode state
const listMode = ref(localStorage.getItem('cloudDriveListMode') || 'list');

// Check if all selected
const isAllSelected = computed(() => {
    return selectedTracks.value.length === filteredTracks.value.length && filteredTracks.value.length > 0;
});

const displayTrackCount = computed(() => {
    return hasMore.value ? totalCount.value : tracks.value.length;
});

const props = defineProps({
    playerControl: Object
});

const {
    headerStyle,
    spacerStyle,
    coverStyle,
    infoStyle,
    titleStyle,
    detailsStyle,
    listTitleStyle,
    collapsedActionsStyle,
    listHeaderStyle,
    trackHeaderStyle
} = useStickyDetailHeader();

const storageUsageStyle = computed(() => ({
    width: `${storageInfo.value.totalSize ? storageInfo.value.usedSize / storageInfo.value.totalSize * 100 : 0}%`
}));

onMounted(() => {
    loadData();
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

const loadData = async () => {
    if (!MusesAuth.isAuthenticated) {
        router.push('/login');
        return;
    }
    await fetchCloudTracks();
};

// Fetch cloud drive songs
const fetchCloudTracks = async () => {
    currentPage.value = 1;
    hasMore.value = true;
    loading.value = true;
    isSearching.value = false;
    totalCount.value = 0;
    tracks.value = [];
    filteredTracks.value = [];

    try {
        const curPage = currentPage.value;
        const firstPageResponse = await get('/user/cloud', {
            page: curPage,
            pagesize: pageSize,
            ...cacheBustParams()
        });

        applyCloudResponse(firstPageResponse, true, curPage, pageSize);
    } catch (error) {
        $message.error(t('ge-qu-shu-ju-cuo-wu'));
        console.error('获取云盘歌曲失败:', error);
    } finally {
        loading.value = false;
    }
};

// Fetch single page of cloud data
const fetchCloudPage = async (page) => {
    try {
        const response = await get('/user/cloud', {
            page,
            pagesize: pageSize,
            ...cacheBustParams()
        });

        return response;
    } catch (error) {
        console.error('获取更多云盘歌曲失败:', error);
    }
    return null;
};

const applyCloudResponse = (response, replace, curPage, curPageSize) => {
    if (!response || response.status !== 1) {
        hasMore.value = false;
        return;
    }

    if (response.data.type_size) {
        const { max_size, used_size, availble_size } = response.data;
        storageInfo.value = {
            totalSize: max_size || 0,
            usedSize: used_size || 0,
            availableSize: availble_size || 0
        };
    }

    const songList = response.data.list || response.data.info || [];
    const formattedTracks = formatTrackList(songList);
    totalCount.value = response.data.list_count ?? (replace ? formattedTracks.length : totalCount.value);
    tracks.value = replace ? formattedTracks : [...tracks.value, ...formattedTracks];
    filteredTracks.value = tracks.value;
    currentPage.value = curPage + 1;
    hasMore.value = songList.length >= curPageSize && tracks.value.length < totalCount.value;
};

const loadMoreTracks = async () => {
    if (loading.value || isLoadingMore.value || !hasMore.value) return;

    isLoadingMore.value = true;

    try {
        const curPage = currentPage.value;
        const response = await fetchCloudPage(curPage);
        applyCloudResponse(response, false, curPage, pageSize);
    } finally {
        isLoadingMore.value = false;
    }
};

const handleVirtualUpdate = (startIndex, endIndex) => {
    if (loading.value || searchQuery.value.trim()) return;
    if (Math.max(startIndex, endIndex) >= filteredTracks.value.length - 1) {
        loadMoreTracks();
    }
};

const loadAllRemainingTracks = async (onAppend) => {
    while (isLoadingMore.value) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!hasMore.value) return;

    isLoadingMore.value = true;
    try {
        const loadedHashes = new Set(tracks.value.map(track => track.hash));
        let page = Math.floor(tracks.value.length / maxPageSize) + 1;

        while (hasMore.value) {
            const response = await get('/user/cloud', {
                page,
                pagesize: maxPageSize,
                ...cacheBustParams()
            });

            if (!response || response.status !== 1) break;

            if (response.data.type_size) {
                const { max_size, used_size, availble_size } = response.data;
                storageInfo.value = {
                    totalSize: max_size || 0,
                    usedSize: used_size || 0,
                    availableSize: availble_size || 0
                };
            }

            const songList = response.data.list || response.data.info || [];
            if (songList.length === 0) {
                hasMore.value = false;
                return;
            }

            totalCount.value = response.data.list_count ?? totalCount.value;
            const newTracks = formatTrackList(songList).filter(track => !loadedHashes.has(track.hash));
            if (newTracks.length > 0) {
                tracks.value = [...tracks.value, ...newTracks];
                filteredTracks.value = tracks.value;
                newTracks.forEach(track => loadedHashes.add(track.hash));
                onAppend?.(newTracks);
            }

            hasMore.value = songList.length >= maxPageSize && tracks.value.length < totalCount.value;
            page++;
        }

        currentPage.value = Math.floor(tracks.value.length / pageSize) + 1;
    } finally {
        isLoadingMore.value = false;
    }
};

// Fetch quality info
const getQualityInfo = (bitrate) => {
    switch (bitrate) {
        case 3:
            return { text: 'HQ', class: 'hq-icon' };
        case 4:
            return { text: 'SQ', class: 'sq-icon' };
        case 5:
            return { text: 'HR', class: 'hr-icon' };
        default:
            return null;
    }
};

// Format song list data
const formatTrackList = (songList) => {
    return songList.map(track => {
        const qualityInfo = getQualityInfo(track.bitrate || 0);
        return {
            hash: track.hash || '',
            OriSongName: track.filename || '',
            name: track.name,
            author: track.author_name || t('yun-pan-yin-le'),
            album: track.album_name || t('yun-pan-yin-le'),
            timelen: track.timelen || 0,
            qualityInfo: qualityInfo,
            fileid: track?.fileid || track?.kv_id || 0,
            filesize: formatStorageSize(track.size) || 0,
            bitrate: track.bitrate || 0,
            cover: track?.album_info?.sizable_cover?.replace("{size}", 480) || track?.authors?.[0]?.sizable_avatar?.replace("{size}", 480)
        };
    });
};

// Toggle list mode
const toggleListMode = () => {
    listMode.value = listMode.value === 'list' ? 'grid' : 'list';
    localStorage.setItem('cloudDriveListMode', listMode.value);
};

// Format storage size
const formatStorageSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Search songs
const searchTracks = async () => {
    if (hasMore.value) {
        isSearching.value = true;
        try {
            await loadAllRemainingTracks();
        } finally {
            isSearching.value = false;
        }
    }

    filteredTracks.value = tracks.value.filter(track =>
        track.name.toLowerCase().trim().includes(searchQuery.value.toLowerCase().trim()) ||
        track.author.toLowerCase().trim().includes(searchQuery.value.toLowerCase().trim())
    );
};

// Play song
const playSong = async (hash, name, author, timeLength, cover) => {
    name = name && name.includes(' - ') ? name.split(' - ')[1] : name;
    props.playerControl.addCloudMusicToQueue(hash, name, author, timeLength, cover);
};

const isCurrentCloudSong = (item) => props.playerControl?.currentSong?.hash === item?.hash;

const trackPlaybackStateForItem = (item) => getTrackPlaybackState({
    isCurrent: isCurrentCloudSong(item),
    isPlaying: !!props.playerControl?.playing
});

const trackPlaybackIcon = (item) => getTrackPlaybackIcon(trackPlaybackStateForItem(item));

const trackPlaybackClass = (item) => {
    const state = trackPlaybackStateForItem(item);
    return {
        'is-current': state !== TRACK_PLAYBACK.STOPPED,
        'is-playing': state === TRACK_PLAYBACK.PLAYING,
        'is-paused': state === TRACK_PLAYBACK.PAUSED
    };
};

const handleTrackPlaybackClick = (item) => {
    const state = trackPlaybackStateForItem(item);
    if (state === TRACK_PLAYBACK.PLAYING || state === TRACK_PLAYBACK.PAUSED) {
        props.playerControl?.togglePlayPause?.();
        return;
    }
    playSong(item.hash, item.name, item.author, item.timelen, item.cover);
};

// Add entire playlist to queue
const loadAndAppendRemainingTracks = async () => {
    await loadAllRemainingTracks((newTracks) => {
        props.playerControl.addCloudPlaylistToQueue(newTracks, true);
    });
};

const addPlaylistToQueue = async (event, append = false) => {
    const playButton = event.currentTarget;
    const rect = playButton.getBoundingClientRect();
    const note = {
        id: noteId++,
        style: {
            '--start-x': `${rect.left + rect.width / 2}px`,
            '--start-y': `${rect.top + rect.height / 2}px`,
            'left': '0',
            'top': '0'
        }
    };
    flyingNotes.value.push(note);
    setTimeout(() => {
        flyingNotes.value = flyingNotes.value.filter(n => n.id !== note.id);
    }, 1500);
    props.playerControl.addCloudPlaylistToQueue(filteredTracks.value, append);
    if (hasMore.value) {
        loadAndAppendRemainingTracks();
    }
};

const uploadMusic = () => {
    if (isUploading.value) return;
    uploadInputRef.value?.click();
};

// Read audio duration (ms); 0 on failure
const getAudioDuration = (file) => new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (ms) => {
        URL.revokeObjectURL(url);
        resolve(ms);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
    audio.onerror = () => done(0);
    audio.src = url;
});

// Estimate quality tier (3=HQ 4=SQ, matches cloud bitrate); 0 if unknown
const getUploadQuality = (file, extendname, timelen) => {
    if (['flac', 'ape', 'wav'].includes(extendname)) return 4;
    if (!timelen) return 0;
    const kbps = (file.size * 8) / (timelen / 1000) / 1000;
    return kbps >= 300 ? 3 : 0;
};

// Upload file to cloud; metadata in query, binary body
const uploadFile = async (file) => {
    const dotIndex = file.name.lastIndexOf('.');
    const extendname = dotIndex > -1 ? file.name.slice(dotIndex + 1).toLowerCase() : 'mp3';
    const baseName = dotIndex > -1 ? file.name.slice(0, dotIndex) : file.name;
    const separatorIndex = baseName.indexOf(' - ');
    const authorName = separatorIndex > -1 ? baseName.slice(0, separatorIndex).trim() : '';
    const timelen = await getAudioDuration(file);
    const quality = getUploadQuality(file, extendname, timelen);

    return post('/user/cloud/upload', file, {
        params: {
            name: file.name,
            author_name: authorName,
            extendname,
            timelen,
            // Omit quality if unknown — server default
            ...(quality ? { bitrate: quality } : {})
        },
        headers: { 'Content-Type': 'application/octet-stream' },
        timeout: 0,
        onUploadProgress: (e) => {
            // After local API upload, server chunks to Kugou — cap progress at 99%
            if (e.total) uploadProgress.value.percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
        }
    });
};

const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || isUploading.value) return;

    isUploading.value = true;
    uploadProgress.value = { current: 0, total: files.length, percent: 0 };
    let successCount = 0;

    for (const [index, file] of files.entries()) {
        uploadProgress.value.current = index + 1;
        uploadProgress.value.percent = 0;

        if (file.size > MAX_UPLOAD_SIZE) {
            $message.error(t('wen-jian-chao-guo-100mb', { name: file.name }));
            continue;
        }
        if (storageInfo.value.availableSize > 0 && file.size > storageInfo.value.availableSize) {
            $message.error(t('yun-pan-kong-jian-bu-zu'));
            break;
        }

        try {
            const response = await uploadFile(file);
            if (response?.status === 1) {
                successCount++;
                uploadProgress.value.percent = 100;
            } else {
                console.error('上传云盘失败:', response);
                $message.error(t('wen-jian-shang-chuan-shi-bai', { name: file.name }));
            }
        } catch (error) {
            console.error('上传云盘失败:', error);
            const msg = error?.response?.data?.msg;
            $message.error(msg
                ? t('wen-jian-shang-chuan-shi-bai-xiang-qing', { name: file.name, msg })
                : t('wen-jian-shang-chuan-shi-bai', { name: file.name }));
        }
    }

    isUploading.value = false;
    if (successCount > 0) {
        $message.success(t('cheng-gong-shang-chuan-ge-qu', { n: successCount }));
        cacheBust = Date.now();
        fetchCloudTracks();
    }
};

// Scroll to currently playing song
const scrollToTrackIndex = async (index) => {
    await nextTick();
    const scrollContainer = document.querySelector('.app-main-scroll');
    const scrollerElement = recycleScrollerRef.value?.$el;
    if (!scrollContainer || !scrollerElement) return;

    const targetIndex = Math.max(0, index - 5);
    const itemSize = listMode.value === 'list' ? 50 : 70;
    const offsetTop = scrollContainer.scrollTop + scrollerElement.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top;

    scrollContainer.scrollTo({
        top: Math.max(0, offsetTop + targetIndex * itemSize),
        behavior: 'smooth'
    });
};

const scrollToItem = async () => {
    const currentHash = props.playerControl?.currentSong?.hash;
    if (!currentHash) return;

    let currentIndex = filteredTracks.value.findIndex(song => song.hash === currentHash);
    if (currentIndex === -1 && hasMore.value && !searchQuery.value.trim()) {
        try {
            await loadAllRemainingTracks();
            currentIndex = filteredTracks.value.findIndex(song => song.hash === currentHash);
        } catch (error) {
            console.error('scrollToItem failed:', error);
        }
    }

    if (currentIndex !== -1) {
        await scrollToTrackIndex(currentIndex);
    }
};

const handleClickOutside = (event) => {
    const batchActionsMenu = document.querySelector('.batch-actions-menu');
    const batchActionBtn = document.querySelector('.batch-action-btn');
    if (batchActionsMenu && !batchActionsMenu.contains(event.target) && !batchActionBtn.contains(event.target)) {
        isBatchMenuVisible.value = false;
    }
};

// Toggle batch selection mode
const toggleBatchSelection = () => {
    if (batchSelectionMode.value) {
        // In batch mode: toggle menu or exit mode
        if (isBatchMenuVisible.value) {
            // If menu is open, click exits batch selection mode
            batchSelectionMode.value = false;
            isBatchMenuVisible.value = false;
            selectedTracks.value = [];
            lastSelectedIndex = -1;
        } else {
            // If menu is closed, show menu
            isBatchMenuVisible.value = true;
        }
    } else {
        // First entry into batch selection mode
        batchSelectionMode.value = true;
        isBatchMenuVisible.value = false;
    }
};

// Select/deselect song
const selectTrack = (index, event) => {
    if (event.shiftKey && lastSelectedIndex !== -1) {
        // Shift-click multi-select
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);

        for (let i = start; i <= end; i++) {
            if (!selectedTracks.value.includes(i)) {
                selectedTracks.value.push(i);
            }
        }
    } else if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd selective multi-select
        const existingIndex = selectedTracks.value.indexOf(index);
        if (existingIndex === -1) {
            selectedTracks.value.push(index);
        } else {
            selectedTracks.value.splice(existingIndex, 1);
        }
    } else {
        // Normal click
        const existingIndex = selectedTracks.value.indexOf(index);
        if (existingIndex === -1) {
            selectedTracks.value = [index];
        } else {
            selectedTracks.value = [];
        }
    }

    lastSelectedIndex = index;
};

// Add selected songs to queue (append to current queue)
const appendSelectedToQueue = async () => {
    if (selectedTracks.value.length === 0) return;
    const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
    await props.playerControl.addCloudPlaylistToQueue(selectedSongs, true);
    $message.success(t('tian-jia-dao-bo-fang-lie-biao-cheng-gong'));
    isBatchMenuVisible.value = false;
};

const deleteFilesFromCloud = async (fileids = []) => {
    if(!fileids || !fileids.length) return;
    return await get(`/user/cloud/del?fileid=${fileids.join(',')}`);
}

// Delete selected songs from cloud drive
const deleteSelectedFromCloud = async () => {
    if (selectedTracks.value.length === 0) return;
    const result = await window.$modal.confirm(t('que-ren-shan-chu-yun-pan-ge-qu'));
    if (result) {
        const fileids = [], skipped = [];
        selectedTracks.value.sort((a, b) => b - a).forEach(index => {
            if(filteredTracks.value[index].fileid)
                fileids.push(filteredTracks.value[index].fileid);
            else
                skipped.push(filteredTracks.value[index].name);
            filteredTracks.value.splice(index, 1);
            tracks.value = tracks.value.filter((_, i) => 
                !selectedTracks.value.includes(i)
            );
        });
        if(fileids.length) {
            const res = await deleteFilesFromCloud(fileids);
            if(!res.status) {
                $modal.alert(t('shan-chu-shi-bai-cuo-wu-ma', { code: res.error_code }));
                return;
            }
            storageInfo.value = {
                availableSize: res.data.availble_size,
                usedSize: res.data.used_size,
                totalSize: res.data.max_size
            }
        }
        if(skipped.length) {
            $modal.alert(t('shan-chu-cheng-gong-bu-fen-tiao-guo', { list: skipped.join('\n') }));
            return;
        }
        filteredTracks.value = [...tracks.value];
        selectedTracks.value = [];
        $message.success(t('shan-chu-cheng-gong'));
    }
    isBatchMenuVisible.value = false;
};

// Toggle select all / deselect all
const toggleSelectAll = () => {
    if (isAllSelected.value) {
        selectedTracks.value = [];
    } else {
        selectedTracks.value = Array.from({ length: filteredTracks.value.length }, (_, i) => i);
    }
};

// Sort by field
const sortTracks = async (field) => {
    if (hasMore.value) {
        isSearching.value = true;
        try {
            await loadAllRemainingTracks();
        } finally {
            isSearching.value = false;
        }
    }

    if (sortField.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortField.value = field;
        sortOrder.value = 'asc';
    }

    filteredTracks.value = [...filteredTracks.value].sort((a, b) => {
        let valueA, valueB;

        if (field === 'timelen') {
            valueA = a[field] || 0;
            valueB = b[field] || 0;
        } else if (field === 'size') {
            const parseSize = (sizeStr) => {
                if (!sizeStr) return 0;
                const match = sizeStr.match(/^([\d.]+)\s*([KMGTP]?B)$/i);
                if (!match) return 0;
                const [, num, unit] = match;
                const value = parseFloat(num);
                const units = { 'B': 1, 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024, 'TB': 1024 * 1024 * 1024 * 1024 };
                return value * (units[unit.toUpperCase()] || 1);
            };
            valueA = parseSize(a.filesize);
            valueB = parseSize(b.filesize);
        } else {
            valueA = (a[field] || '').toLowerCase();
            valueB = (b[field] || '').toLowerCase();
        }

        if (sortOrder.value === 'asc') {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });

    if (batchSelectionMode.value) {
        selectedTracks.value = [];
    }
};

const getSortIconClass = (field) => {
    if (sortField.value !== field) {
        return 'fa-sort';
    }
    return sortOrder.value === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
};


</script>

<style lang="scss" scoped>
$primary: var(--primary-color);
$text-muted: #666;
$border-light: #eee;
$bg-light: #e0e0e0;
$white: white;
$shadow-light: 0 2px 10px rgba(0, 0, 0, 0.1);

.detail-page {
    padding: 20px;
}

.header {
    display: flex;
    align-items: center;
}

.detail-sliver-header {
    position: sticky;
    z-index: 116;
    box-sizing: border-box;
    overflow: hidden;
    align-items: flex-start;
    padding: 10px 0;
    background: #fff;
    gap: 20px;
}

.detail-sliver-spacer {
    pointer-events: none;
    background: #fff;
}

.cover-art {
    flex: 0 0 auto;
    width: 200px;
    height: 200px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    object-fit: cover;
    transition: box-shadow 0.2s ease;

    &.system-cover {
        display: grid;
        place-items: center;
        color: #fff;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

        i {
            font-size: var(--system-cover-icon-size, 72px);
            line-height: 1;
            filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.12));
        }

        &.cloud {
            background: linear-gradient(160deg, #64d2ff 0%, #0a84ff 100%);
        }
    }
}

.info {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    max-width: calc(100% - 110px);
}

.title {
    flex: 0 0 auto;
    font-size: 36px;
    font-weight: bold;
    width: 100%;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;
    color: $primary;
}

.expanded-info {
    display: flex;
    flex-direction: column;
    transition: opacity 0.12s linear;
}

.collapsed-play-btn {
    position: absolute;
    top: 50%;
    right: 18px;
    width: 38px;
    height: 38px;
    padding: 0;
    border: none;
    background: transparent;
    color: $primary;
    cursor: pointer;
    font-size: 30px;
    line-height: 1;
    transition: color 0.2s ease, opacity 0.2s ease;

    &:hover {
        color: var(--color-primary);
    }
}

.subtitle {
    font-size: 18px;
    line-height: 1.35;
    margin: 6px 0 0;
    color: $text-muted;
}

.storage-info {
    margin: 8px 0;
    width: 100%;
    max-width: 600px;
}

.storage-progress {
    height: 6px;
    background-color: $bg-light;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 5px;

    &-bar {
        height: 100%;
        background-color: $primary;
        border-radius: 3px;
    }
}

.storage-text {
    font-size: 14px;
    color: $text-muted;
    display: flex;
    justify-content: space-between;
}

.description {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-height: 1.45;
    color: var(--text-color);
    margin: 0 0 12px;
    font-size: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.actions {
    display: flex;
    gap: 10px;
}

.primary-btn,
.upload-btn {
    background-color: $primary;
    color: $white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;

    i {
        margin-right: 5px;
    }
}

.upload-btn {
    background-color: #4caf50;

    &.uploading {
        opacity: 0.75;
        cursor: not-allowed;
    }
}

.track-list-container {
}

.track-list-header {
    position: sticky;
    z-index: 115;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
}

.track-list-title {
    font-size: 24px;
    font-weight: bold;
    color: $primary;
}

.track-list-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.batch-action-container {
    position: relative;
}

.batch-action-btn {
    background-color: transparent;
    border: 1px solid var(--secondary-color);
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    position: relative;

    &.active {
        background-color: $primary;
        color: $white;
    }
}

.selected-count {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: red;
    color: $white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
}

.batch-actions-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background-color: $white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: $shadow-light;
    z-index: 50;
    margin-top: 5px;
    width: 200px;

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    li {
        padding: 10px 15px;
        cursor: pointer;
        display: flex;
        align-items: center;
        white-space: nowrap;

        i {
            margin-right: 10px;
            width: 16px;
            text-align: center;
        }

        &:hover {
            background-color: #f0f0f0;
        }
    }
}

.search-input {
    width: 250px;
    padding: 8px;
    border: 1px solid var(--secondary-color);
    border-radius: 20px;
    box-sizing: border-box;
    padding-left: 15px;
}

.track-list {
    width: 100%;
}

.search-loading-overlay {
    height: 800px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 150px;
    border-radius: 0 0 5px 5px;
}

.search-loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    color: var(--text-color);

    i {
        font-size: 48px;
        color: $primary;
    }

    span {
        font-size: 16px;
        color: $text-muted;
    }
}

.li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 50px;
    padding: 10px;
    box-sizing: border-box;
    border-bottom: 1px solid $border-light;
    border-radius: 5px;
    cursor: pointer;

    &:hover {
        border: none;
        background-color: var(--background-color);
    }

    &.selected {
        background-color: rgba(var(--primary-color-rgb), 0.1);
    }

    &.cover-view {
        height: 70px;
        padding: 5px 10px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid $border-light;
        border-radius: 5px;

        &:hover {
            background-color: var(--background-color);
        }

        .track-title {
            flex: 2;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .track-artist {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 0 10px;
        }

        .track-size {
            flex: 0.5;
            text-align: center;
        }

        .track-timelen {
            width: 95px;
            text-align: right;
        }

        .track-checkbox,
        .track-number {
            margin-right: 10px;
            width: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }
}

.track-checkbox {
    margin-right: 10px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.track-number {
    position: relative;
    font-weight: bold;
    margin-right: 10px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 20px;

    &.is-current,
    &.is-playing,
    &.is-paused {
        color: var(--primary-color);
    }

    .track-index,
    .sound-wave {
        transition: opacity 0.15s ease;
    }

    .track-playback-btn {
        position: absolute;
        inset: 0;
        margin: 0;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--primary-color);
        font-size: 14px;
        cursor: pointer;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
        display: grid;
        place-items: center;
    }
}

.li:hover .track-number {
    .track-index,
    .sound-wave {
        opacity: 0;
    }

    .track-playback-btn {
        opacity: 1;
        pointer-events: auto;
    }
}

.sound-wave {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 14px;

    span {
        width: 3px;
        background: var(--primary-color);
        border-radius: 1px;
        animation: cloud-sound-wave 0.9s ease-in-out infinite;

        &:nth-child(1) { height: 40%; animation-delay: 0s; }
        &:nth-child(2) { height: 80%; animation-delay: 0.15s; }
        &:nth-child(3) { height: 55%; animation-delay: 0.3s; }
    }
}

@keyframes cloud-sound-wave {
    0%, 100% { transform: scaleY(0.55); }
    50% { transform: scaleY(1); }
}

.track-title {
    flex: 2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.track-size {
    flex: 0.5;
    text-align: center;
}

.track-artist {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 10px;
}

.track-album {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 10px;
}

.track-timelen {
    width: 95px;
    text-align: right;
}

.icon {
    margin-left: 5px;
    border: 1px solid;
    border-radius: 5px;
    font-size: 10px;
    padding-left: 6px;
    padding-right: 6px;

    &.vip-icon {
        color: #ff6d00;
    }

    &.hq-icon {
        color: #0094ff;
        border-color: #0094ff;
    }

    &.sq-icon {
        color: #00c853;
        border-color: #00c853;
    }

    &.hr-icon {
        color: #ff6d00;
        border-color: #ff6d00;
    }
}

.queue-play-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: $primary;
    cursor: pointer;
}

.content-section {
    margin-top: 50px;
    border-top: 1px dotted var(--secondary-color);
}

.intro-section {
    margin-bottom: 30px;

    h3 {
        color: $primary;
        margin-bottom: 15px;
    }
}

.section-content {
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text-color);
}

.location-arrow {
    position: fixed;
    bottom: 168px;
    right: 14px;
    z-index: 110;
    cursor: pointer;
    font-size: 20px;
    color: $primary;
}

.more-btn-container {
    position: relative;
}

.dropdown-menu {
    position: absolute;
    background-color: $white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: $shadow-light;
    top: 50px;
    z-index: 50;

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    li {
        padding: 10px;
        cursor: pointer;

        &:hover {
            background-color: #f0f0f0;
        }
    }
}

.note-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    overflow: hidden;
}

.flying-note {
    position: absolute;
    font-size: 36px;
    color: $primary;
    pointer-events: none;
    transform-origin: center;
}

.fly-note-enter-active {
    animation: fly-note 2s ease-out forwards;
}

.fly-note-leave-active {
    animation: fly-note 2s ease-out forwards;
}

@keyframes fly-note {
    0% {
        transform: translate(var(--start-x), calc(var(--start-y) - 50px)) rotate(0deg) scale(1.2);
        opacity: 0.9;
    }

    20% {
        transform: translate(calc(var(--start-x) + 20px), calc(var(--start-y) - 70px)) rotate(45deg) scale(1.3);
        opacity: 0.85;
    }

    100% {
        transform: translate(80vw, 100vh) rotate(360deg) scale(0.6);
        opacity: 0;
    }
}

.track-list-header-row {
    position: sticky;
    z-index: 114;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background: #fff;
    border-bottom: 1px solid $primary;
    font-weight: bold;
}

.track-checkbox-header {
    margin-right: 10px;
    width: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.track-number-header {
    font-weight: bold;
    margin-right: 10px;
    width: 30px;
}

.track-title-header,
.track-artist-header,
.track-album-header,
.track-timelen-header,
.track-size-header {
    cursor: pointer;
    display: flex;
    align-items: center;
}

.track-title-header {
    flex: 2;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.track-size-header {
    flex: 0.5;
    padding: 0 10px;
}

.track-artist-header,
.track-album-header {
    flex: 1;
    padding: 0 10px;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.track-timelen-header {
    text-align: right;

    i {
        margin-left: 5px;
        font-size: 14px;
    }
}

.view-mode-btn {
    background-color: transparent;
    border: 1px solid var(--secondary-color);
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    width: 36px;
    height: 31px;
    transition: all 0.3s ease;

    &:hover {
        background-color: rgba(var(--primary-color-rgb), 0.1);
    }

    i {
        font-size: 16px;
    }
}

.track-cover {
    position: relative;
    width: 50px;
    height: 50px;
    margin-right: 15px;
    overflow: hidden;
    border-radius: 4px;
    flex-shrink: 0;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
    }
}

.li.cover-view:hover .track-cover img {
    transform: scale(1.05);
}

.track-cover-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $white;
    font-size: 20px;
}

.li.cover-view:hover .track-cover-overlay {
    opacity: 1;
}
</style>
