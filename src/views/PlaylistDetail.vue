<template>
    <div class="detail-page">
        <!-- Header info section -->
        <div class="header detail-sliver-header" :style="headerStyle">
            <CommonSkeleton v-if="loading" variant="detail-header" :avatar="isArtist" />
            <template v-else>
            <div
                v-if="!isArtist && systemCoverType"
                class="cover-art system-cover"
                :class="systemCoverType"
                :data-playlist-id="detail.listid || null"
                :style="coverStyle"
            >
                <i :class="systemCoverIcon"></i>
            </div>
            <img
                v-else
                class="cover-art"
                :class="isArtist ? 'artist-avatar' : ''"
                :data-playlist-id="detail.listid || null"
                :style="coverStyle"
                :src="isArtist ? ($getCover(detail.sizable_avatar, 480)) : $getCover(detail.pic, 480)"
            />
            <div class="info" :style="infoStyle">
                <h1 class="title" :style="titleStyle">{{ isArtist ? detail.author_name : displayName }}</h1>
                <div class="expanded-info" :style="detailsStyle">
                    <p class="subtitle" v-if="!isArtist && !isAlbum">
                        <span :title="detail.publish_date ? t('chuang-jian-yu', { date: detail.publish_date }) : ''">
                            {{ formatTimestampToAgo(detail.update_time, t) }}
                        </span>
                        | {{ detail.list_create_username }}
                    </p>
                    <p class="subtitle" v-else-if="isAlbum">
                        <span :title="detail.publish_date ? t('chuang-jian-yu', { date: detail.publish_date }) : ''">
                            {{ formatTimestampToAgo(detail.update_time, t) }}
                        </span>
                    </p>
                    <div class="stats" v-if="isArtist">
                        <span>{{ $t('dan-qu-shu') }}: {{ detail.song_count }}</span>
                        <span>{{ $t('zhuan-ji-shu') }}: {{ detail.album_count }}</span>
                        <span>MV: {{ detail.mv_count }}</span>
                        <span>{{ $t('fen-si') }}: {{ detail.fansnums }}</span>
                    </div>
                    <p class="meta" v-if="!isArtist && !isAlbum">{{ detail.tags }}</p>
                    <div v-if="descriptionText" class="description"
                        :class="{ expanded: isDescriptionExpanded, collapsible: shouldCollapseDescription }">
                        <div class="description-popover">
                            <div class="description-content">
                                {{ descriptionText }}
                            </div>
                            <button v-if="shouldCollapseDescription" class="description-toggle" type="button"
                                @click="isDescriptionExpanded = !isDescriptionExpanded">
                                {{ isDescriptionExpanded ? $t('shou-qi') : $t('cha-kan-geng-duo') }}
                            </button>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="primary-btn" @click="addPlaylistToQueue($event)">
                            <i class="fas fa-play"></i> {{ $t('bo-fang') }}
                        </button>
                        <button class="follow-btn" v-if="isArtist" @click="toggleFollow" :disabled="followLoading">
                            <i class="fas fa-heart"></i> {{ isFollowed ? $t('yi-guan-zhu') : $t('guan-zhu-an-niu') }}
                        </button>
                        <button class="fav-btn"
                            v-if="!isArtist && !isAlbum && detail.list_create_userid != MusesAuth.UserInfo?.userid && !route.query.listid"
                            @click="toggleFavorite(detail.list_create_gid)" :class="{ 'active': isPlaylistFavorited }">
                            <i class="fas fa-heart"></i>
                        </button>
                        <div class="more-btn-container" v-if="!isArtist && !isAlbum">
                            <button class="more-btn" @click="toggleDropdown">
                                <i class="fas fa-ellipsis-h"></i>
                            </button>
                            <div v-if="isDropdownVisible" class="dropdown-menu">
                                <ul>
                                    <li @click="deletePlaylist(detail.listid)"
                                        v-if="(detail.list_create_userid == MusesAuth.UserInfo?.userid || route.query.listid) && detail.sort > 1">
                                        <i class="fas fa-trash-alt"></i>
                                    </li>
                                    <li @click="sharePlaylist">
                                        <i class="fas fa-share-alt"></i>
                                    </li>
                                    <li @click="addPlaylistToQueue($event, true)" :title="t('tian-jia-dao-bo-fang-lie-biao')">
                                        <i class="fas fa-add"></i>
                                    </li>
                                </ul>
                            </div>
                        </div>
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
                <h2 class="track-list-title" :style="listTitleStyle"><span>{{ $t('ge-qu-lie-biao') }}</span> ( {{ displayTrackCount }} )</h2>
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
                                <li @click="addSelectedToOtherPlaylist" v-if="MusesAuth.UserInfo?.userid"><i
                                        class="fas fa-folder-plus"></i> {{ $t('tian-jia-dao-qi-ta-ge-dan') }}</li>
                                <li v-if="!isArtist && detail.list_create_userid == MusesAuth.UserInfo?.userid && route.query.listid"
                                    @click="removeSelectedFromPlaylist"><i class="fas fa-trash-alt"></i> {{ $t('qu-xiao-shou-cang') }}</li>
                            </ul>
                        </div>
                    </div>
                    <!-- Artist song sort selector -->
                    <div v-if="isArtist" class="sort-selector">
                        <button class="sort-btn" :class="{ 'active': artistSortType === 'hot' }"
                            @click="changeArtistSort('hot')">
                            {{ t('re-men') }}
                        </button>
                        <button class="sort-btn" :class="{ 'active': artistSortType === 'new' }"
                            @click="changeArtistSort('new')">
                            {{ t('zui-xin') }}
                        </button>
                    </div>
                    <button class="view-mode-btn" @click="toggleViewMode"
                        :title="viewMode === 'list' ? t('qie-huan-dao-wang-ge-shi-tu') : t('qie-huan-dao-lie-biao-shi-tu')">
                        <i class="fas" :class="viewMode === 'list' ? 'fa-th' : 'fa-list'"></i>
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
                    {{ $t('lie-biao-ge-ming') }} <i class="fas" :class="getSortIconClass('name')"></i>
                </div>
                <div class="track-artist-header" @click="sortTracks('author')">
                    {{ $t('lie-biao-ge-shou') }} <i class="fas" :class="getSortIconClass('author')"></i>
                </div>
                <div class="track-album-header" @click="sortTracks('album')">
                    {{ $t('lie-biao-zhuan-ji') }} <i class="fas" :class="getSortIconClass('album')"></i>
                </div>
                <div class="track-timelen-header" @click="sortTracks('timelen')">
                    {{ $t('lie-biao-shi-jian') }} <i class="fas" :class="getSortIconClass('timelen')"></i>
                </div>
            </div>

            <!-- Search loading animation -->
            <div v-if="isSearching" class="search-loading-overlay">
                <div class="search-loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>{{ $t('zheng-zai-jia-zai-quan-bu-ge-qu') }}</span>
                </div>
            </div>

            <RecycleScroller v-else ref="recycleScrollerRef" :items="filteredTracks"
                :item-size="viewMode === 'list' ? 50 : 70" class="track-list" key-field="trackKey" page-mode
                :buffer="400" :emit-update="true" @update="handleVirtualUpdate">
                        <template #default="{ item, index }">
                        <div class="li" :key="item.trackKey"
                            :class="{ 'cover-view': viewMode === 'grid', 'selected': batchSelectionMode && selectedTracks.includes(index) }"
                            @click="batchSelectionMode ? selectTrack(index, $event) : handleTrackPlaybackClick(item)"
                            @contextmenu.prevent="showContextMenu($event, item)">

                        <!-- Checkbox or index number -->
                        <div class="track-checkbox" v-if="batchSelectionMode">
                            <input type="checkbox" :checked="selectedTracks.includes(index)"
                                @click.stop="selectTrack(index, $event)">
                        </div>
                        <div class="track-number" v-else :class="trackPlaybackClass(item)">
                            <div v-if="isCurrentPlaying(item.hash)" class="sound-wave">
                                <span></span><span></span><span></span>
                            </div>
                            <span v-else class="track-index">{{ index + 1 }}</span>
                            <button
                                class="track-playback-btn"
                                type="button"
                                :class="trackPlaybackIcon(item)"
                                :title="trackPlaybackState(item) === 'playing' ? t('zan-ting-bo-fang') : t('bo-fang')"
                                @click.stop="handleTrackPlaybackClick(item)"
                            ></button>
                        </div>

                        <!-- Grid mode cover -->
                        <div class="track-cover" v-if="viewMode === 'grid'">
                            <img :src="item.cover || './assets/images/ico.png'" alt="Cover">
                            <div class="track-cover-overlay">
                                <i :class="trackPlaybackIcon(item)"></i>
                            </div>
                        </div>

                        <!-- Song info -->
                        <div class="track-title-container">
                            <div class="track-title" :title="item.name"
                                :class="{ 'current': isCurrentSong(item.hash) }">
                                <span class="track-title-text">{{ item.name }}</span>
                                <span class="track-title-tags">
                                    <span v-if="item.privilege == 10" class="icon vip-icon">VIP</span>
                                    <span v-if="item.isSQ" class="icon sq-icon">SQ</span>
                                    <span v-else-if="item.isHQ" class="icon sq-icon">HQ</span>
                                    <span v-if="item.mvhash" class="icon mv-icon">MV</span>
                                </span>
                            </div>
                            <div v-if="viewMode === 'grid' && item.remark" :title="item.remark" class="track-remark">{{
                                item.remark }}</div>
                        </div>
                        <div class="track-artist" :title="item.author">{{ item.author }}</div>
                        <div class="track-album" :title="item.album">{{ item.album }}</div>
                        <div class="track-timelen">
                            {{ $formatMilliseconds(item.timelen) }}
                        </div>
                        </div>
                        </template>
            </RecycleScroller>
        </div>

        <!-- Artist bio section -->
        <div class="content-section" v-if="isArtist && detail.long_intro && detail.long_intro.length">
            <div v-for="(section, index) in detail.long_intro" :key="index" class="intro-section">
                <h3>{{ section.title }}</h3>
                <div class="section-content">{{ section.content }}</div>
            </div>
        </div>

        <ContextMenu ref="contextMenuRef" :playerControl="playerControl" @songRemoved="handleSongRemoved" />
        <div class="note-container">
            <transition-group name="fly-note">
                <div v-for="note in flyingNotes" :key="note.id" class="flying-note" :style="note.style">♪</div>
            </transition-group>
        </div>
    </div>
    <PlaylistSelectModal ref="playlistSelect" :current-song="songs" />
    <PageScrollbar />
    <BackToTop bottom="100px" right="12px" />
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount, computed, nextTick } from 'vue';
import { RecycleScroller } from 'vue3-virtual-scroller';
import CommonSkeleton from '../components/CommonSkeleton.vue';
import ContextMenu from '../components/ContextMenu.vue';
import PlaylistSelectModal from '../components/PlaylistSelectModal.vue';
import PageScrollbar from '../components/PageScrollbar.vue';
import BackToTop from '../components/BackToTop.vue';
import { get } from '../utils/request';
import { useRoute, useRouter } from 'vue-router';
import { MusesAuthStore } from '../stores/store';
import { useI18n } from 'vue-i18n';
import { share, formatTimestampToAgo } from '@/utils/utils';
import {
    displayPlaylistName,
    playlistSystemCoverIcon,
    playlistSystemCoverType
} from '@/utils/playlistDisplay';
import {
    getTrackPlaybackIcon,
    getTrackPlaybackState,
    TRACK_PLAYBACK
} from '@/utils/playbackState';
import { useStickyDetailHeader } from '@/composables/useStickyDetailHeader';

const playlistSelect = ref(null);
const { t } = useI18n();
const MusesAuth = MusesAuthStore();
const router = useRouter();
const route = useRoute();

// Determine whether artist, playlist, or album
const isArtist = computed(() => !!route.query.singerid);
const isAlbum = computed(() => !!route.query.albumid);

// Shared state
const detail = ref({});
const displayName = computed(() => displayPlaylistName(detail.value?.name, t));
const systemCoverType = computed(() => (isAlbum.value ? null : playlistSystemCoverType(detail.value)));
const systemCoverIcon = computed(() => playlistSystemCoverIcon(systemCoverType.value));
const tracks = ref([]);
const filteredTracks = ref([]);
const searchQuery = ref('');
const pageSize = 60; // Default page size
const albumPageSize = 50;
const maxPageSize = 300;
const currentPage = ref(1);
const hasMore = ref(true);
const isLoadingMore = ref(false);
const totalCount = ref(0);
const contextMenuRef = ref(null);
const recycleScrollerRef = ref(null);
const loading = ref(true);
const isSearching = ref(false); // Search loading state
const isDropdownVisible = ref(false);
const flyingNotes = ref([]);
const isDescriptionExpanded = ref(false);
let noteId = 0;

// Artist-specific state
const isFollowed = ref(true);
const followLoading = ref(false);
const collectedPlaylists = ref([]);
// Check if playlist is favorited
const isPlaylistFavorited = ref(false);

// Update favorite status
const updateFavoriteStatus = () => {
    if (!detail.value.list_create_listid) {
        isPlaylistFavorited.value = false;
        return;
    }
    collectedPlaylists.value = JSON.parse(localStorage.getItem('collectedPlaylists') || '[]');
    isPlaylistFavorited.value = collectedPlaylists.value.some(item => item.list_create_listid === detail.value.list_create_listid);
};

// Batch selection state
const batchSelectionMode = ref(false);
const isBatchMenuVisible = ref(false);
const selectedTracks = ref([]);
let lastSelectedIndex = -1;
const songs = ref([]);

const clearBatchSelection = () => {
    selectedTracks.value = [];
    lastSelectedIndex = -1;
    isBatchMenuVisible.value = false;
};

// Sort state
const sortField = ref('');
const sortOrder = ref('asc');
const artistSortType = ref('hot'); // Artist sort: hot (popular) or new (latest)

// Check if all selected
const isAllSelected = computed(() => {
    return selectedTracks.value.length === filteredTracks.value.length && filteredTracks.value.length > 0;
});

// View mode state
const viewMode = ref('list'); // 'list' or 'grid'

// Compute displayed song count
const displayTrackCount = computed(() => {
    // Show totalCount while more data remains; otherwise show loaded tracks.length
    return hasMore.value ? totalCount.value : tracks.value.length;
});

const descriptionText = computed(() => (detail.value.intro || '').trim());
const shouldCollapseDescription = computed(() => descriptionText.value.length > 80 || descriptionText.value.includes('\n'));

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

onMounted(() => {
    isFollowed.value = !!route.query.unfollow;
    const savedViewMode = localStorage.getItem('trackViewMode');
    if (savedViewMode) {
        viewMode.value = savedViewMode;
    }
    loadData();
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

watch(() => [route.query.global_collection_id, route.query.singerid, route.query.albumid], () => {
    loadData();
});

watch(batchSelectionMode, (value) => {
    if (!value) clearBatchSelection();
});

const loadData = async () => {
    if (!route.query.global_collection_id && !route.query.singerid && !route.query.albumid) {
        router.push('/library');
        return;
    }
    loading.value = true;
    isSearching.value = false;
    tracks.value = [];
    filteredTracks.value = [];
    isDescriptionExpanded.value = false;
    currentPage.value = 1;
    if (isArtist.value) {
        await getArtistInfo();
        await fetchArtistSongs();
    } else if (isAlbum.value) {
        await getAlbumInfo();
        await fetchAlbumSongs();
    } else {
        await updateFavoriteStatus();
        await fetchPlaylistTracks();
    }
};

// Fetch artist info
const getArtistInfo = async () => {
    try {
        const response = await get('/artist/detail', {
            id: route.query.singerid
        });
        if (response.status === 1) {
            detail.value = {
                ...response.data,
                id: route.query.singerid
            };
        }
    } catch (error) {
        console.error('获取歌手信息失败:', error);
    }
};

// Fetch album info
const getAlbumInfo = async () => {
    try {
        const response = await get('/album/detail', {
            id: route.query.albumid
        });
        if (response.status === 1 && response.data && response.data.length > 0) {
            const albumData = response.data[0]; // Data is in data[0]
            detail.value = {
                name: albumData.album_name || '',
                pic: albumData.sizable_cover || albumData.cover || '',
                publish_date: albumData.publish_date || '',
                update_time: albumData.update_time || 0,
                intro: albumData.intro || '',
                song_count: 0, // Album detail API omits song count — from song list API
                id: route.query.albumid
            };
        }
    } catch (error) {
        console.error('获取专辑信息失败:', error);
    }
};

const formatArtistTracks = (rawSongs) => {
    return rawSongs
        .filter(track => !!track.hash)
        .map(track => ({
            trackKey: track.sort ?? track.hash ?? '',
            hash: track.hash || '',
            remark: track.remark || '',
            OriSongName: track.audio_name + ' - ' + track.author_name,
            name: track.audio_name || '',
            author: track.author_name || '',
            album: track.album_name || '',
            cover: track.trans_param.union_cover?.replace("{size}", 480) || '',
            timelen: track.timelength || 0,
            isSQ: !!track.hash_flac,
            isHQ: !!track.hash_320,
            privilege: track.privilege || 0,
            mvhash: track.mvhash || '',
            originalData: track
        }));
};

const formatAlbumTracks = (rawSongs) => {
    return rawSongs
        .filter(track => track.audio_info?.hash)
        .map(track => {
            const audioInfo = track.audio_info;
            const base = track.base;
            const albumInfo = track.album_info;
            const mvHash = track.mvdata && track.mvdata.length > 0 ? track.mvdata[0].hash : '';

            return {
                trackKey: track.sort ?? audioInfo.hash ?? '',
                hash: audioInfo.hash || '',
                remark: track.extra?.remark || '',
                OriSongName: base.audio_name + ' - ' + base.author_name,
                name: base.audio_name || '',
                author: base.author_name || '',
                album: albumInfo?.album_name || '',
                cover: track.trans_param?.union_cover?.replace("{size}", 480) || '',
                timelen: audioInfo.duration || 0,
                isSQ: !!audioInfo.hash_flac,
                isHQ: !!audioInfo.hash_320,
                privilege: track.copyright?.privilege || 0,
                mvhash: mvHash,
                originalData: track
            };
        });
};

const formatPlaylistTracks = (rawSongs) => {
    return rawSongs
        .filter(track => !!track.hash)
        .map(track => {
            const nameParts = track.name.split(' - ');
            return {
                trackKey: track.sort ?? track.hash ?? '',
                hash: track.hash || '',
                remark: track.remark || '',
                OriSongName: track.name,
                name: nameParts.length > 1 ? nameParts[1] : track.name,
                author: nameParts.length > 1 ? nameParts[0] : '',
                album: track.albuminfo?.name || '',
                cover: track.cover?.replace("{size}", 480) || '',
                timelen: track.timelen || 0,
                isSQ: track.relate_goods && track.relate_goods.length > 2,
                isHQ: track.relate_goods && track.relate_goods.length > 1,
                privilege: track.privilege || 0,
                mvhash: track.mvhash || '',
                originalData: track
            };
        });
};

const fetchTracksPage = async (curPage, curPageSize) => {
    if (isArtist.value) {
        const response = await get('/artist/audios', {
            id: route.query.singerid,
            sort: artistSortType.value,
            page: curPage,
            pagesize: curPageSize
        });

        if (response.status !== 1) return null;

        const rawSongs = response.data || [];
        return {
            rawSongs,
            formattedTracks: formatArtistTracks(rawSongs),
            total: detail.value.song_count || 0
        };
    }

    if (isAlbum.value) {
        const response = await get('/album/songs', {
            id: route.query.albumid,
            page: curPage,
            pagesize: curPageSize
        });

        if (response.status !== 1) return null;

        const rawSongs = response.data.songs || [];
        return {
            rawSongs,
            formattedTracks: formatAlbumTracks(rawSongs),
            total: response.data.total || 0
        };
    }

    const response = await get('/playlist/track/all', {
        id: route.query.global_collection_id,
        page: curPage,
        pagesize: curPageSize
    });

    if (response.status !== 1) return null;

    const rawSongs = response.data?.songs || [];
    return {
        rawSongs,
        formattedTracks: formatPlaylistTracks(rawSongs),
        total: response.data?.list_info?.count || totalCount.value,
        listInfo: response.data?.list_info
    };
};

const getNormalPageSize = () => isAlbum.value ? albumPageSize : pageSize;

const applyTracksResult = (result, replace, curPage, curPageSize) => {
    if (!result || (!replace && result.rawSongs.length === 0)) {
        hasMore.value = false;
        return;
    }

    if (curPage === 1 && result.listInfo) {
        detail.value = result.listInfo;
    }

    if (result.total !== undefined) {
        totalCount.value = result.total;
        if (isAlbum.value && detail.value.song_count === 0) {
            detail.value.song_count = result.total;
        }
    }

    tracks.value = replace ? result.formattedTracks : [...tracks.value, ...result.formattedTracks];
    filteredTracks.value = tracks.value;
    currentPage.value = curPage + 1;
    hasMore.value = result.rawSongs.length >= curPageSize && tracks.value.length < totalCount.value;
};

// Fetch artist songs
const fetchArtistSongs = async () => {
    currentPage.value = 1;
    hasMore.value = true;

    try {
        const curPage = currentPage.value;
        const curPageSize = getNormalPageSize();
        const result = await fetchTracksPage(curPage, curPageSize);
        applyTracksResult(result, true, curPage, curPageSize);
    } catch (error) {
        window.$modal.alert(t('ge-qu-shu-ju-cuo-wu'));
        return;
    }

    loading.value = false;
};

// Fetch album songs
const fetchAlbumSongs = async () => {
    currentPage.value = 1;
    hasMore.value = true;

    try {
        const curPage = currentPage.value;
        const curPageSize = getNormalPageSize();
        const result = await fetchTracksPage(curPage, curPageSize);
        applyTracksResult(result, true, curPage, curPageSize);
    } catch (error) {
        window.$modal.alert(t('ge-qu-shu-ju-cuo-wu'));
        return;
    }

    loading.value = false;
};

// Fetch playlist songs
const fetchPlaylistTracks = async () => {
    currentPage.value = 1;
    hasMore.value = true;

    try {
        const curPage = currentPage.value;
        const curPageSize = getNormalPageSize();
        const result = await fetchTracksPage(curPage, curPageSize);
        applyTracksResult(result, true, curPage, curPageSize);
    } catch (error) {
        window.$modal.alert(t('ge-qu-shu-ju-cuo-wu'));
        return;
    }

    loading.value = false;
};

// Load more songs
const loadMoreTracks = async () => {
    if (isLoadingMore.value || !hasMore.value) return;

    isLoadingMore.value = true;

    try {
        const curPage = currentPage.value;
        const curPageSize = getNormalPageSize();
        const result = await fetchTracksPage(curPage, curPageSize);
        applyTracksResult(result, false, curPage, curPageSize);
    } catch (error) {
        console.error('加载更多歌曲失败:', error);
    } finally {
        isLoadingMore.value = false;
    }
};

// Search songs
const handleVirtualUpdate = (startIndex, endIndex) => {
    if (loading.value) return;
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

        const appendResult = (result) => {
            if (result.total !== undefined) {
                totalCount.value = result.total;
                if (isAlbum.value && detail.value.song_count === 0) {
                    detail.value.song_count = result.total;
                }
            }

            const newTracks = result.formattedTracks.filter(track => !loadedHashes.has(track.hash));
            if (newTracks.length > 0) {
                tracks.value = [...tracks.value, ...newTracks];
                filteredTracks.value = tracks.value;
                newTracks.forEach(track => loadedHashes.add(track.hash));
                onAppend?.(newTracks);
            }
        };

        let page = Math.floor(tracks.value.length / maxPageSize) + 1;
        while (hasMore.value) {
            const result = await fetchTracksPage(page, maxPageSize);
            if (!result) break;

            if (result.rawSongs.length === 0) {
                hasMore.value = false;
                return;
            }

            appendResult(result);

            const reachedEnd = result.rawSongs.length < maxPageSize;
            hasMore.value = !reachedEnd && tracks.value.length < totalCount.value;
            page++;
        }

        currentPage.value = Math.floor(tracks.value.length / getNormalPageSize()) + 1;
    } finally {
        isLoadingMore.value = false;
    }
};

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
const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};

// Load all remaining songs and append to queue
const loadAndAppendRemainingTracks = async () => {
    await loadAllRemainingTracks((newTracks) => {
        props.playerControl.addPlaylistToQueue(newTracks, true);
    });
};

// Add entire playlist to queue
const addPlaylistToQueue = (event, append = false) => {
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

    // Add currently loaded songs to queue and start playback
    props.playerControl.addPlaylistToQueue(filteredTracks.value, append);

    // If unloaded songs remain, keep loading in background and append to queue
    if (hasMore.value) {
        loadAndAppendRemainingTracks();
    }
};

// Toggle follow status
const toggleFollow = async () => {
    if (!MusesAuth.isAuthenticated) {
        window.$modal.alert(t('qing-xian-deng-lu'));
        return;
    }
    followLoading.value = true;
    try {
        const response = await get(isFollowed.value ? '/artist/unfollow' : '/artist/follow', {
            id: route.query.singerid
        });
        if (response.status === 1) {
            isFollowed.value = !isFollowed.value;
        }
    } catch (error) {
        console.error('切换关注状态失败:', error);
    } finally {
        followLoading.value = false;
        localStorage.setItem('t', Date.now());
    }
};

// Favorite playlist
const toggleFavorite = async (id) => {
    if (!MusesAuth.isAuthenticated) {
        window.$modal.alert(t('qing-xian-deng-lu'));
        return;
    }

    try {
        if (isPlaylistFavorited.value) {
            const playlist = collectedPlaylists.value.find(p => p.list_create_listid === detail.value.list_create_listid);
            if (playlist) {
                await get('/playlist/del', { listid: playlist.listid });
                const newCollectedPlaylists = collectedPlaylists.value.filter(item =>
                    item.list_create_listid !== detail.value.list_create_listid
                );
                localStorage.setItem('collectedPlaylists', JSON.stringify(newCollectedPlaylists));
                isPlaylistFavorited.value = false;
                $message.success(t('qu-xiao-shou-cang-cheng-gong'));
            }
        } else {
            const response = await get('/playlist/add', {
                name: detail.value.name,
                list_create_userid: MusesAuth.UserInfo.userid,
                type: 1,
                list_create_gid: id
            });
            if (response.status === 1) {
                const newPlaylist = {
                    list_create_listid: detail.value.list_create_listid,
                    listid: response.data.info.listid
                };
                const currentPlaylists = JSON.parse(localStorage.getItem('collectedPlaylists') || '[]');
                currentPlaylists.push(newPlaylist);
                localStorage.setItem('collectedPlaylists', JSON.stringify(currentPlaylists));
                isPlaylistFavorited.value = true;
                $message.success(t('shou-cang-cheng-gong'));
            }
        }
        localStorage.setItem('t', Date.now());
    } catch (error) {
        $message.error(isPlaylistFavorited.value ? t('qu-xiao-shou-cang-shi-bai') : t('shou-cang-shi-bai'));
    }
};

// Delete playlist
const deletePlaylist = async () => {
    isDropdownVisible.value = false;
    const result = await window.$modal.confirm(t('que-ren-shan-chu-ge-dan'));
    if (result) {
        await get('/playlist/del', { listid: route.query.listid });
        localStorage.setItem('t', Date.now());
        router.back();
    }
};

// Share playlist
const sharePlaylist = () => {
    isDropdownVisible.value = false;
    share(detail.value.name, route.query.global_collection_id, 1);
};

// Context menu
const showContextMenu = (event, song) => {
    if (contextMenuRef.value) {
        contextMenuRef.value.openContextMenu(event, {
            OriSongName: song.OriSongName,
            FileHash: song.hash,
            fileid: song.originalData.fileid,
            userid: isArtist.value ? null : detail.value.list_create_userid,
            timeLength: song.timelen,
            cover: song.cover,
            mvhash: song.mvhash,
        }, isArtist.value ? null : detail.value.listid);
    }
};

const scrollToTrackIndex = async (index) => {
    await nextTick();
    const scrollContainer = document.querySelector('.app-main-scroll');
    const scrollerElement = recycleScrollerRef.value?.$el;
    if (!scrollContainer || !scrollerElement) return;

    const targetIndex = Math.max(0, index - 5);
    const itemSize = viewMode.value === 'list' ? 50 : 70;
    const offsetTop = scrollContainer.scrollTop + scrollerElement.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top;

    scrollContainer.scrollTo({
        top: Math.max(0, offsetTop + targetIndex * itemSize),
        behavior: 'smooth'
    });
};

// Scroll to currently playing song
const scrollToItem = async () => {
    const currentHash = props.playerControl?.currentSong?.hash;
    if (!currentHash) return;

    let currentIndex = filteredTracks.value.findIndex(song => song.hash === currentHash);
    if (currentIndex === -1 && hasMore.value && !searchQuery.value.trim()) {
        try {
            await loadAllRemainingTracks();
            currentIndex = filteredTracks.value.findIndex(song => song.hash === currentHash);
        } catch (error) {
            console.error('滚动到当前播放歌曲时出错:', error);
        }
    }

    if (currentIndex !== -1) {
        await scrollToTrackIndex(currentIndex);
    }
};

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
    const dropdown = document.querySelector('.dropdown-menu');
    const moreBtn = document.querySelector('.more-btn');
    if (dropdown && !dropdown.contains(event.target) && !moreBtn.contains(event.target)) {
        isDropdownVisible.value = false;
    }

    // Handle batch action menu
    const batchActionsMenu = document.querySelector('.batch-actions-menu');
    const batchActionBtn = document.querySelector('.batch-action-btn');
    if (batchActionsMenu && !batchActionsMenu.contains(event.target) && !batchActionBtn.contains(event.target)) {
        isBatchMenuVisible.value = false;
    }
};

// Toggle dropdown visibility
const toggleDropdown = () => {
    isDropdownVisible.value = !isDropdownVisible.value;
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
    } else {
        // Normal click
        const existingIndex = selectedTracks.value.indexOf(index);
        if (existingIndex === -1) {
            selectedTracks.value.push(index);
        } else {
            selectedTracks.value.splice(existingIndex, 1);
        }
    }

    lastSelectedIndex = index;
};

// Add selected songs to queue (append to current queue)
const appendSelectedToQueue = async () => {
    if (selectedTracks.value.length === 0) return;
    const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
    await props.playerControl.addPlaylistToQueue(selectedSongs, true);
    $message.success(t('tian-jia-dao-bo-fang-lie-biao-cheng-gong'));
    isBatchMenuVisible.value = false;
};

// Add selected songs to another playlist
const addSelectedToOtherPlaylist = async () => {
    if (selectedTracks.value.length === 0) return;
    const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
    songs.value = selectedSongs;
    await playlistSelect.value.fetchPlaylists();
    isBatchMenuVisible.value = false;
};

// Remove selected songs from playlist
const removeSelectedFromPlaylist = async () => {
    if (selectedTracks.value.length === 0) return;
    const result = await window.$modal.confirm(t('que-ding-yi-chu-xuan-zhong-ge-qu'));
    if (result) {
        const selectedSongs = selectedTracks.value.map(index => filteredTracks.value[index]);
        try {
            const fileids = selectedSongs.map(song => song.originalData.fileid).join(',');
            await get('/playlist/tracks/del', {
                listid: route.query.listid,
                fileids: fileids
            });
            selectedTracks.value.sort((a, b) => b - a).forEach(index => {
                filteredTracks.value.splice(index, 1);
                tracks.value = tracks.value.filter((_, i) =>
                    !selectedTracks.value.includes(i)
                );
            });
            filteredTracks.value = tracks.value;
            selectedTracks.value = [];
            $message.success(t('ge-qu-yi-cong-ge-dan-yi-chu'));
        } catch (err) {
            $message.error(t('yi-chu-ge-qu-shi-bai'));
            return;
        }
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

const handleSongRemoved = (fileid) => {
    tracks.value = tracks.value.filter(track => track.originalData?.fileid !== fileid);
    filteredTracks.value = filteredTracks.value.filter(track => track.originalData?.fileid !== fileid);
};

// Toggle view mode
const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'list' ? 'grid' : 'list';
    localStorage.setItem('trackViewMode', viewMode.value);
};

// Toggle artist song sort order
const changeArtistSort = (sortType) => {
    if (artistSortType.value !== sortType) {
        artistSortType.value = sortType;
        // Re-fetch artist songs
        fetchArtistSongs();
    }
};

// Check if current song (regardless of play state)
const isCurrentSong = (hash) => {
    return props.playerControl?.currentSong?.hash === hash;
};

// Check if currently playing song
const isCurrentPlaying = (hash) => {
    return isCurrentSong(hash) && props.playerControl?.playing;
};

const trackPlaybackState = (item) => getTrackPlaybackState({
    isCurrent: isCurrentSong(item?.hash),
    isPlaying: !!props.playerControl?.playing
});

const trackPlaybackIcon = (item) => getTrackPlaybackIcon(trackPlaybackState(item));

const trackPlaybackClass = (item) => {
    const state = trackPlaybackState(item);
    return {
        'is-current': state !== TRACK_PLAYBACK.STOPPED,
        'is-playing': state === TRACK_PLAYBACK.PLAYING,
        'is-paused': state === TRACK_PLAYBACK.PAUSED
    };
};

const handleTrackPlaybackClick = (item) => {
    const state = trackPlaybackState(item);
    if (state === TRACK_PLAYBACK.PLAYING || state === TRACK_PLAYBACK.PAUSED) {
        props.playerControl?.togglePlayPause?.();
        return;
    }
    playSong(item.hash, item.name, item.cover, item.author);
};
</script>

<style lang="scss" scoped>
$primary: var(--primary-color);
$text-muted: #666;
$text-light: #999;
$border-light: #eee;
$white: white;
$shadow-light: 0 2px 10px rgba(0, 0, 0, 0.1);

.detail-page {
    padding: 20px;
}

.header {
    display: flex;
    align-items: stretch;
    gap: 20px;
}

.detail-sliver-header {
    position: sticky;
    z-index: 116;
    box-sizing: border-box;
    overflow: hidden;
    align-items: flex-start;
    padding: 10px 0;
    background: #fff;
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
    transition: border-radius 0.2s ease, box-shadow 0.2s ease;

    &.artist-avatar {
        border-radius: 50%;
    }

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

        &.liked {
            background: linear-gradient(160deg, #ff7eb3 0%, #ff375f 55%, #d70015 100%);
        }

        &.collection {
            background: linear-gradient(160deg, #bf5af2 0%, #8944ab 55%, #5e2b7e 100%);
        }

        &.playlist {
            background: linear-gradient(160deg, #64d2ff 0%, #0a84ff 55%, #0066cc 100%);
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
    justify-content: flex-start;
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
    flex: 1;
    min-height: 0;
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
    line-height: 1.4;
    margin: 8px 0 0;
    color: $text-muted;
}

.meta {
    font-size: 14px;
    line-height: 1.4;
    margin: 8px 0 0;
    color: $text-light;
}

.stats {
    display: flex;
    gap: 20px;
    color: $text-muted;
    margin-top: 10px;
}

.description {
    position: relative;
    flex: 0 0 auto;
    height: 42px;
    margin: 6px 0;
    overflow: visible;
}

.description.expanded {
    z-index: 50;
}

.description:not(.collapsible) {
    height: auto;
}

.description-popover {
    position: relative;
    z-index: 20;
    overflow: hidden;
    transition: max-height 0.24s ease, padding 0.24s ease, box-shadow 0.24s ease, transform 0.24s ease, border-radius 0.24s ease;
}

.description.collapsible .description-popover {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    max-height: 42px;
}

.description.collapsible:not(.expanded) .description-popover::after {
    content: '...';
    position: absolute;
    right: 0;
    bottom: 0;
    width: 5.1em;
    height: 21px;
    background: #fff;
    pointer-events: none;

    .dark & {
        background: #0E0E0E;
    }
}

.description-content {
    font-size: 14px;
    line-height: 1.5;
    white-space: break-spaces;
}

.description.expanded .description-popover {
    display: flex;
    flex-direction: column;
    max-height: min(50vh, 360px);
    padding: 10px 12px 34px;
    box-sizing: border-box;
    overflow: hidden;
    border-radius: 10px;
    border-left: 3px solid $primary;
    background: #fff;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
    transform: translateY(2px);

    .dark & {
        background: #252525;
    }
}

.description.expanded .description-content {
    min-height: 0;
    padding-bottom: 26px;
    overflow-y: auto;
    mask-image: linear-gradient(to bottom, transparent, #000 15px, #000 calc(100% - 10px), transparent);
}

.description-toggle {
    position: absolute;
    right: 0;
    bottom: 0;
    margin-top: 6px;
    padding: 0 0 0 6px;
    border: none !important;
    color: $primary !important;
    cursor: pointer;
    font-size: 14px;
    line-height: 1.5;
    z-index: 1;
    transition: right 0.24s ease, bottom 0.24s ease;
    background: none;
}

.description.expanded .description-toggle {
    right: 12px;
    bottom: 10px;
}

.actions {
    display: flex;
    flex-shrink: 0;
    margin-top: auto;
    gap: 10px;
}

.primary-btn,
.follow-btn {
    background-color: var(--primary-color);
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

.follow-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.fav-btn,
.more-btn {
    background-color: transparent;
    padding: 10px;
    border-radius: 5px;
    cursor: pointer;
    border: 1px solid var(--secondary-color);
    height: 100%;
}

.fav-btn {
    i {
        color: $text-light;
    }

    &.active i {
        color: $primary;
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

.sort-selector {
    display: flex;
    border: 1px solid var(--secondary-color);
    border-radius: 5px;
    overflow: hidden;
}

.sort-btn {
    background-color: transparent;
    border: none;
    padding: 5px 15px;
    cursor: pointer;
    color: var(--text-color);
    transition: all 0.3s ease;
    font-size: 14px;

    &:not(:last-child) {
        border-right: 1px solid var(--secondary-color);
    }

    &:hover {
        background-color: rgba(var(--primary-color-rgb), 0.1);
    }

    &.active {
        background-color: $primary;
        color: $white;
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
        color: $text-light;
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

        .track-title-container {
            flex: 2;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .track-title {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
        }

        .track-title-text {
            flex: 0 1 auto;
            max-width: 100%;
            min-width: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .track-title-tags {
            display: flex;
            align-items: center;
            gap: 5px;
            flex-shrink: 0;
        }

        .track-remark {
            font-size: 12px;
            color: $text-light;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 2px;
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
    &.is-paused,
    &.current {
        color: $primary;
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
        color: $primary;
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

.track-title-container {
    flex: 2;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.track-title {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;

    &.current {
        color: $primary;
    }
}

.track-title-text {
    flex: 0 1 auto;
    max-width: 100%;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.track-title-tags {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
}

.track-remark {
    font-size: 12px;
    color: $text-light;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
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

    &.sq-icon {
        color: #0094ff;
    }

    &.mv-icon {
        color: #ff1744;
    }
}

.track-title-tags .icon {
    margin-left: 0;
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
.track-timelen-header {
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

.sound-wave {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 16px;

    span {
        width: 3px;
        background-color: $primary;
        animation: wave 0.8s ease-in-out infinite;

        &:nth-child(1) {
            height: 6px;
            animation-delay: 0s;
        }

        &:nth-child(2) {
            height: 12px;
            animation-delay: 0.2s;
        }

        &:nth-child(3) {
            height: 8px;
            animation-delay: 0.4s;
        }
    }
}

@keyframes wave {

    0%,
    100% {
        transform: scaleY(0.5);
    }

    50% {
        transform: scaleY(1);
    }
}
</style>
