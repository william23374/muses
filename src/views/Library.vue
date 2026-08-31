<template>
    <div class="library-page">
        <div class="profile-section">
            <div class="profile-header" :style="profileHeaderStyle">
                <div class="profile-background-image-wrap">
                    <div class="profile-background-image"></div>
                </div>
                <div class="profile-background-main"></div>
                <div class="profile-background-top"></div>
                <div class="profile-background-bottom"></div>
                <div class="profile-background-right"></div>
                <div class="profile-info">
                    <img class="profile-pic" :src="user.pic" :alt="$t('yong-hu-tou-xiang')" />
                    <div class="user-details">
                        <div class="user-name-row">
                            <h2 class="user-name">{{ user.nickname }}</h2>
                            <span class="user-level">Lv.{{ userDetail.p_grade || 0 }}</span>
                            <BirthdayEasterEgg :birthday="userDetail.birthday" :nickname="user.nickname"
                                :player-control="props.playerControl" />
                            <img v-if="userVip[0] && userVip[0].is_vip == 1" class="user-vip-icon"
                                :src="`./assets/images/${userVip[0].product_type === 'svip' ? 'vip' : 'vip2'}.png`"
                                :title="`${$t('gai-nian-ban')} ${userVip[0].vip_end_time}`" />
                            <img v-if="userVip[1] && userVip[1].is_vip == 1" class="user-vip-icon"
                                :src="`./assets/images/${userVip[1].product_type === 'svip' ? 'vip' : 'vip2'}.png`"
                                :title="`${$t('chang-ting-ban')} ${userVip[1].vip_end_time}`" />
                        </div>
                        <div class="user-signature">{{ userDetail.descri || '' }}</div>
                        <div class="user-stats">
                            <div class="stat-item"><span class="stat-value">{{ userDetail.follows || 0 }}</span><span
                                    class="stat-label">{{ $t('guan-zhu') }}</span></div>
                            <div class="stat-item"><span class="stat-value">{{ userDetail.fans || 0 }}</span><span
                                    class="stat-label">{{ $t('fen-si') }}</span></div>
                            <div class="stat-item"><span class="stat-value">{{ userDetail.friends || 0 }}</span><span
                                    class="stat-label">{{ $t('hao-you') }}</span></div>
                            <div class="stat-item"><span class="stat-value">{{ userDetail.hvisitors || 0 }}</span><span
                                    class="stat-label">{{ $t('fang-wen') }}</span></div>
                        </div>
                        <div class="user-meta">
                            <span class="user-gender" :title="userGenderTitle">
                                <i :class="userGenderIcon"></i>
                            </span>
                            <span class="user-duration">{{ formatDuration(userDetail.duration || 0) }} {{
                                $t('ting-ge-shi-chang') }}</span>
                            <span class="user-age">{{ formatRegTime(userDetail.rtime || 0) }}</span>
                        </div>
                        <div class="user-actions">
                            <span class="action-button" @click="signIn">{{ $t('qian-dao') }}</span>
                            <span class="action-button" @click="getVip">VIP</span>
                            <span class="action-button" @click="createTeamEventPopup">{{ $t('zu-dui-ling-qu-vip') }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="showListenSection" class="favorite-header">
            <h2 class="section-title" @click="addAllSongsToQueue">{{ $t('wo-xi-huan-ting') }}</h2>
            <button class="favorite-close-button" type="button" :aria-label="$t('guan-bi-an-niu')" @click="hideListenSection">
                <i class="fas fa-times"></i>
                <span>{{ $t('guan-bi-an-niu') }}</span>
            </button>
        </div>
        <div v-if="showListenSection" class="favorite-section">
            <div class="song-list">
                <CommonSkeleton v-if="isLoading" variant="compact-grid" :count="15" />
                <ul v-else>
                    <li v-for="(song, index) in listenHistory" :key="index" class="song-item"
                        :class="trackPlaybackClass(song)"
                        @click="handleListenSongClick(song)">
                        <img :src="$getCover(song.image, 120)" :alt="$t('feng-mian')" class="album-cover" />
                        <div class="song-info">
                            <p class="album-name">{{ song.name.split(' - ')[1] || song.name }}</p>
                            <p class="singer-name">{{ song.singername }}</p>
                        </div>
                        <span v-if="trackPlaybackState(song) === TRACK_PLAYBACK.PLAYING" class="song-playing-dot" aria-hidden="true"></span>
                        <i class="song-play-icon" :class="trackPlaybackIcon(song)"></i>
                    </li>
                </ul>
            </div>
        </div>

        <!-- Category navigation -->
        <div class="category-tabs">
            <button v-for="(tab, index) in categories" :key="index" :class="{ 'active': selectedCategory === index }"
                @click="selectCategory(index)">
                {{ tab }}
            </button>
        </div>

        <!-- Music card grid (playlists or followed artists) -->
        <div class="music-grid">
            <template v-if="selectedCategory === 0 || selectedCategory === 1 || selectedCategory === 2">
                <router-link
                    v-if="selectedCategory === 0 && !isLoading"
                    class="music-card action-card"
                    :to="{ path: '/CloudDrive' }"
                >
                    <div class="action-cover cloud">
                        <i class="fas fa-cloud"></i>
                    </div>
                    <div class="album-info">
                        <h3>{{ $t('wo-de-yun-pan') }}</h3>
                        <p>{{ $t('yun-pan-jian-cheng') }}</p>
                    </div>
                </router-link>
                <router-link
                    v-if="selectedCategory === 0 && !isLoading"
                    class="music-card action-card"
                    :to="{ path: '/LocalMusic' }"
                >
                    <div class="action-cover local">
                        <i class="fas fa-folder-open"></i>
                    </div>
                    <div class="album-info">
                        <h3>{{ $t('ben-di-yin-le') }}</h3>
                        <p>{{ $t('ben-di-wen-jian') }}</p>
                    </div>
                </router-link>
                <div class="music-card"
                    v-for="(item, index) in (selectedCategory === 0 ? userPlaylists : selectedCategory === 1 ? collectedPlaylists : collectedAlbums)"
                    :key="index">
                    <router-link :to="{
                        path: '/PlaylistDetail',
                        query: { global_collection_id: item.list_create_gid || item.global_collection_id, listid: item.listid }
                    }">
                        <div class="album-image-wrap">
                            <div
                                v-if="playlistCoverStyle(item)"
                                class="system-cover"
                                :class="playlistCoverStyle(item)"
                            >
                                <i :class="playlistCoverIcon(item)"></i>
                            </div>
                            <img
                                v-else
                                :src="$getCover(item.pic, 480)"
                                class="album-image"
                            />
                            <span class="cover-play"><i class="fas fa-play"></i></span>
                        </div>
                        <div class="album-info">
                            <h3>{{ displayPlaylistName(item.name) }}</h3>
                            <p>{{ item.count }} <span>{{ $t('shou-ge') }}</span></p>
                        </div>
                    </router-link>
                </div>
                <button
                    v-if="selectedCategory === 0 && !isLoading"
                    type="button"
                    class="music-card action-card create-card"
                    @click="createPlaylist"
                >
                    <div class="action-cover create">
                        <i class="fas fa-plus"></i>
                    </div>
                    <div class="album-info">
                        <h3>{{ $t('chuang-jian-ge-dan') }}</h3>
                        <p>{{ $t('xin-ge-dan') }}</p>
                    </div>
                </button>
            </template>
            <div v-if="selectedCategory === 3 || selectedCategory === 4" class="music-card"
                v-for="(artist, index) in (selectedCategory === 3 ? followedArtists : selectedCategory === 4 ? collectedFriends : [])"
                :key="index" @click="goToArtistDetail(artist)">
                <div class="album-image-wrap">
                    <img :src="artist.pic" class="album-image" />
                </div>
                <div class="album-info">
                    <h3>{{ artist.nickname }}</h3>
                </div>
            </div>
        </div>
        <div v-if="
            (selectedCategory == 0 && userPlaylists.length === 0) ||
            (selectedCategory == 1 && collectedPlaylists.length === 0) ||
            (selectedCategory == 2 && collectedAlbums.length === 0) ||
            (selectedCategory == 3 && followedArtists.length === 0) ||
            (selectedCategory == 4 && collectedFriends.length === 0)" class="empty-container">
            <div class="empty-image">
                <img src="/assets/images/empty.png" :alt="$t('zan-wu-shu-ju')" />
            </div>
            <div class="empty-description">{{ t('zhe-li-shi-mo-du-mei-you') }}</div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { get } from '../utils/request';
import { MusesAuthStore } from '../stores/store';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BirthdayEasterEgg from '../components/BirthdayEasterEgg.vue';
import CommonSkeleton from '../components/CommonSkeleton.vue';
import { getCover } from '../utils/utils';
import { createTeamEventPopup } from '../utils/teamEvent';
import {
    displayPlaylistName as formatPlaylistName,
    isLikedPlaylistName,
    playlistSystemCoverIcon,
    playlistSystemCoverType
} from '../utils/playlistDisplay';
import {
    getTrackPlaybackIcon,
    getTrackPlaybackState,
    isTrackCurrent,
    TRACK_PLAYBACK
} from '../utils/playbackState';
const { t } = useI18n();
const router = useRouter();
const MusesAuth = MusesAuthStore();
const user = ref({});
const userPlaylists = ref([]); // User-created playlists
const collectedPlaylists = ref([]); // Favorited playlists
const collectedAlbums = ref([]); // Favorited albums
const collectedFriends = ref([]); // Friends
const followedArtists = ref([]); // Followed artists
const listenHistory = ref([]); // Listening history
const userVip = ref({});
const userDetail = ref({}); // User profile details
const categories = computed(() => [
    t('wo-chuang-jian-de-ge-dan'),
    t('wo-shou-cang-de-ge-dan'),
    t('wo-shou-cang-de-zhuan-ji'),
    t('wo-guan-zhu-de-ge-shou'),
    t('wo-guan-zhu-de-hao-you')
]);
const selectedCategory = ref(0);
const isLoading = ref(true);
const LISTEN_SECTION_HIDDEN_KEY = 'library:listen-section-hidden';
const DEFAULT_PROFILE_BG_COLOR = 'rgb(245, 245, 247)';
const isListenSectionHidden = ref(localStorage.getItem(LISTEN_SECTION_HIDDEN_KEY) === '1');
const showListenSection = computed(() => !isListenSectionHidden.value && (isLoading.value || listenHistory.value.length > 0));
const profileBgColor = ref(DEFAULT_PROFILE_BG_COLOR);
const profileBackgroundImage = ref('');
const profileHeaderStyle = computed(() => ({
    '--profile-bg-image': 'none',
    '--profile-bg-color': profileBgColor.value
}));

const displayPlaylistName = (name) => formatPlaylistName(name, t);

const playlistCoverStyle = (item) => playlistSystemCoverType(item);

const playlistCoverIcon = (item) => playlistSystemCoverIcon(playlistSystemCoverType(item));

const userGenderIcon = computed(() => {
    const gender = userDetail.value.gender;
    if (gender === 1) return 'fas fa-mars';
    if (gender === 0) return 'fas fa-venus';
    return 'fas fa-user-secret';
});
const userGenderTitle = computed(() => {
    const gender = userDetail.value.gender;
    if (gender === 1) return t('xing-bie-nan');
    if (gender === 0) return t('xing-bie-nv');
    return t('xing-bie-bao-mi');
});

const selectCategory = (index) => {
    selectedCategory.value = index;
    // router.replace({ path: '/library', query: { category: index } });
};

// Format listening duration (minutes to hours and minutes)
const formatDuration = (minutes) => {
    if (!minutes) return '0';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}${t('xiao-shi')} ${mins}${t('fen-zhong')}`;
    }
    return `${mins}${t('fen-zhong')}`;
};

// Format registration date
const formatRegTime = (timestamp) => {
    if (!timestamp) return '';
    const registerDate = new Date(timestamp * 1000);
    const now = new Date();
    const years = now.getFullYear() - registerDate.getFullYear();
    return `${t('le-ling')} ${years} ${t('nian')}`;
};

const updateProfileBackground = () => {
    profileBackgroundImage.value = '';
    profileBgColor.value = DEFAULT_PROFILE_BG_COLOR;
};

const playSong = (hash, name, img, author) => {
    props.playerControl.addSongToQueue(hash, name, img, author);
};

const trackPlaybackState = (song) => getTrackPlaybackState({
    isCurrent: isTrackCurrent(props.playerControl, {
        hash: song?.hash,
        name: song?.name?.split(' - ')[1] || song?.name
    }),
    isPlaying: !!props.playerControl?.playing
});

const trackPlaybackIcon = (song) => getTrackPlaybackIcon(trackPlaybackState(song));

const trackPlaybackClass = (song) => {
    const state = trackPlaybackState(song);
    return {
        'is-current': state !== TRACK_PLAYBACK.STOPPED,
        'is-playing': state === TRACK_PLAYBACK.PLAYING,
        'is-paused': state === TRACK_PLAYBACK.PAUSED
    };
};

const handleListenSongClick = (song) => {
    const name = song.name.split(' - ')[1] || song.name;
    const state = trackPlaybackState(song);
    if (state === TRACK_PLAYBACK.PLAYING || state === TRACK_PLAYBACK.PAUSED) {
        props.playerControl?.togglePlayPause?.();
        return;
    }
    playSong(song.hash, name, getCover(song.image, 480), song.singername);
};

const props = defineProps({
    playerControl: Object
});

onMounted(() => {
    if (MusesAuth.isAuthenticated) {
        user.value = MusesAuth.UserInfo;
        // Fetch user VIP info
        getVipInfo();
    }
});
const getUserDetails = () => {
    // Fetch user profile details
    getUserDetail();
    // Fetch listening history
    const listenTask = isListenSectionHidden.value ? Promise.resolve() : getlisten();
    listenTask.finally(() => {
        isLoading.value = false;
    })
    // Fetch user-created and favorited playlists
    getplaylist()
    // Fetch followed artists
    getfollow()
    selectedCategory.value = parseInt(router.currentRoute.value.query.category || 0);
}

// Fetch user profile details
const getUserDetail = async () => {
    try {
        const detailResponse = await get('/user/detail');
        if (detailResponse.status === 1) {
            userDetail.value = detailResponse.data;
            updateProfileBackground();
        }
    } catch (error) {
        console.error('Failed to get user details:', error);
    }
}

const getVipInfo = async () => {
    try {
        const VipInfoResponse = await get('/user/vip/detail');
        if (VipInfoResponse.status === 1) {
            userVip.value = VipInfoResponse.data.busi_vip
            getUserDetails();
        }
    } catch (error) {
        window.$modal.alert(t('deng-lu-shi-xiao-qing-zhong-xin-deng-lu'));
        router.push('/login');
    }
}

const getlisten = async () => {
    const historyResponse = await get('/user/listen', { type: 1 });
    if (historyResponse.status === 1) {
        const allLists = historyResponse.data.lists;
        const shuffled = allLists.sort(() => 0.5 - Math.random());
        listenHistory.value = shuffled.slice(0, 20);
    }
}
const hideListenSection = () => {
    localStorage.setItem(LISTEN_SECTION_HIDDEN_KEY, '1');
    isListenSectionHidden.value = true;
    listenHistory.value = [];
    isLoading.value = false;
}
const getfollow = async () => {
    const followResponse = await get('/user/follow');
    if (followResponse.status === 1) {
        if (followResponse.data.total == 0) return;
        const artists = followResponse.data.lists.map(artist => ({
            ...artist,
            pic: artist.pic.replace('/100/', '/480/')
        }));
        collectedFriends.value = artists.filter(artist => !artist.singerid);
        followedArtists.value = artists.filter(artist => artist.source == 7);
    }
}
const getplaylist = async () => {
    try {
        const playlistResponse = await get('/user/playlist', {
            pagesize: 500,
            t: localStorage.getItem('t')
        });
        if (playlistResponse.status === 1) {
            const sortedInfo = playlistResponse.data.info.sort((a, b) => {
                if (a.sort !== b.sort) {
                    return a.sort - b.sort;
                }
                return 0;
            });

            userPlaylists.value = sortedInfo.filter(playlist => {
                if (isLikedPlaylistName(playlist.name)) {
                    localStorage.setItem('like', playlist.listid);
                }
                return playlist.list_create_userid === user.value.userid || isLikedPlaylistName(playlist.name);
            }).sort((a, b) => (isLikedPlaylistName(a.name) ? -1 : 0) - (isLikedPlaylistName(b.name) ? -1 : 0));

            collectedPlaylists.value = sortedInfo.filter(playlist =>
                playlist.list_create_userid !== user.value.userid && !playlist.authors
            );

            collectedAlbums.value = sortedInfo.filter(playlist =>
                playlist.list_create_userid !== user.value.userid && playlist.authors
            );

            const collectedIds = [];
            sortedInfo.forEach(playlist => {
                if (playlist.list_create_userid !== user.value.userid) {
                    collectedIds.push({
                        list_create_listid: playlist.list_create_listid,
                        listid: playlist.listid
                    });
                }
            });
            localStorage.setItem('collectedPlaylists', JSON.stringify(collectedIds));
        }
    } catch (error) {
        window.$modal.alert(t('xin-zeng-zhang-hao-qing-xian-zai-guan-fang-ke-hu-duan-zhong-deng-lu-yi-ci'));
    }
}
const createPlaylist = async () => {
    const result = await window.$modal.prompt(t('qing-shu-ru-xin-de-ge-dan-ming-cheng'), '');
    if (result) {
        try {
            const playlistResponse = await get('/playlist/add', { name: result, list_create_userid: user.value.userid });
            if (playlistResponse.status === 1) {
                localStorage.setItem('t', Date.now());
                getplaylist()
            }
        } catch (error) {
            window.$modal.alert(t('chuang-jian-shi-bai'));
        }
    }
}

const goToArtistDetail = (artist) => {
    if (!artist.singerid) return;
    router.push({
        path: '/PlaylistDetail',
        query: {
            singerid: artist.singerid,
            unfollow: true
        }
    });
};
const signIn = async () => {
    try {
        const res = await get('/youth/vip');
        if (res.status === 1) {
            window.$modal.alert(t('qian-dao-cheng-gong-huo-de-vip', { n: res.data.award_vip_hour }));
        }
    } catch (error) {
        window.$modal.alert(t('qian-dao-shi-bai-jie-kou-jiang-yi-chu'));
    }
}
const getVip = async () => {
    try {
        const todayKey = new Date().toISOString().split('T')[0];
        const vipResponse = await get('/youth/day/vip', {
            receive_day: todayKey
        });
        const result = await window.$modal.confirm(t('shi-fou-sheng-ji-gai-nian-ban-vip'));
        if (result) {
            try {
                const vipResponse = await get('/youth/day/vip/upgrade');
                if (vipResponse.status === 1) {
                    window.$modal.alert(t('sheng-ji-cheng-gong-gai-nian-ban-vip'));
                }
            } catch (error) {
                window.$modal.alert(error.error_msg || t('sheng-ji-vip-shi-bai'));
            }
        } else if (vipResponse.status === 1) {
            window.$modal.alert(t('qian-dao-cheng-gong-chang-ting-vip'));
        }
    } catch (error) {
        if (error.response.data.error_code == 131001) {
            window.$modal.alert(t('jin-tian-yi-jing-qian-dao'));
            return;
        } else if (error.response.data.error_code == 20028) {
            window.$modal.alert(t('zhang-hao-feng-kong-shou-ji-ling-qu'));
            return;
        }
        window.$modal.alert(t('huo-qu-vip-shi-bai-dai-ma', { code: error.response.data.error_code }));
    }
}
const addAllSongsToQueue = () => {
    props.playerControl.addPlaylistToQueue(listenHistory.value.map(song => ({
        hash: song.hash,
        name: song.name,
        cover: song.image?.replace("{size}", 480),
        author: song.author_name,
        timelen: song.duration
    })));
};
</script>

<style lang="scss" scoped>
.sign-in {
    cursor: pointer;
    color: var(--primary-color);
    margin-left: 10px;
    border-radius: 5px;
    padding: 2px 8px;
    border: 1px solid var(--primary-color);
    font-size: 12px;
}

.library-page {
    padding: 20px 24px 28px;
    --library-favorite-card-bg: #f5f5f7;
    --library-favorite-card-hover-bg: #ececef;
    --library-favorite-title: #1d1d1f;
    --library-favorite-text: #86868b;
    color: #1d1d1f;
}

:global(.dark) .library-page {
    --library-favorite-card-bg: rgba(44, 44, 46, 0.92);
    --library-favorite-card-hover-bg: rgba(58, 58, 60, 0.95);
    --library-favorite-title: rgba(255, 255, 255, 0.92);
    --library-favorite-text: rgba(235, 235, 245, 0.55);
    color: rgba(255, 255, 255, 0.92);
}

.user-level {
    width: auto;
    margin-left: 10px;
    cursor: pointer;
}

.section-title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #1d1d1f;
    cursor: pointer;
    margin-bottom: 0;
    display: inline-block;

    &:is(.dark .section-title) {
        color: rgba(255, 255, 255, 0.92);
    }
}

.favorite-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.favorite-close-button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: none!important;
    background-color: transparent!important;
    color: transparent!important;
    cursor: pointer;
    transition: color 0.2s ease;

    &:is(.dark .favorite-close-button ){
        background-color: transparent!important;
    }

    &:hover {
        color: #86868b!important;
    }
}

.profile-section {
    display: flex;
    align-items: center;
}

.profile-header {
    width: 100%;
    height: 100%;
    min-height: 164px;
    border-radius: 18px;
    margin-bottom: 24px;
    display: flex;
    align-items: flex-end;
    padding: 22px 24px;
    box-shadow: none;
    position: relative;
    overflow: hidden;
    background: #f5f5f7;
    border: 1px solid rgba(0, 0, 0, 0.04);

    &:is(.dark .profile-header) {
        background: #2c2c2e;
        border-color: rgba(255, 255, 255, 0.06);
    }
}

.profile-background-image-wrap,
.profile-background-main,
.profile-background-top,
.profile-background-bottom,
.profile-background-right,
.profile-background-image {
    display: none !important;
}

.profile-info {
    display: flex;
    align-items: flex-end;
    gap: 18px;
    color: #1d1d1f;
    text-shadow: none;
    width: 100%;
    z-index: 3;

    &:is(.dark .profile-info) {
        color: rgba(255, 255, 255, 0.92);
    }
}

.profile-pic {
    border-radius: 50%;
    width: 90px;
    height: 90px;
    border: 0;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    margin-bottom: 10px;
    position: relative;
    top: -20px;
    object-fit: cover;
    background: #e5e5ea;
}

.user-details {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    height: 100%;
    flex: 1;
    min-width: 0;
}

.user-name-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 0;
    margin-bottom: 4px;
}

.user-name {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.03em;
    margin: 0;
    color: inherit;
}

.user-level {
    font-size: 12px;
    font-weight: 600;
    background-color: rgba(0, 0, 0, 0.06);
    padding: 3px 8px;
    border-radius: 999px;
    color: #1d1d1f;

    &:is(.dark .user-level) {
        background-color: rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.92);
    }
}

.user-vip-icon {
    height: 20px;
    margin-left: 8px;
}

.user-signature {
    font-size: 14px;
    font-weight: 400;
    color: #86868b;
    margin-bottom: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
}

.user-stats {
    display: flex;
    justify-content: flex-start;
    gap: 22px;
    margin-bottom: 8px;
    font-size: 14px;
    color: inherit;
}

.stat-item {
    text-align: left;
}

.stat-value {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.02em;
    display: inline-block;
    margin-right: 4px;
    color: inherit;
}

.stat-label {
    display: inline-block;
    font-size: 12px;
    font-weight: 500;
    color: #86868b;
}

.user-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #86868b;
    margin-bottom: 12px;
}

.user-gender i {
    font-size: 14px;
    color: #86868b;
}

.user-duration,
.user-age {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 4px 10px;
    border-radius: 999px;
    color: #6e6e73;
    font-weight: 500;

    &:is(.dark .user-duration),
    &:is(.dark .user-age) {
        background-color: rgba(255, 255, 255, 0.1);
        color: rgba(235, 235, 245, 0.7);
    }
}

.user-actions {
    display: flex;
    gap: 8px;
    margin-top: 2px;
}

.action-button {
    background-color: #1d1d1f;
    padding: 6px 14px;
    border-radius: 999px;
    color: #fff;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    border: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;

    &:hover {
        opacity: 0.88;
        background-color: #1d1d1f;
    }

    &:is(.dark .action-button) {
        background-color: #f5f5f7;
        color: #1d1d1f;
    }
}

.favorite-section {
    display: flex;
    justify-content: space-between;
    padding-top: 12px;
    padding-bottom: 8px;
}

.favorite-playlist {
    background-color: var(--background-color);
    padding: 20px;
    border-radius: 12px;
    flex: 1;
    margin-right: 20px;
    border: 1px solid var(--secondary-color);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
}

.playlist-info p {
    margin: 10px 0;
}

.play-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background-color: #1d1d1f;
    color: white;
    border: none;
    border-radius: 25px;
    padding: 10px 15px;
    cursor: pointer;

    i {
        font-size: 16px;
    }
}

.song-list {
    width: 100%;
    background: transparent;

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 8px;
    }

    li {
        position: relative;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        min-height: 64px;
        cursor: pointer;
        border-radius: 12px;
        padding: 8px 40px 8px 8px;
        background-color: var(--library-favorite-card-bg);
        transition: background-color 0.2s ease;
        box-shadow: none;

        &:hover {
            transform: none;
            background-color: var(--library-favorite-card-hover-bg);
            box-shadow: none;

            .song-play-icon {
                opacity: 1;
                transform: translateY(-50%) scale(1);
            }

            .song-playing-dot {
                opacity: 0;
            }
        }

        &.is-playing .song-play-icon {
            background: var(--primary-color);
        }
    }

    img {
        width: 48px;
        height: 48px;
        flex-shrink: 0;
        border-radius: 8px;
        object-fit: cover;
    }
}

.category-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 8px 0 24px;

    button {
        position: relative;
        overflow: hidden;
        padding: 8px 14px;
        border: none;
        background-color: #f5f5f7;
        color: #6e6e73;
        border-radius: 999px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: -0.01em;
        transition: background-color 0.2s ease, color 0.2s ease;

        &:hover {
            color: #1d1d1f;
            background-color: #ececef;
        }

        &.active {
            background-color: #1d1d1f;
            color: #fff;
            box-shadow: none;
            transform: none;
            animation: none;

            &::after {
                display: none;
            }
        }

        &::after {
            display: none;
        }

        &:is(.dark button) {
            background-color: #2c2c2e;
            color: rgba(235, 235, 245, 0.6);
        }

        &:is(.dark button:hover) {
            color: #fff;
            background-color: #3a3a3c;
        }

        &:is(.dark button.active) {
            background-color: #f5f5f7;
            color: #1d1d1f;
        }
    }
}

@keyframes categoryActivePop {
    0% {
        transform: translateY(0) scale(0.96);
    }

    100% {
        transform: translateY(-2px) scale(1);
    }
}

@keyframes categoryShine {
    0% {
        transform: translateX(-120%);
    }

    100% {
        transform: translateX(120%);
    }
}

.music-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 28px 20px;
}

.music-card {
    min-width: 0;
    border-radius: 0;
    padding-bottom: 0;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    font: inherit;
    color: inherit;
    transition: none;

    a {
        display: block;
        color: inherit;
        text-decoration: none;
    }

    &:hover {
        .album-image,
        .action-cover,
        .system-cover {
            transform: scale(1.015);
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
        }

        .cover-play {
            opacity: 1;
            transform: translateY(0);
        }
    }
}

.album-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 10px;
    transition: transform 0.28s ease, box-shadow 0.28s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.album-image-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 10px;
    background: #f2f2f7;
}

.cover-play {
    position: absolute;
    right: 10px;
    bottom: 10px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.92);
    color: #1c1c1e;
    display: grid;
    place-items: center;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
    font-size: 12px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
    backdrop-filter: blur(8px);
}

.action-cover,
.system-cover {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #fff;
    transition: transform 0.28s ease, box-shadow 0.28s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

    i {
        font-size: 42px;
        line-height: 1;
    }
}

.action-cover {
    &.cloud {
        background: linear-gradient(160deg, #64d2ff 0%, #0a84ff 100%);
    }

    &.local {
        background: linear-gradient(160deg, #30d158 0%, #248a3d 100%);
    }

    &.create {
        color: #8e8e93;
        background: #f2f2f7;
        border: 0;
        box-shadow: inset 0 0 0 1px rgba(60, 60, 67, 0.08);

        i {
            font-size: 36px;
            font-weight: 300;
        }
    }
}

.system-cover {
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

.album-info {
    padding-top: 10px;

    h3 {
        margin: 0 0 2px;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.02em;
        color: #1d1d1f;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.3;

        &:is(.dark h3) {
            color: rgba(255, 255, 255, 0.92);
        }
    }

    p {
        margin: 0;
        color: #86868b;
        font-size: 13px;
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.create-card {
    text-align: left;
}

.song-item {
    display: flex;
    align-items: center;
}

.album-cover {
    width: 50px;
    height: 50px;
    border-radius: 8px;
}

.song-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    flex: 1;
}

.album-name,
.singer-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.album-name {
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0 0 2px;
    font-size: 14px;
    color: var(--library-favorite-title);
}

.singer-name {
    margin: 0;
    font-size: 12px;
    color: var(--library-favorite-text);
}

.song-play-icon {
    position: absolute;
    top: 50%;
    right: 14px;
    transform: translateY(-50%) scale(0.92);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #1d1d1f;
    color: #fff;
    font-size: 10px;
    opacity: 0;
    transition: opacity 0.18s ease, transform 0.18s ease, background-color 0.18s ease;
    pointer-events: none;
}

.song-playing-dot {
    position: absolute;
    top: 50%;
    right: 24px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary-color);
    transform: translateY(-50%);
    box-shadow: 0 0 0 4px rgba(var(--primary-color-rgb), 0.16);
    pointer-events: none;
    transition: opacity 0.18s ease;
}

.empty-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 0;
    width: 100%;
}

.empty-image {
    margin-bottom: 20px;
    display: flex;
    justify-content: center;

    img {
        width: 120px;
        height: 120px;
        opacity: 0.35;
        filter: grayscale(1);
    }
}

.empty-description {
    color: var(--secondary-color);
    font-size: 14px;
    text-align: center;
    margin-left: 0;
}
</style>
