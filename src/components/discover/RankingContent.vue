<template>
    <div class="ranking-container">
        <div class="rank-selector-shell" :class="{ collapsed: showRankSelectorToggle && !isRankSelectorExpanded }">
            <div class="rank-selector-wrapper" :style="{ height: `${rankSelectorHeight}px` }">
                <div ref="rankSelectorRef" class="rank-selector">
                    <div v-for="rank in sortedRanks" :key="rank.rankid" class="rank-chip"
                        :class="{ active: selectedRankIds.includes(rank.rankid) }" @click="toggleRank(rank)">
                        {{ translateRankName(rank.rankname) }}
                    </div>
                </div>
            </div>
            <button v-if="showRankSelectorToggle" class="rank-selector-toggle"
                :class="{ expanded: isRankSelectorExpanded }" type="button" :aria-expanded="isRankSelectorExpanded"
                @click="toggleRankSelector">
                <span>{{ isRankSelectorExpanded ? $t('shou-qi') : $t('zhan-kai-geng-duo') }}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
        </div>

        <div class="ranking-list">
            <div class="ranking-item" v-for="(rank, index) in displayedRanks" :key="index">
                <div class="rank-header">
                    <div class="rank-cover localized" :style="rankCoverStyle(rank)">
                        <i class="rank-cover-icon fas fa-chart-line"></i>
                        <span class="rank-cover-label">{{ translateRankName(rank.rankname) }}</span>
                    </div>
                    <div class="rank-info">
                        <h2 class="rank-title">{{ translateRankName(rank.rankname) }}</h2>
                        <span class="rank-update">{{ translateRankIntro(rank) }}</span>
                    </div>
                    <button class="rank-play-btn" type="button" @click.stop="handlePlayClick($event, rank.songs)"
                        :aria-label="$t('bo-fang')">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
                <div class="song-list" @scroll="handleScroll($event, rank.rankid)">
                    <div class="song-item" v-for="(song, sIndex) in rank.songs" :key="sIndex"
                        @click="playerControl?.addSongToQueue(song.deprecated.hash, song.songname, $getCover(song.trans_param.union_cover, 480), song.author_name)">
                        <div class="song-rank">
                            <span class="song-index" :class="{ 'top-three': sIndex < 3 }">{{ sIndex + 1 }}</span>
                        </div>
                        <div class="song-cover">
                            <img :src="$getCover(song.trans_param.union_cover, 120)">
                            <div class="hover-play">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                        <div class="song-info">
                            <div class="song-content">
                                <div class="song-main">
                                    <div class="song-name">{{ song.songname }}</div>
                                    <div class="song-author">{{ song.author_name }}</div>
                                </div>
                                <div class="song-meta">
                                    <span class="album">{{ song.album_name }}</span>
                                    <span class="duration">{{ $formatMilliseconds(song.deprecated.duration) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="rankPagination[rank.rankid]?.loading" class="loading-indicator">
                        <div class="loading-spinner"></div>
                        <span>{{ $t('jia-zai-zhong') }}</span>
                    </div>

                    <div v-else-if="!rankPagination[rank.rankid]?.hasMore && rank.songs?.length > 0"
                        class="no-more-indicator">
                        <span>{{ $t('yi-jia-zai-quan-bu-ge-qu') }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { get } from '../../utils/request';

const props = defineProps({
    playerControl: Object
});

const { t, te, locale } = useI18n();

const translateRankName = (name) => {
    if (!name) return '';
    // Simplified Chinese keeps API names as-is
    if (locale.value === 'zh-CN') return name;
    const key = `rank-name.${name}`;
    return (te(key) || te(key, 'en')) ? t(key) : name;
};

const formatIntro = (intro) => {
    if (!intro) return '';
    const parts = intro.replace(/\r/g, '').split('\n');
    const sortRule = parts.find(p => p.includes('排序方式：'))?.replace('排序方式：', '').trim() || '';
    const updateFreq = parts.find(p => p.includes('更新频率：'))?.replace('更新频率：', '').trim() || '';

    if (sortRule && updateFreq) {
        return `${sortRule} (${updateFreq})`;
    }
    return intro.replace(/\r/g, '').replace(/\n/g, ' ').trim();
};

const translateRankIntro = (rank) => {
    if (!rank) return '';
    if (locale.value === 'zh-CN') {
        return formatIntro(rank.intro);
    }
    const key = `rank-intro.${rank.rankname}`;
    if (te(key) || te(key, 'en')) return t(key);
    return formatIntro(rank.intro);
};

const RANK_COVER_GRADIENTS = [
    'linear-gradient(160deg, #ff7eb3 0%, #ff375f 55%, #d70015 100%)',
    'linear-gradient(160deg, #64d2ff 0%, #0a84ff 55%, #0066cc 100%)',
    'linear-gradient(160deg, #bf5af2 0%, #8944ab 55%, #5e2b7e 100%)',
    'linear-gradient(160deg, #ff9f0a 0%, #ff6500 55%, #c93400 100%)',
    'linear-gradient(160deg, #30d158 0%, #248a3d 55%, #1b5e2a 100%)',
    'linear-gradient(160deg, #5e5ce6 0%, #3634a3 55%, #2c2a7a 100%)',
    'linear-gradient(160deg, #ffd60a 0%, #ff9f0a 55%, #c93400 100%)',
    'linear-gradient(160deg, #64d2ff 0%, #30b0c7 55%, #0a7f8c 100%)'
];

const rankCoverStyle = (rank) => {
    const seed = Number(rank?.rankid) || 0;
    return {
        background: RANK_COVER_GRADIENTS[Math.abs(seed) % RANK_COVER_GRADIENTS.length]
    };
};

const allRanks = ref([]);
const displayedRanks = ref([]);
const selectedRankIds = ref([]);
const rankSelectorRef = ref(null);
const showRankSelectorToggle = ref(false);
const isRankSelectorExpanded = ref(false);
const rankSelectorHeight = ref(0);
const pagesize = 30;
const rankPagination = ref({});
let rankSelectorObserver = null;

const sortedRanks = computed(() => {
    const selectedOrder = new Map(selectedRankIds.value.map((rankId, index) => [rankId, index]));

    return [...allRanks.value].sort((a, b) => {
        const aIndex = selectedOrder.get(a.rankid);
        const bIndex = selectedOrder.get(b.rankid);

        if (aIndex !== undefined && bIndex !== undefined) {
            return aIndex - bIndex;
        }

        if (aIndex !== undefined) {
            return -1;
        }

        if (bIndex !== undefined) {
            return 1;
        }

        return 0;
    });
});

const updateRankSelectorHeight = async () => {
    await nextTick();

    const element = rankSelectorRef.value;
    if (!element) return;

    const chips = Array.from(element.querySelectorAll('.rank-chip'));
    if (chips.length === 0) {
        showRankSelectorToggle.value = false;
        rankSelectorHeight.value = 0;
        return;
    }

    const style = window.getComputedStyle(element);
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const rowTops = [...new Set(chips.map(chip => chip.offsetTop))].sort((a, b) => a - b);
    const chipHeight = chips[0].offsetHeight;
    const collapsedHeight = rowTops.length > 1 ? rowTops[1] + chipHeight + paddingBottom : element.scrollHeight;

    showRankSelectorToggle.value = rowTops.length > 2 && element.scrollHeight > collapsedHeight + 1;

    if (!showRankSelectorToggle.value) {
        isRankSelectorExpanded.value = false;
    }

    rankSelectorHeight.value = showRankSelectorToggle.value && !isRankSelectorExpanded.value
        ? collapsedHeight
        : element.scrollHeight;
};

const toggleRankSelector = async () => {
    isRankSelectorExpanded.value = !isRankSelectorExpanded.value;
    await updateRankSelectorHeight();
};

const saveSelectedRanks = () => {
    localStorage.setItem('selectedRankIds', JSON.stringify(selectedRankIds.value));
};

const initRankPagination = (rankId) => {
    if (!rankPagination.value[rankId]) {
        rankPagination.value[rankId] = {
            currentPage: 1,
            loading: false,
            hasMore: true
        };
    }
};

const loadRankSongs = async (rankId, page = 1, append = false) => {
    const pagination = rankPagination.value[rankId];
    if (pagination.loading) return;

    pagination.loading = true;

    try {
        const songsResponse = await get(`/rank/audio?rankid=${rankId}&page=${page}&pagesize=${pagesize}`);
        if (songsResponse.status === 1) {
            const newSongs = songsResponse.data.songlist || [];
            const rank = displayedRanks.value.find(r => r.rankid === rankId);

            if (rank) {
                rank.songs = append ? [...(rank.songs || []), ...newSongs] : newSongs;
            }

            if (newSongs.length < pagesize) {
                pagination.hasMore = false;
            }

            pagination.currentPage = page;
        }
    } catch (error) {
        console.error('加载排行榜歌曲失败:', error);
    } finally {
        pagination.loading = false;
    }
};

const loadSelectedRanks = async (rankList, rankIds) => {
    for (const rankId of rankIds) {
        const rank = rankList.find(r => r.rankid === rankId);
        if (rank) {
            selectedRankIds.value.push(rank.rankid);
            initRankPagination(rank.rankid);
            displayedRanks.value.push(rank);
            await loadRankSongs(rank.rankid, 1, false);
        }
    }
};

const loadRandomRanks = async (rankList, count = 4) => {
    const randomRanks = [...rankList].sort(() => 0.5 - Math.random()).slice(0, count);

    for (const rank of randomRanks) {
        selectedRankIds.value.push(rank.rankid);
        initRankPagination(rank.rankid);
        displayedRanks.value.push(rank);
        await loadRankSongs(rank.rankid, 1, false);
    }
    saveSelectedRanks();
};

const toggleRank = async (rank) => {
    const index = selectedRankIds.value.indexOf(rank.rankid);

    if (index === -1 && selectedRankIds.value.length < 6) {
        selectedRankIds.value.push(rank.rankid);
        initRankPagination(rank.rankid);
        displayedRanks.value.push(rank);
        await loadRankSongs(rank.rankid, 1, false);
    } else if (index !== -1) {
        selectedRankIds.value.splice(index, 1);
        displayedRanks.value = displayedRanks.value.filter(r => r.rankid !== rank.rankid);
        delete rankPagination.value[rank.rankid];
    }

    await updateRankSelectorHeight();
    saveSelectedRanks();
};

const playRankSongs = (songs) => {
    if (props.playerControl && songs?.length) {
        const newTracks = songs.map(song => ({
            hash: song.deprecated.hash,
            author: song.author_name,
            name: song.songname,
            cover: song.trans_param.union_cover?.replace("{size}", 120),
            timelen: song.deprecated.duration
        }));
        props.playerControl.addPlaylistToQueue(newTracks);
    }
};

const handleScroll = (event, rankId) => {
    const element = event.target;
    const pagination = rankPagination.value[rankId];

    if (!pagination || pagination.loading || !pagination.hasMore) {
        return;
    }

    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - 50) {
        const nextPage = pagination.currentPage + 1;
        loadRankSongs(rankId, nextPage, true);
    }
};

const handlePlayClick = (event, songs) => {
    const note = document.createElement('i');
    note.className = 'fas fa-music music-note';
    const x = event.clientX;
    const y = event.clientY;
    note.style.left = x + 'px';
    note.style.top = y + 'px';

    document.body.appendChild(note);
    const targetX = window.innerWidth - 300;
    const targetY = window.innerHeight - 100;

    const deltaX = targetX - x;
    const deltaY = targetY - y;

    requestAnimationFrame(() => {
        note.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        note.style.opacity = '0';
    });

    setTimeout(() => {
        document.body.removeChild(note);
    }, 1000);

    playRankSongs(songs);
};

onMounted(async () => {
    rankSelectorObserver = new ResizeObserver(() => {
        updateRankSelectorHeight();
    });

    if (rankSelectorRef.value) {
        rankSelectorObserver.observe(rankSelectorRef.value);
    }

    window.addEventListener('resize', updateRankSelectorHeight);

    const response = await get('/rank/list');
    if (response.status === 1) {
        allRanks.value = response.data.info;

        const savedRankIds = localStorage.getItem('selectedRankIds');
        if (savedRankIds) {
            const rankIds = JSON.parse(savedRankIds);
            await loadSelectedRanks(allRanks.value, rankIds);
        } else {
            await loadRandomRanks(allRanks.value, 4);
        }
    }

    await updateRankSelectorHeight();
});

onBeforeUnmount(() => {
    rankSelectorObserver?.disconnect();
    window.removeEventListener('resize', updateRankSelectorHeight);
});
</script>

<style lang="scss" scoped>
.ranking-container {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 0;
    --ranking-surface: #ffffff;
    --ranking-surface-soft: #f5f5f5;
    --ranking-surface-muted: #f6f7fb;
    --ranking-hover-surface: #f8f9fa;
    --ranking-chip-hover: #eeeeee;
    --ranking-text: #333;
    --ranking-text-secondary: #666;
    --ranking-text-muted: #999;
    --ranking-border: #f0f0f0;
    --ranking-scroll-thumb: #ddd;
    --ranking-play-bg: var(--primary-color);
    --ranking-play-color: #fff;
    --ranking-play-shadow: 0 6px 16px rgba(var(--primary-color-rgb), 0.35);
    --ranking-hover-play-bg: rgba(255, 255, 255, 0.92);
    --ranking-hover-play-color: #1c1c1e;
    --ranking-card-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    --ranking-card-shadow-hover: 0 8px 30px rgba(0, 0, 0, 0.12);
    --ranking-selector-fade: linear-gradient(180deg, rgba(255, 255, 255, 0), #ffffff);

    &:is(.dark .ranking-container) {
        --ranking-surface: #1d1d1d;
        --ranking-surface-soft: #2a2a2a;
        --ranking-surface-muted: #23252b;
        --ranking-hover-surface: #26282f;
        --ranking-chip-hover: #32343b;
        --ranking-text: rgba(255, 255, 255, 0.86);
        --ranking-text-secondary: rgba(255, 255, 255, 0.62);
        --ranking-text-muted: rgba(255, 255, 255, 0.42);
        --ranking-border: #333;
        --ranking-scroll-thumb: #444;
        --ranking-play-bg: var(--primary-color);
        --ranking-play-color: #fff;
        --ranking-play-shadow: 0 8px 20px rgba(var(--primary-color-rgb), 0.4);
        --ranking-hover-play-bg: rgba(28, 28, 30, 0.88);
        --ranking-hover-play-color: #fff;
        --ranking-card-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
        --ranking-card-shadow-hover: 0 16px 36px rgba(0, 0, 0, 0.32);
        --ranking-selector-fade: linear-gradient(180deg, rgba(29, 29, 29, 0), #1d1d1d);
    }
}

.rank-selector-shell {
    padding: 12px;
    background: var(--ranking-surface);
    border-radius: 8px;
    box-shadow: var(--ranking-card-shadow);
}

.rank-selector-wrapper {
    overflow: hidden;
    position: relative;
    transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.rank-selector-shell.collapsed .rank-selector-wrapper::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 40px;
    pointer-events: none;
    background: var(--ranking-selector-fade);
}

.rank-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    &:is(.dark .rank-selector) {
        background: transparent !important;
    }
}

.rank-chip {
    height: 32px;
    padding: 0 13px;
    border-radius: 8px;
    background: var(--ranking-surface-soft);
    color: var(--ranking-text-secondary);
    font-size: 13px;
    line-height: 32px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        background: var(--ranking-chip-hover);
        transform: translateY(-2px);
    }

    &.active {
        background: var(--primary-color) !important;
        color: white;
    }
}

.rank-selector-toggle {
    width: 100%;
    margin-top: 12px;
    height: 34px;
    padding: 0 14px;
    border: none;
    border-radius: 8px;
    background: var(--ranking-surface-muted);
    color: var(--ranking-text-secondary);
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        color: var(--primary-color);
        background: var(--ranking-hover-surface);
    }

    i {
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    &.expanded i {
        transform: rotate(180deg);
    }
}

.ranking-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
    padding: 0;
}

.ranking-item {
    background: var(--ranking-surface);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: var(--ranking-card-shadow);
    transition: all 0.3s ease;
    height: 600px;
    display: flex;
    flex-direction: column;

    &:hover {
        transform: translateY(-4px);
        box-shadow: var(--ranking-card-shadow-hover);
    }
}

.rank-header {
    display: flex;
    align-items: center;
    padding: 16px;
    position: relative;
    background: linear-gradient(to right, rgba(var(--primary-color-rgb), 0.1), transparent);
}

.rank-cover {
    width: 100px;
    height: 100px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 20px rgba(0, 0, 0, 0.1);
    flex-shrink: 0;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
    }

    &:hover img {
        transform: scale(1.05);
    }

    &.localized {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 12px 10px;
        box-sizing: border-box;
    }

    .rank-cover-icon {
        color: rgba(255, 255, 255, 0.95);
        font-size: 22px;
        line-height: 1;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
    }

    .rank-cover-label {
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.2;
        text-align: center;
        word-break: break-word;
        max-height: 2.4em;
        overflow: hidden;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);
    }
}

.rank-info {
    flex: 1;
    margin-left: 20px;
    min-width: 0;
    padding-right: 48px;
}

.rank-title {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 6px 0;
    color: var(--ranking-text);
    line-height: 1.2;
}

.rank-update {
    font-size: 13px;
    color: var(--ranking-text-secondary);
}

.rank-play-btn {
    position: absolute;
    top: 50%;
    right: 18px;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: var(--ranking-play-bg);
    color: var(--ranking-play-color);
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: var(--ranking-play-shadow);
    transition: opacity 0.2s ease, transform 0.2s ease;

    &:hover {
        opacity: 0.9;
        transform: translateY(-50%) scale(1.04);
    }

    i {
        font-size: 12px;
        margin-left: 2px;
        color: inherit;
        line-height: 1;
    }
}

.song-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 10px;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--ranking-scroll-thumb);
        border-radius: 3px;
    }

    &::-webkit-scrollbar-track {
        background: var(--ranking-surface-soft);
    }
}

.song-item {
    display: flex;
    align-items: center;
    padding: 12px 8px;
    border-radius: 6px;
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
        background: var(--ranking-hover-surface);

        .hover-play {
            opacity: 1;
        }
    }
}

.song-rank {
    width: 40px;
    text-align: center;
}

.song-index {
    font-size: 16px;
    font-weight: 500;
    color: var(--ranking-text-muted);

    &.top-three {
        font-size: 18px;
        font-weight: 600;
        background: linear-gradient(45deg, #ff6b6b, #ff8787);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
}

.song-cover {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 6px;
    overflow: hidden;
    margin: 0 16px;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
}

.hover-play {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.22);
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;

    i {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--ranking-hover-play-bg);
        color: var(--ranking-hover-play-color);
        display: grid;
        place-items: center;
        font-size: 11px;
        padding-left: 2px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
        backdrop-filter: blur(8px);
    }
}

.song-info {
    flex: 1;
    min-width: 0;
    padding-right: 12px;
}

.song-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.song-main {
    flex: 2;
    min-width: 0;
    margin-right: 16px;
}

.song-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--ranking-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.song-author {
    font-size: 13px;
    color: var(--ranking-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.song-meta {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
}

.album {
    flex: 1;
    font-size: 12px;
    color: var(--ranking-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 16px;
    text-align: right;
}

.duration {
    font-size: 12px;
    color: var(--ranking-text-muted);
    flex-shrink: 0;
    min-width: 45px;
    text-align: right;
}

.loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: var(--ranking-text-secondary);
    font-size: 14px;
    gap: 8px;
}

.loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--ranking-border);
    border-top: 2px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.no-more-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    color: var(--ranking-text-muted);
    font-size: 13px;
    border-top: 1px solid var(--ranking-border);
    margin-top: 8px;
}

@media (max-width: 1200px) {
    .ranking-list {
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
    }

    .ranking-item {
        height: 500px;
        min-height: 500px;
    }

    .rank-header {
        padding: 15px;
    }

    .rank-cover {
        width: 80px;
        height: 80px;
    }

    .rank-title {
        font-size: 20px;
    }

    .rank-update {
        font-size: 12px;
    }
}

@media (max-width: 768px) {
    .ranking-container {
        padding: 0;
    }

    .rank-selector {
        gap: 8px;
    }

    .rank-selector-shell {
        padding: 12px;
    }

    .rank-chip {
        padding: 6px 12px;
        font-size: 12px;
    }

    .rank-selector-toggle {
        margin-top: 10px;
        padding: 8px 12px;
        font-size: 12px;
    }

    .ranking-list {
        gap: 12px;
        grid-template-columns: 1fr;
    }

    .ranking-item {
        height: 400px;
    }

    .rank-cover {
        width: 60px;
        height: 60px;
    }

    .rank-info {
        margin-left: 10px;
    }

    .rank-title {
        font-size: 16px;
        margin: 0 0 4px 0;
    }

    .song-cover {
        width: 40px;
        height: 40px;
        margin: 0 10px;
    }

    .song-rank {
        width: 30px;
    }

    .song-name {
        font-size: 13px;
    }

    .song-author {
        font-size: 12px;
    }

    .album {
        display: none;
    }
}

:global(.music-note) {
    position: fixed;
    color: #ff6b6b;
    font-size: 24px;
    pointer-events: none;
    z-index: 9999;
    transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
