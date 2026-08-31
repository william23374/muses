<template>
    <div class="player-container">
        <div class="progress-bar" @mousedown="onProgressDragStart" @click="updateProgressFromEvent"
            @mousemove="updateTimeTooltip" @mouseleave="hideTimeTooltip">
            <div class="progress" :style="{ width: progressWidth + '%' }"></div>
            <div class="progress-handle" :style="{ left: progressWidth + '%' }"></div>
            <div v-for="(point, index) in climaxPoints" :key="index" class="climax-point"
                :style="{ left: point.position + '%' }">
            </div>
            <div v-if="showTimeTooltip" class="time-tooltip" :style="{ left: tooltipPosition + 'px' }">
                {{ tooltipTime }}
            </div>
        </div>
        <div class="player-bar">
            <div class="album-art" @click="toggleLyrics(currentSong.hash, currentTime)">
                <img v-if="currentSong.img" :src="currentSong.img" alt="Album Art" />
                <i v-else class="fas fa-music"></i>
                <span class="album-art-hover-indicator" aria-hidden="true">
                    <i class="fas fa-angle-double-up"></i>
                </span>
            </div>
            <div class="song-info" @click="toggleLyrics(currentSong.hash, currentTime)">
                <div class="song-title-row">
                    <div class="song-title" @click.stop="searchSong(currentSong.name)">{{ currentSong?.name || "Muses" }}</div>
                    <div v-if="currentSong?.qualityLabel" class="quality-menu-wrapper" @click.stop>
                        <button
                            type="button"
                            :class="['quality-badge', { clickable: canSwitchQuality }]"
                            @click.stop="toggleQualityMenu"
                        >
                            {{ currentSong.qualityLabel }}
                        </button>
                        <transition name="player-menu">
                            <div v-if="qualityMenuOpen && canSwitchQuality" class="player-menu quality-menu">
                                <div v-if="!currentSong?.qualityOptions?.length" class="player-menu-item disabled">{{ $t('zan-wu-ke-xuan-yin-zhi') }}</div>
                                <button
                                    v-for="option in currentSong.qualityOptions"
                                    :key="`${option.value}-${option.hash}`"
                                    type="button"
                                    class="player-menu-item"
                                    :class="{ active: isCurrentQualityOption(option) }"
                                    @click.stop="switchQuality(option)"
                                >
                                    {{ option.label }}
                                </button>
                            </div>
                        </transition>
                    </div>
                </div>
                <div class="artist" @click.stop="searchSong(currentSong.author)">{{ currentSong?.author || "Muses" }}</div>
            </div>
            <div class="controls">
                <button class="control-btn" :title="t('shang-yi-shou')" @click="playSongFromQueue('previous')">
                    <i class="fas fa-step-backward"></i>
                </button>
                <button class="control-btn" :title="t('zan-ting-bo-fang')" @click="togglePlayPause">
                    <i :class="playing ? 'fas fa-pause' : 'fas fa-play'"></i>
                </button>
                <button class="control-btn" :title="t('xia-yi-shou')" @click="playSongFromQueue('next')">
                    <i class="fas fa-step-forward"></i>
                </button>
            </div>
            <div class="extra-controls">
                <button class="extra-btn" :title="t('zhuo-mian-ge-ci')" v-if="isElectron()" @click="desktopLyrics"><i
                        class="fas">{{ $t('ci') }}</i></button>
                <div class="playback-speed">
                    <button class="extra-btn speed-btn" @click="toggleSpeedMenu" :title="t('bo-fang-su-du')">
                        <i class="fas fa-tachometer-alt"></i>
                    </button>
                    <transition name="player-menu">
                        <div v-if="showSpeedMenu" class="player-menu speed-menu">
                            <div v-for="speed in playbackSpeeds" :key="speed" class="player-menu-item speed-option"
                                :class="{ active: currentSpeed === speed }" @click="changePlaybackSpeed(speed)">
                                {{ speed }}x
                            </div>
                        </div>
                    </transition>
                </div>
                <button class="extra-btn" :title="t('wo-xi-huan')" @click="playlistSelect.toLike()"><i
                        class="fas fa-heart"></i></button>
                <button class="extra-btn" :title="t('shou-cang-zhi')" @click="playlistSelect.fetchPlaylists()"><i
                        class="fas fa-add"></i></button>
                <button class="extra-btn" :title="t('fen-xiang-ge-qu')" @click="share(currentSong.name, currentSong.hash)"><i
                        class="fas fa-share"></i></button>
                <div class="playback-mode">
                    <button class="extra-btn" @click="togglePlaybackMode">
                        <i v-if="currentPlaybackModeIndex != '2'" :class="currentPlaybackMode.icon"
                            :title="currentPlaybackMode.title"></i>
                        <span v-else class="loop-icon" :title="currentPlaybackMode.title">
                            <i class="fas fa-repeat"></i>
                            <sup>1</sup>
                        </span>
                    </button>
                    <div class="player-menu playback-mode-menu">
                        <button
                            v-for="(mode, index) in playbackModes"
                            :key="mode.title"
                            type="button"
                            class="player-menu-item playback-mode-option"
                            :class="{ active: currentPlaybackModeIndex === index }"
                            :title="mode.title"
                            @click.stop="setPlaybackMode(index)"
                        >
                            <i v-if="index !== 2" :class="mode.icon"></i>
                            <span v-else class="loop-icon">
                                <i class="fas fa-repeat"></i>
                                <sup>1</sup>
                            </span>
                            <span>{{ mode.title }}</span>
                        </button>
                    </div>
                </div>
                <button class="extra-btn" :title="t('bo-fang-lie-biao')" @click="queueList.openQueue()"><i class="fas fa-list"></i></button>
                <!-- Volume control -->
                <div class="volume-control" @wheel="handleVolumeScroll">
                    <i :class="isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up'" @click="toggleMute"></i>
                    <div class="volume-slider-wrap" :class="{ 'show-volume-value': isDragging }">
                        <div class="volume-value" :style="volumeValueStyle">{{ volumePercentText }}</div>
                        <div class="volume-slider" @mousedown="onDragStart">
                            <div class="volume-progress" :style="{ width: volume + '%' }"></div>
                            <input type="range" min="0" max="100" v-model="volume" @input="changeVolume" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Playback queue -->
    <QueueList :current-song="currentSong" :playing="playing" @add-song-to-queue="onQueueSongAdd"
        @add-cloud-music-to-queue="onQueueCloudSongAdd" @add-local-music-to-queue="onQueueLocalSongAdd"
        @toggle-play-pause="togglePlayPause" ref="queueList" />

    <!-- Fullscreen lyrics view -->
    <transition name="slide-up">
        <div v-if="showLyrics" class="lyrics-bg" :style="lyricsBackgroundStyle">
            <template v-if="lyricsBackground === 'cover'">
                <div
                    v-for="(image, index) in lyricsBackgroundImages"
                    :key="image"
                    class="lyrics-bg-image"
                    :class="{ active: index === lyricsBackgroundImageIndex }"
                    :style="{ backgroundImage: `url(${image})` }"
                ></div>
            </template>
            <div class="lyrics-screen" :class="{ 'cover-background': lyricsBackground === 'cover' }">
                <button class="close-btn" type="button" :aria-label="t('guan-bi-ge-ci')" @click="toggleLyrics(currentSong.hash, currentTime)">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <FullscreenLyricsSettings v-model="fullscreenLyricsSettings" @change="handleFullscreenLyricsSettingsChange" />

                <div class="lyrics-mode-btn" v-if="hasMultiLyricsMode" @click="switchLyricsMode" :title="lyricsMode === 'translation' ? t('qie-huan-dao-yin-yi') : t('qie-huan-dao-fan-yi')">
                    <i class="fas fa-language"></i>
                </div>

                <div class="left-section">
                    <div class="album-art-container" @click="toggleCoverMode">
                        <transition name="cover-fade" mode="out-in">
                            <div v-if="coverMode === 'vinyl'" key="vinyl" class="vinyl-player">
                                <!-- Vinyl player mode -->
                                <div class="vinyl-disc" :class="{ 'rotating': playing }">
                                    <img :src="currentSong?.img || './assets/images/!.png'" alt="Album Art" class="vinyl-cover" />
                                </div>
                                <div class="tonearm" :class="{ 'playing': playing }"></div>
                            </div>
                            <div v-else key="square" class="album-art-large">
                                <!-- Standard cover mode -->
                                <img v-if="easterEggImage" :src="easterEggImage.src" :class="easterEggClass" alt="Easter Egg" />
                                <img :src="currentSong?.img || './assets/images/!.png'" alt="Album Art" />
                            </div>
                        </transition>
                    </div>
                    <div class="song-details">
                        <div class="song-title" @click="searchSong(currentSong.name)">{{ currentSong?.name }}</div>
                        <div class="artist" @click="searchSong(currentSong.author)">{{ currentSong?.author }}</div>
                    </div>

                    <!-- Playback progress bar -->
                    <div class="progress-bar-container">
                        <span class="current-time">{{ formattedCurrentTime }}</span>
                        <div class="progress-bar" @mousedown="onProgressDragStart" @click="updateProgressFromEvent"
                            @mousemove="updateTimeTooltip" @mouseleave="hideTimeTooltip">
                            <div class="progress" :style="{ width: progressWidth + '%' }"></div>
                            <div class="progress-handle" :style="{ left: progressWidth + '%' }"></div>
                            <div v-for="(point, index) in climaxPoints" :key="index" class="climax-point"
                                :style="{ left: point.position + '%' }">
                            </div>
                            <div v-if="showTimeTooltip" class="time-tooltip" :style="{ left: tooltipPosition + 'px' }">
                                {{ tooltipTime }}
                            </div>
                        </div>
                        <span class="duration">{{ formattedDuration }}</span>
                    </div>

                    <div class="player-controls">
                        <button class="control-btn like-btn" :title="t('wo-xi-huan')" @click="playlistSelect.toLike()">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="control-btn" :title="t('shang-yi-shou')" @click="playSongFromQueue('previous')">
                            <i class="fas fa-step-backward"></i>
                        </button>
                        <button class="control-btn" :title="t('zan-ting-bo-fang')" @click="togglePlayPause">
                            <i :class="playing ? 'fas fa-pause' : 'fas fa-play'"></i>
                        </button>
                        <button class="control-btn" :title="t('xia-yi-shou')" @click="playSongFromQueue('next')">
                            <i class="fas fa-step-forward"></i>
                        </button>
                        <div class="playback-mode">
                            <button class="control-btn" :title="t('qie-huan-bo-fang-mo-shi')" @click="togglePlaybackMode">
                                <i v-if="currentPlaybackModeIndex != '2'" :class="currentPlaybackMode.icon" :title="currentPlaybackMode.title"></i>
                                <span v-else class="loop-icon" :title="currentPlaybackMode.title">
                                    <i class="fas fa-repeat"></i>
                                    <sup>1</sup>
                                </span>
                            </button>
                            <div class="player-menu playback-mode-menu">
                                <button
                                    v-for="(mode, index) in playbackModes"
                                    :key="mode.title"
                                    type="button"
                                    class="player-menu-item playback-mode-option"
                                    :class="{ active: currentPlaybackModeIndex === index }"
                                    :title="mode.title"
                                    @click.stop="setPlaybackMode(index)"
                                >
                                    <i v-if="index !== 2" :class="mode.icon"></i>
                                    <span v-else class="loop-icon">
                                        <i class="fas fa-repeat"></i>
                                        <sup>1</sup>
                                    </span>
                                    <span>{{ mode.title }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="lyrics-container" @wheel="handleLyricsWheel">
                    <template v-if="lyricsData.length > 0">
                        <div v-if="lyricsDisplayMode === 'single'" id="lyrics" class="single-lyrics" :class="{ 'line-highlight-mode': lyricsHighlightMode === 'line', 'lyrics-align-left': lyricsAlign === 'left' }"
                            :style="{ fontSize: lyricsFontSize, fontFamily: lyricsFontFamily }">
                            <transition name="single-lyric-fade" appear>
                                <div class="line-group" v-if="currentSingleLyricsLine" :key="singleLyricsLineIndex">
                                    <div class="line" @click="handleLyricsClick(singleLyricsLineIndex)" :class="{ click: lyricsFlag, 'line-highlight': isCurrentLyricsLine(singleLyricsLineIndex), [lyricsAlign]: true }">
                                        <span v-for="(charData, charIndex) in currentSingleLyricsLine.characters" :key="charIndex" class="char"
                                            :class="{ highlight: lyricsHighlightMode === 'char' && charData.highlighted }">
                                            {{ charData.char }}
                                        </span>
                                    </div>
                                    <div class="line translated" :class="{ 'line-highlight': isCurrentLyricsLine(singleLyricsLineIndex), [lyricsAlign]: true }" v-show="currentSingleLyricsLine.translated && lyricsMode === 'translation'">{{ currentSingleLyricsLine.translated }}</div>
                                    <div class="line romanized" :class="{ 'line-highlight': isCurrentLyricsLine(singleLyricsLineIndex), [lyricsAlign]: true }" v-show="currentSingleLyricsLine.romanized && lyricsMode === 'romanization'">{{ currentSingleLyricsLine.romanized }}</div>
                                </div>
                            </transition>
                        </div>
                        <div v-else id="lyrics" :class="{ 'line-highlight-mode': lyricsHighlightMode === 'line', 'lyrics-align-left': lyricsAlign === 'left' }"
                            :style="{ fontSize: lyricsFontSize, fontFamily: lyricsFontFamily, transform: `translateY(${scrollAmount ? scrollAmount + 'px' : '50%'})` }">
                            <div class="line-group" :class="{ 'current-line-group': currentLyricsLineIndex === lineIndex }" v-for="(lineData, lineIndex) in lyricsData" :key="lineIndex">
                                <div class="line" @click="handleLyricsClick(lineIndex)" :class="{ click: lyricsFlag, 'line-highlight': isCurrentLyricsLine(lineIndex), [lyricsAlign]: true }">
                                    <span v-for="(charData, charIndex) in lineData.characters" :key="charIndex" class="char"
                                        :class="{ highlight: lyricsHighlightMode === 'char' && charData.highlighted }">
                                        {{ charData.char }}
                                    </span>
                                </div>
                                <div class="line translated" :class="{ 'line-highlight': isCurrentLyricsLine(lineIndex), [lyricsAlign]: true }" v-show="lineData.translated && lyricsMode === 'translation'">{{ lineData.translated }}</div>
                                <div class="line romanized" :class="{ 'line-highlight': isCurrentLyricsLine(lineIndex), [lyricsAlign]: true }" v-show="lineData.romanized && lyricsMode === 'romanization'">{{ lineData.romanized }}</div>
                            </div>
                        </div>
                    </template>
                    <div v-else class="no-lyrics" :style="{ fontFamily: lyricsFontFamily }">{{ SongTips }}</div>
                </div>
            </div>
        </div>
    </transition>

    <!-- Playlist selection modal -->
    <PlaylistSelectModal ref="playlistSelect" :current-song="currentSong" :playlists="playlists" />

</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useMusicQueueStore } from '../stores/musicQueue';
import { useI18n } from 'vue-i18n';
import PlaylistSelectModal from './PlaylistSelectModal.vue';
import QueueList from './QueueList.vue';
import FullscreenLyricsSettings from './FullscreenLyricsSettings.vue';
import { useRouter } from 'vue-router';
import { getCover, getAudioOutputDeviceSignature, share } from '../utils/utils';
import { get } from '../utils/request';
import { createTeamEventPopup, actions as teamEventActions } from '../utils/teamEvent';

// Import all modules from unified entry
import {
    useAudioController,
    useLyricsHandler,
    useProgressBar,
    usePlaybackMode,
    useMediaSession,
    useSongQueue,
    useHelpers,
    setAudioOutputDevice
} from './player';

// Basic settings
const queueList = ref(null);
const playlistSelect = ref(null);
const qualityMenuOpen = ref(false);
const { t } = useI18n();
const router = useRouter();
const musicQueueStore = useMusicQueueStore();
const playlists = ref([]);
const currentTime = ref(0);
const fullscreenLyricsDefaultSettings = {
    background: 'on',
    fontSize: '24px',
    align: 'center',
    highlightMode: 'char',
    displayMode: 'scroll'
};
const fullscreenLyricsSettings = ref({ ...fullscreenLyricsDefaultSettings });
const lyricsFontSize = computed(() => fullscreenLyricsSettings.value.fontSize);
const desktopLyricsFont = ref('');
const fontFamilyFallback = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', sans-serif";
const escapeFontFamily = (fontFamily) => String(fontFamily).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const lyricsFontFamily = computed(() => {
    return desktopLyricsFont.value
        ? `"${escapeFontFamily(desktopLyricsFont.value)}", ${fontFamilyFallback}`
        : fontFamilyFallback;
});
const lyricsAlign = computed(() => fullscreenLyricsSettings.value.align);
const lyricsBackground = computed(() => fullscreenLyricsSettings.value.background);
const lyricsHighlightMode = computed(() => fullscreenLyricsSettings.value.highlightMode || 'char');
const lyricsDisplayMode = computed(() => fullscreenLyricsSettings.value.displayMode || 'scroll');
const lyricsDefaultBackgroundImage = computed(() => currentSong.value?.img || './assets/images/ico.png');
const lyricsCoverImages = ref([]);
const lyricsBackgroundImageIndex = ref(0);
const lyricsBackgroundImages = computed(() => {
    if (lyricsBackground.value !== 'cover') return [];
    return lyricsCoverImages.value.length ? lyricsCoverImages.value : [lyricsDefaultBackgroundImage.value];
});
const lyricsBackgroundStyle = computed(() => {
    if (lyricsBackground.value === 'off' || lyricsBackground.value === 'cover') {
        return { background: 'var(--secondary-color)' };
    }

    return { backgroundImage: `url(${lyricsDefaultBackgroundImage.value})` };
});
const sliderElement = ref(null);
const coverMode = ref(localStorage.getItem('lyrics-cover-mode') || 'square');

const isDragging = ref(false);
const lyricsFlag = ref(false);

// Helper functions
const { isElectron, throttle, getVip, desktopLyrics } = useHelpers(t);

// Easter egg related
const easterEggImages = [
    { src: './assets/images/miku.png', class: 'miku' },
    { src: './assets/images/miku2.png', class: 'miku2' },
    { src: './assets/images/miku3.png', class: 'miku3' }
];

const easterEggImage = computed(() => {
    const author = currentSong.value?.author || '';
    if (author.includes('初音') || author.includes('Miku')) {
        const randomIndex = Math.floor(Math.random() * easterEggImages.length);
        return easterEggImages[randomIndex];
    }
    return null;
});

const easterEggClass = computed(() => easterEggImage.value?.class || '');
const canSwitchQuality = computed(() => {
    return !!currentSong.value?.hash && !currentSong.value?.isLocal && !currentSong.value?.isCloud;
});
const isCurrentQualityOption = (option) => {
    return currentSong.value?.resolvedQuality === option.value && currentSong.value?.playHash === option.hash;
};
const toggleQualityMenu = () => {
    if (!canSwitchQuality.value) return;

    qualityMenuOpen.value = !qualityMenuOpen.value;
};
const switchQuality = async (option) => {
    if (!canSwitchQuality.value || isCurrentQualityOption(option)) {
        qualityMenuOpen.value = false;
        return;
    }

    const previousTime = audio.currentTime || 0;
    const wasPlaying = playing.value;

    qualityMenuOpen.value = false;
    clearAutoSwitchTimer();
    audio.pause();
    playing.value = false;

    const result = await addSongToQueue(
        currentSong.value.hash,
        currentSong.value.name,
        currentSong.value.img,
        currentSong.value.author,
        false,
        option.value,
        currentSong.value.qualityOptions
    );

    if (result && result.song) {
        await playSong(result.song);
        if (audio.duration) {
            audio.currentTime = Math.min(previousTime, audio.duration || previousTime);
        } else {
            audio.addEventListener('loadedmetadata', () => {
                audio.currentTime = Math.min(previousTime, audio.duration || previousTime);
            }, { once: true });
        }

        if (!wasPlaying) {
            pausePlayback();
        }
    } else if (result && result.shouldPlayNext) {
        handleAutoSwitch();
    }
};

// Initialize event callbacks
const onSongEnd = () => {
    if (currentPlaybackModeIndex.value == 2) return; // Single-track loop
    // Sequential play: stop after last track
    if (currentPlaybackModeIndex.value == 3) {
        const currentIndex = musicQueueStore.queue.findIndex(song => song.hash === currentSong.value.hash);
        if (currentIndex === musicQueueStore.queue.length - 1) {
            playing.value = false;
            return;
        }
    }
    playSongFromQueue('next');
};

// Track last sent lyrics to avoid duplicates
let lastSentLyric = '';
let lastSentTime = 0;

// Throttled time update handler
const updateCurrentTime = throttle(() => {
    currentTime.value = audio.currentTime;
    if (!isProgressDragging.value) {
        progressWidth.value = (currentTime.value / audio.duration) * 100;
    }

    // Update SMTC position state
    if (audio.duration && currentSong.value?.hash) {
        mediaSession.updatePositionState(audio.currentTime, audio.duration, currentSpeed.value);
    }

    const savedConfig = JSON.parse(localStorage.getItem('settings') || '{}');
    const hasLyricsData = Array.isArray(lyricsData.value) && lyricsData.value.length > 0;
    
    const statusBarLyricsEnabled = savedConfig?.statusBarLyrics === 'on';
    const desktopLyricsEnabled = savedConfig?.desktopLyrics === 'on';

    if (audio) {
        if (hasLyricsData) {
            highlightCurrentChar(audio.currentTime, !lyricsFlag.value);
        }

        // Send IPC only when a song is playing
        if (isElectron() && audio.src && playing.value && (desktopLyricsEnabled || statusBarLyricsEnabled)) {
            const currentLine = hasLyricsData ? getCurrentLineText(audio.currentTime) : '';
            
            // Send only when lyrics actually change (debounce)
            const currentTimeMs = Date.now();
            if (currentLine !== lastSentLyric || currentTimeMs - lastSentTime > 1000) {
                lastSentLyric = currentLine;
                lastSentTime = currentTimeMs;
                
                // Use JSON serialization so object can be cloned
                try {
                    const lyricsPayload = hasLyricsData ? JSON.parse(JSON.stringify(lyricsData.value)) : [];
                    window.electron.ipcRenderer.send('lyrics-data', {
                        currentTime: audio.currentTime,
                        playing: playing.value,
                        lyricsData: lyricsPayload,
                        currentSongHash: currentSong.value?.hash || '',
                        currentLyric: currentLine
                    });
                } catch (e) {
                    // On serialization failure, send essential data only
                    window.electron.ipcRenderer.send('lyrics-data', {
                        currentTime: audio.currentTime,
                        playing: playing.value,
                        lyricsData: [],
                        currentSongHash: currentSong.value?.hash || '',
                        currentLyric: currentLine
                    });
                }
            }
        }
        
        if (isElectron() && audio.src && playing.value && savedConfig?.apiMode === 'on') {
            try {
                const serverLyricsPayload = hasLyricsData && originalLyrics.value ? JSON.parse(JSON.stringify(originalLyrics.value)) : [];
                const currentSongPayload = currentSong.value ? JSON.parse(JSON.stringify(currentSong.value)) : null;
                window.electron.ipcRenderer.send('server-lyrics', {
                    currentTime: audio.currentTime,
                    lyricsData: serverLyricsPayload,
                    currentSong: currentSongPayload,
                    duration: audio.duration
                });
            } catch (e) {
                // Skip on serialization failure
            }
        }
        
        if (isElectron() && audio.src && playing.value && window.electron.platform == 'darwin' && savedConfig?.touchBar == 'on') {
            const currentLine = hasLyricsData ? getCurrentLineText(audio.currentTime) : '';
            window.electron.ipcRenderer.send("update-current-lyrics", currentLine);
        }
    }

    if (!hasLyricsData && isElectron() && (desktopLyricsEnabled || statusBarLyricsEnabled || savedConfig?.apiMode === 'on')) {
        retryMissingLyrics();
    }

    localStorage.setItem('player_progress', audio.currentTime);
}, 200);

// Initialize modules
const audioController = useAudioController({ onSongEnd, updateCurrentTime });
const { playing, isMuted, volume, changeVolume, toggleMute: toggleAudioMute, audio, playbackRate, setPlaybackRate, applyLoudnessNormalization, ensureAudioContextRunning, toggleLoudnessNormalization, loudnessNormalizationEnabled, currentLoudnessGain, webAudioInitialized, amplitudeToSlider } = audioController;
const volumePercentText = computed(() => `${Math.round(volume.value)}%`);
const volumeValueStyle = computed(() => {
    const percent = Math.round(volume.value);
    const offset = percent < 16 ? 0 : percent > 84 ? -100 : -50;
    const arrowOffset = percent < 16 ? '10px' : percent > 84 ? 'calc(100% - 10px)' : '50%';

    return {
        left: `${percent}%`,
        '--volume-value-offset': `${offset}%`,
        '--volume-arrow-offset': arrowOffset
    };
});

const lyricsHandler = useLyricsHandler(t);
const { lyricsData, originalLyrics, showLyrics, scrollAmount, SongTips, lyricsMode, toggleLyrics, getLyrics, highlightCurrentChar, resetLyricsHighlight, getCurrentLineText, scrollToCurrentLine, toggleLyricsMode } = lyricsHandler;

const currentLyricsLineIndex = computed(() => {
    if (!lyricsData.value || lyricsData.value.length === 0) return -1;

    const currentTimeMs = currentTime.value * 1000;
    for (let index = 0; index < lyricsData.value.length; index++) {
        const firstChar = lyricsData.value[index]?.characters?.[0];
        const nextFirstChar = lyricsData.value[index + 1]?.characters?.[0];

        if (firstChar && currentTimeMs >= firstChar.startTime && (!nextFirstChar || currentTimeMs < nextFirstChar.startTime)) {
            return index;
        }
    }

    return -1;
});

const singleLyricsLineIndex = computed(() => {
    if (!lyricsData.value || lyricsData.value.length === 0) return -1;
    return currentLyricsLineIndex.value >= 0 ? currentLyricsLineIndex.value : 0;
});
const currentSingleLyricsLine = computed(() => {
    if (singleLyricsLineIndex.value < 0) return null;
    return lyricsData.value[singleLyricsLineIndex.value] || null;
});
const isCurrentLyricsLine = (lineIndex) => lyricsHighlightMode.value === 'line' && currentLyricsLineIndex.value === lineIndex;

// Get lyrics line index at current playback time
const getCurrentLineIndex = (currentTime) => {
    if (!lyricsData.value || lyricsData.value.length === 0) return -1;
    for (let i = 0; i < lyricsData.value.length; i++) {
        const line = lyricsData.value[i];
        if (line.characters && line.characters.length > 0) {
            const startTime = line.characters[0].startTime / 1000;
            if (startTime > currentTime) {
                return Math.max(0, i - 1);
            }
        }
    }
    return lyricsData.value.length - 1;
};

const progressBar = useProgressBar(audio, resetLyricsHighlight);
const { progressWidth, isProgressDragging, showTimeTooltip, tooltipPosition, tooltipTime, climaxPoints, formatTime, getMusicHighlights, onProgressDragStart, updateProgressFromEvent, updateTimeTooltip, hideTimeTooltip } = progressBar;

const playbackMode = usePlaybackMode(t, audio);
const { playbackModes, currentPlaybackModeIndex, currentPlaybackMode, playedSongsStack, currentStackIndex, togglePlaybackMode, setPlaybackMode } = playbackMode;

const mediaSession = useMediaSession();

const songQueue = useSongQueue(t, musicQueueStore, queueList);
const { currentSong, NextSong, addSongToQueue, addCloudMusicToQueue, addLocalMusicToQueue, addLocalPlaylistToQueue, addToNext, getPlaylistAllSongs, addPlaylistToQueue, addCloudPlaylistToQueue, restoreLocalSongCover } = songQueue;

let lyricsBackgroundCarouselTimer = null;
let lyricsCoverImagesRequestId = 0;

const normalizeLyricsCoverImageUrl = (url) => {
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return '';
    return url.replace(/\{size\}/g, '1080');
};

const collectLyricsCoverImageUrls = (imgs) => {
    const urls = [];
    const visit = (value) => {
        if (!value) return;

        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }

        if (typeof value === 'object') {
            const url = normalizeLyricsCoverImageUrl(
                value.sizable_portrait ||
                value.sizable_cover ||
                value.url ||
                value.img ||
                value.cover ||
                value.portrait
            );
            if (url) {
                urls.push(url);
                return;
            }

            Object.values(value).forEach(visit);
        }
    };

    visit(imgs);
    return urls;
};

const extractLyricsCoverImages = (response) => {
    const images = [];
    const groups = Array.isArray(response?.data) ? response.data : [];

    groups.forEach((group) => {
        const authors = Array.isArray(group?.author) ? group.author : [];
        const albums = Array.isArray(group?.album) ? group.album : [];

        authors.forEach((author) => {
            images.push(...collectLyricsCoverImageUrls(author?.imgs));
        });
        albums.forEach((album) => {
            images.push(...collectLyricsCoverImageUrls(album?.imgs));
        });
    });

    return [...new Set(images)];
};

const stopLyricsBackgroundCarousel = () => {
    if (lyricsBackgroundCarouselTimer) {
        clearInterval(lyricsBackgroundCarouselTimer);
        lyricsBackgroundCarouselTimer = null;
    }
};

const startLyricsBackgroundCarousel = () => {
    stopLyricsBackgroundCarousel();
    lyricsBackgroundImageIndex.value = 0;

    if (lyricsBackground.value !== 'cover' || !showLyrics.value || lyricsBackgroundImages.value.length <= 1) return;

    lyricsBackgroundCarouselTimer = setInterval(() => {
        const total = lyricsBackgroundImages.value.length;
        if (total <= 1) {
            stopLyricsBackgroundCarousel();
            return;
        }
        lyricsBackgroundImageIndex.value = (lyricsBackgroundImageIndex.value + 1) % total;
    }, 4000);
};

const loadLyricsCoverImages = async () => {
    const hash = currentSong.value?.hash;
    lyricsCoverImages.value = [];
    lyricsBackgroundImageIndex.value = 0;

    if (lyricsBackground.value !== 'cover' || !showLyrics.value || !hash || String(hash).startsWith('local_')) {
        startLyricsBackgroundCarousel();
        return;
    }

    const requestId = ++lyricsCoverImagesRequestId;
    try {
        const response = await get(`/images?hash=${encodeURIComponent(hash)}`);
        if (requestId !== lyricsCoverImagesRequestId || currentSong.value?.hash !== hash || lyricsBackground.value !== 'cover') return;

        lyricsCoverImages.value = extractLyricsCoverImages(response);
    } catch (error) {
        console.warn('[PlayerControl] 获取歌词背景封面失败:', error);
        lyricsCoverImages.value = [];
    } finally {
        if (requestId === lyricsCoverImagesRequestId) startLyricsBackgroundCarousel();
    }
};

// Auto-switch timer reference
let autoSwitchTimer = null;
// Restore normal lyrics scroll timer
let lyricScrollTimer = null;
// Auto-switch counter and max retries
let autoSwitchCount = 0;
const maxAutoSwitchRetries = 5;

// Handle auto-switch logic
const handleAutoSwitch = () => {
    console.log('[PlayerControl] 检查自动切换重试次数:', autoSwitchCount, '/', maxAutoSwitchRetries);
    if (autoSwitchCount < maxAutoSwitchRetries) {
        autoSwitchCount++;
        console.log(`[PlayerControl] 自动切换尝试 ${autoSwitchCount}/${maxAutoSwitchRetries}`);
        autoSwitchTimer = setTimeout(() => {
            playSongFromQueue('next');
        }, 3000);
        return true;
    } else {
        console.log('[PlayerControl] 已达到最大重试次数，停止自动切换');
        window.$modal.alert(t('yi-da-dao-zui-da-chong-shi-ci-shu'));
        autoSwitchCount = 0;
        return false;
    }
};

// Clear auto-switch timer
const clearAutoSwitchTimer = () => {
    if (autoSwitchTimer) {
        console.log('[PlayerControl] 取消自动切换到下一首');
        clearTimeout(autoSwitchTimer);
        autoSwitchTimer = null;
    }
};

// Throttled restore normal lyrics scroll
const restoreLyricsScroll = throttle(() => {
    if (lyricScrollTimer) clearTimeout(lyricScrollTimer);
    lyricScrollTimer = setTimeout(() => {
        console.log('[PlayerControl] 恢复歌词正常滚动');
        lyricScrollTimer = null;
        lyricsFlag.value = false;
        const currentLine = getCurrentLineText(audio.currentTime);
        scrollToCurrentLine(currentLine);
    }, 5000);
}, 1000);

// Throttled fetch lyrics
let isLyrics;
let pendingLyricsHash = '';
let pendingLyricsPromise = null;
let lastLyricsRetryAt = 0;
const getCurrentLyrics = async () => {
    const hash = currentSong.value.hash;
    if (!hash) return false;
    if (String(hash).startsWith('local_')) {
        SongTips.value = t('zan-wu-ge-ci');
        return false;
    }

    if (pendingLyricsHash === hash && pendingLyricsPromise) {
        return pendingLyricsPromise;
    }

    pendingLyricsHash = hash;
    pendingLyricsPromise = (async () => {
        isLyrics = await getLyrics(hash);
        return isLyrics;
    })();

    try {
        return await pendingLyricsPromise;
    } finally {
        if (pendingLyricsHash === hash) {
            pendingLyricsHash = '';
            pendingLyricsPromise = null;
        }
    }
};
const retryMissingLyrics = () => {
    if (isLyrics === false || pendingLyricsPromise) return;

    const now = Date.now();
    if (now - lastLyricsRetryAt < 1000) return;

    lastLyricsRetryAt = now;
    getCurrentLyrics();
};

// Computed properties
const formattedCurrentTime = computed(() => formatTime(currentTime.value));
const formattedDuration = computed(() => formatTime(currentSong.value?.timeLength || 0));

watch(() => currentSong.value.hash, () => {
    qualityMenuOpen.value = false;
    loadLyricsCoverImages();
});

watch(() => [lyricsBackground.value, showLyrics.value], () => {
    if (lyricsBackground.value === 'cover' && showLyrics.value) {
        loadLyricsCoverImages();
        return;
    }

    lyricsCoverImagesRequestId++;
    lyricsCoverImages.value = [];
    lyricsBackgroundImageIndex.value = 0;
    stopLyricsBackgroundCarousel();
});

// Check for multiple lyrics modes (translation and romanization)
const hasMultiLyricsMode = computed(() => {
    if (!lyricsData.value || lyricsData.value.length === 0) return false;
    
    // Check if at least one line has both translation and romanization
    return lyricsData.value.some(line => line.translated && line.romanized);
});

const handleFullscreenLyricsSettingsChange = () => {
    currentTime.value = audio.currentTime || 0;
    resetLyricsHighlight(currentTime.value);
    if (lyricsDisplayMode.value !== 'scroll') return;

    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
            const currentLineIndex = getCurrentLineIndex(audio.currentTime);
            if (currentLineIndex >= 0) scrollToCurrentLine(currentLineIndex);
        });
    }
};

// Toggle lyrics display mode (translation/romanization)
const switchLyricsMode = () => {
    toggleLyricsMode();
};

// Toggle cover mode (square/vinyl)
const toggleCoverMode = () => {
    coverMode.value = coverMode.value === 'square' ? 'vinyl' : 'square';
    localStorage.setItem('lyrics-cover-mode', coverMode.value);
};

const isBlobUrl = (url) => typeof url === 'string' && url.startsWith('blob:');

const isLocalSong = (song) => !!song?.isLocal || String(song?.hash || '').startsWith('local_');

const toPlayerSong = (song) => {
    if (!isLocalSong(song)) return song;
    const { file, handle, ...playerSong } = song;
    return playerSong;
};

// Play song
const playSong = async (song) => {
    clearAutoSwitchTimer();

    try {
        console.log('[PlayerControl] 开始播放歌曲:', song.name);

        // Validate song object and URL
        if (!song || !song.url) {
            console.error('[PlayerControl] 无效的歌曲或URL:', song);
            window.$modal.alert(t('bo-fang-shi-bai-qu-mu-wei-kong'));
            playing.value = false;
            return;
        }

        currentSong.value = structuredClone(toPlayerSong(song));

        // Apply loudness normalization (if Web Audio enabled)
        if (song.loudnessNormalization) {
            console.log('[PlayerControl] 应用响度规格化:', song.loudnessNormalization);
            applyLoudnessNormalization(song.loudnessNormalization);
        } else {
            console.log('[PlayerControl] 歌曲无响度规格化数据');
            applyLoudnessNormalization(null);
        }

        audio.src = song.url;

        // Ensure AudioContext is running (if enabled)
        await ensureAudioContextRunning();

        setPlaybackRate(currentSpeed.value);
        console.log('[PlayerControl] 设置音频源:', song.url);

        try {
            mediaSession.changeMediaSession(currentSong.value);
            // Update SMTC position state
            if (audio.duration) {
                mediaSession.updatePositionState(audio.currentTime, audio.duration, currentSpeed.value);
            }
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                await playPromise;
                console.log('[PlayerControl] 成功开始播放歌曲');
                playing.value = true;
            }
        } catch (playError) {
            if(playError.name.includes('NotSupportedError')) {
                console.error('[PlayerControl] 播放失败，浏览器不支持该音频格式,正在降低音质重试:', playError);
                return;
            }
            console.warn('[PlayerControl] 播放被中断，尝试重新播放:', playError);
            // Wait briefly then retry
            await new Promise(resolve => setTimeout(resolve, 100));

            try {
                await audio.play();
                playing.value = true;
            } catch (retryError) {
                console.error('[PlayerControl] 重试播放失败:', retryError);
                window.$modal.alert(t('bo-fang-shi-bai'));
                playing.value = false;
            }
        }

        // Set title
        if (song.name && song.author) {
            document.title = song.name + " - " + song.author;
        } else if (song.name) {
            document.title = song.name;
        }

        // Clear lyrics data
        lyricsData.value = [];
        originalLyrics.value = '';
        isLyrics = undefined;
        lastLyricsRetryAt = 0;
        if(isLocalSong(song)) {
            const { file, handle, ...savedLocalSong } = currentSong.value;
            localStorage.setItem('current_song', JSON.stringify({
                ...savedLocalSong,
                url: ''
            }));
            window.electron?.ipcRenderer?.send('current-song-updated');
            return;
        }
        // Save current song to local storage
        localStorage.setItem('current_song', JSON.stringify(currentSong.value));
        window.electron?.ipcRenderer?.send('current-song-updated');

        getVip();
        // Fetch lyrics
        getCurrentLyrics();
        getMusicHighlights(currentSong.value.hash);
    } catch (error) {
        console.error('[PlayerControl] 播放音乐时发生错误:', error);
        playing.value = false;
        window.$modal.alert(t('bo-fang-chu-cuo'));
    }
};

// Resume playback (reuse existing src / queue URL, no new Audio)
const resumePlayback = async () => {
    if (!audio.paused) return true;

    if (!currentSong.value.hash) {
        console.log('[PlayerControl] 没有当前歌曲，尝试播放队列中的下一首');
        playSongFromQueue('next');
        return false;
    } else if (!audio.src) {
        console.log('[PlayerControl] 音频源为空，尝试重新设置');
        if (currentSong.value.url && !isLocalSong(currentSong.value)) {
            console.log('[PlayerControl] 从当前歌曲获取URL:', currentSong.value.url);
            audio.src = currentSong.value.url;
        } else {
            console.log('[PlayerControl] 重新从队列获取歌曲');
            const songIndex = musicQueueStore.queue.findIndex(song => song.hash === currentSong.value.hash);
            if (songIndex !== -1) {
                const song = musicQueueStore.queue[songIndex];
                if (isLocalSong(song)) {
                    console.log('[PlayerControl] 本地音乐重新获取播放地址');
                    const result = await addLocalMusicToQueue({
                        ...song,
                        isLocal: true
                    });
                    if (result && result.song) {
                        await playSong(result.song);
                        return true;
                    }
                    return false;
                } else if (song.url) {
                    console.log('[PlayerControl] 从队列中的歌曲获取URL:', song.url);
                    currentSong.value.url = song.url;
                    audio.src = song.url;
                } else if (song.isCloud) {
                    console.log('[PlayerControl] 云音乐没有URL，重新获取');
                    addCloudMusicToQueue(song.hash, song.name, song.author, song.timeLength, song.img);
                    return false;
                } else {
                    console.log('[PlayerControl] 歌曲没有URL，重新获取');
                    const result = await addSongToQueue(song.hash, song.name, song.img, song.author);
                    if (result && result.song) {
                        playSong(result.song);
                        return true;
                    }
                    return false;
                }
            } else {
                console.log('[PlayerControl] 歌曲不在队列中，播放下一首');
                playSongFromQueue('next');
                return false;
            }
        }
    }

    try {
        mediaSession.changeMediaSession(currentSong.value);
        // Update SMTC position state
        if (audio.duration) {
            mediaSession.updatePositionState(audio.currentTime, audio.duration, currentSpeed.value);
        }
    } catch(smtcErr) {
        console.warn('[PlayerControl] 更新 SMTC 信息失败:', smtcErr);
    }

    try {
        // With loudness normalization, AudioContext may be suspended — resume before playback
        await ensureAudioContextRunning();
        await audio.play();
        playing.value = true;
        return true;
    } catch (retryError) {
        console.error('[PlayerControl] 播放失败:', retryError);
        window.$modal.alert(t('bo-fang-shi-bai'));
        return false;
    }
};

// Toggle play/pause (state follows audio.paused)
const togglePlayPause = async () => {
    if (audio.paused) {
        console.log('[PlayerControl] 开始播放');
        await resumePlayback();
    } else {
        console.log('[PlayerControl] 暂停播放');
        pausePlayback();
    }
};

// Play song from queue
const playSongFromQueue = async (direction) => {
    clearAutoSwitchTimer();

    if (musicQueueStore.queue.length === 0) {
        console.log('[PlayerControl] 队列为空');
        window.$modal.alert(t('ni-huan-mei-you-tian-jia-ge-quo-kuai-qu-tian-jia-ba'));
        return;
    }

    console.log(`[PlayerControl] 从队列播放${direction === 'next' ? '下' : '上'}一首`);
    audio.pause();
    playing.value = false;
    if (direction == 'next' && NextSong.value.length > 0) {
        // Play queued next track
        console.log('[PlayerControl] 播放预定的下一首:', NextSong.value[0].name);
        const songData = NextSong.value[0];
        NextSong.value.shift();

        try {
            const result = await addSongToQueue(songData.hash, songData.name, songData.img, songData.author);
            // If song object returned, play directly
            if (result && result.song) {
                console.log('[PlayerControl] 获取到下一首歌曲，开始播放:', result.song.name);
                await playSong(result.song);
            } else if (result && result.shouldPlayNext) {
                console.log('[PlayerControl] 预定的下一首无法播放');
                handleAutoSwitch();
            } else {
                console.error('[PlayerControl] 无法获取下一首歌曲信息');
            }
        } catch (error) {
            console.error('[PlayerControl] 获取下一首歌曲时出错:', error);
        }
        return;
    }

    const currentIndex = musicQueueStore.queue.findIndex(song => song.hash === currentSong.value.hash);
    console.log('[PlayerControl] 当前歌曲索引:', currentIndex);
    let targetIndex;

    // Handle playback modes
    if (currentIndex === -1) {
        targetIndex = 0;
    } else if (currentPlaybackModeIndex.value === 0) {
        // Shuffle play
        targetIndex = handleRandomPlayback(direction, currentIndex);
    } else if (currentPlaybackModeIndex.value === 3) {
        // Sequential play
        if (direction === 'previous') {
            targetIndex = currentIndex === 0 ? musicQueueStore.queue.length - 1 : currentIndex - 1;
        } else {
            targetIndex = currentIndex + 1;
            if (targetIndex >= musicQueueStore.queue.length) {
                playing.value = false;
                return;
            }
        }
    } else {
        // List loop or single-track loop
        targetIndex = direction === 'previous'
            ? (currentIndex === 0 ? musicQueueStore.queue.length - 1 : currentIndex - 1)
            : (currentIndex + 1) % musicQueueStore.queue.length;
    }

    console.log('[PlayerControl] 目标歌曲索引:', targetIndex);

    // Play song at target index
    const targetSong = musicQueueStore.queue[targetIndex];
    console.log('[PlayerControl] 开始播放目标歌曲:', targetSong.name);

    try {
        let result;
        if (targetSong.isCloud) {
            result = await addCloudMusicToQueue(
                targetSong.hash,
                targetSong.name,
                targetSong.author,
                targetSong.timeLength,
                targetSong.img,
                false // Do not reset playback position, only fetch URL
            );
        } else if (isLocalSong(targetSong)) {
            result = await addLocalMusicToQueue({
                ...targetSong,
                isLocal: true
            }, false);
        } else {
            result = await addSongToQueue(
                targetSong.hash,
                targetSong.name,
                targetSong.img,
                targetSong.author,
                false // Do not reset playback position, only fetch URL
            );
        }

        // Check result and play
        if (result && result.song) {
            console.log('[PlayerControl] 成功获取歌曲URL，开始播放:', result.song.name);
            await playSong(result.song);
        } else if (result && result.shouldPlayNext) {
            console.log('[PlayerControl] 歌曲无法播放');
            handleAutoSwitch();
        } else {
            console.error('[PlayerControl] 无法获取歌曲URL');
        }
    } catch (error) {
        console.error('[PlayerControl] 切换歌曲时发生错误:', error);
        // On error, try next track
        if (direction === 'next') {
            console.log('[PlayerControl] 发生错误，3秒后尝试播放下一首');
            handleAutoSwitch();
        }
    }
};

// Handle shuffle logic
const handleRandomPlayback = (direction, currentIndex) => {
    if (direction === 'previous' && currentStackIndex.value > 0) {
        // Return previous shuffled track
        currentStackIndex.value--;
        return playedSongsStack.value[currentStackIndex.value];
    } else if (direction === 'previous') {
        // Shuffle forward to new track
        let newIndex;
        let attempts = 0;
        const maxAttempts = musicQueueStore.queue.length * 2; // Prevent infinite loop
        
        do {
            newIndex = Math.floor(Math.random() * musicQueueStore.queue.length);
            attempts++;
            
            // Return early if too many attempts
            if (attempts >= maxAttempts) {
                break;
            }
        } while (playedSongsStack.value.length > 0 && 
                 (newIndex === playedSongsStack.value[currentStackIndex.value] ||
                  (musicQueueStore.queue.length >= 10 && playedSongsStack.value.length > 0 && 
                   playedSongsStack.value.slice(-Math.min(10, playedSongsStack.value.length)).includes(newIndex))));

        playedSongsStack.value.unshift(newIndex);
        return newIndex;
    } else if (direction === 'next' && currentStackIndex.value < playedSongsStack.value.length - 1) {
        // Advance to next previously shuffled track
        currentStackIndex.value++;
        return playedSongsStack.value[currentStackIndex.value];
    } else if (direction === 'next') {
        // Shuffle to new track
        let newIndex;
        let attempts = 0;
        const maxAttempts = musicQueueStore.queue.length * 2; // Prevent infinite loop
        
        do {
            newIndex = Math.floor(Math.random() * musicQueueStore.queue.length);
            attempts++;
            
            // Return early if too many attempts
            if (attempts >= maxAttempts) {
                break;
            }
        } while (playedSongsStack.value.length > 0 && 
                 (newIndex === playedSongsStack.value[currentStackIndex.value] ||
                  (musicQueueStore.queue.length >= 10 && playedSongsStack.value.length > 0 && 
                   playedSongsStack.value.slice(-Math.min(10, playedSongsStack.value.length)).includes(newIndex))));

        // Truncate future history
        if (currentStackIndex.value < playedSongsStack.value.length - 1) {
            playedSongsStack.value = playedSongsStack.value.slice(0, currentStackIndex.value + 1);
        }

        // Append new track to history
        playedSongsStack.value.push(newIndex);
        currentStackIndex.value = playedSongsStack.value.length - 1;
        return newIndex;
    }
};

// Volume drag handlers
const setVolumeOnClick = (event) => {
    const slider = event.target.closest('.volume-slider');
    if (slider) {
        const sliderWidth = slider.offsetWidth;
        const offsetX = event.offsetX;
        volume.value = Math.round((offsetX / sliderWidth) * 100);
        changeVolume();
        console.log('[PlayerControl] 点击设置音量:', volume.value, '实际audio.volume:', audio.volume);
    }
};

const onDragStart = (event) => {
    sliderElement.value = event.target.closest('.volume-slider');
    if (sliderElement.value) {
        isDragging.value = true;
        setVolumeOnClick(event);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
    }
};
const onDrag = (event) => {
    if (isDragging.value && sliderElement.value) {
        const sliderWidth = sliderElement.value.offsetWidth;
        const rect = sliderElement.value.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const newVolume = Math.max(0, Math.min(100, Math.round((offsetX / sliderWidth) * 100)));
        volume.value = newVolume;
        changeVolume();
        console.log('[PlayerControl] 拖动设置音量:', volume.value, '实际audio.volume:', audio.volume);
    }
};
const onDragEnd = () => {
    isDragging.value = false;
    sliderElement.value = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', onDragEnd);
};

// Volume wheel event
const handleVolumeScroll = (event) => {
    event.preventDefault();
    const delta = Math.sign(event.deltaY) * -1;
    volume.value = Math.min(Math.max(volume.value + delta * 10, 0), 100);
    changeVolume();
    console.log('[PlayerControl] 滚轮设置音量:', volume.value, '实际audio.volume:', audio.volume);
};

// Lyrics wheel controls playback progress
const handleLyricsWheel = (event) => {
    if (!audio.duration || !currentSong.value?.hash) return;
    
    event.preventDefault();
    const lyricsContainer = document.getElementById('lyrics-container');
    if (!lyricsContainer) return;
    const lineGroups = document.querySelectorAll('.line-group');
    const firstLineElement = lineGroups[0];
    const lastLineElement = lineGroups[lineGroups.length - 1];
    if (!firstLineElement || (firstLineElement == lastLineElement)) return;
    const lineHeight = lastLineElement.offsetHeight;
    const containerHeight = lyricsContainer.offsetHeight;
    // Compute scroll distance
    const scrollNumber = scrollAmount.value - (event.deltaY * 1.5);
    const maxScrollNumber = ((containerHeight - firstLineElement.offsetHeight) / 2);
    const miniScrollNumber = -lastLineElement.offsetTop + (containerHeight / 2) - (lineHeight / 2);
    if (scrollNumber > maxScrollNumber) scrollAmount.value = maxScrollNumber;
    else if (scrollNumber < miniScrollNumber) scrollAmount.value = miniScrollNumber;
    else scrollAmount.value = scrollNumber;
    lyricsFlag.value = true;
    restoreLyricsScroll();
};

// Re-center current lyrics line after resize (scrollAmount used old height)
let lyricsResizeTimer = null;
const handleWindowResize = () => {
    if (lyricsResizeTimer) clearTimeout(lyricsResizeTimer);
    lyricsResizeTimer = setTimeout(() => {
        lyricsResizeTimer = null;
        if (!showLyrics.value || lyricsFlag.value || lyricsDisplayMode.value !== 'scroll') return;
        const lyricsContainer = document.getElementById('lyrics-container');
        const lineIndex = getCurrentLineIndex(audio.currentTime);
        const lineElement = document.querySelectorAll('.line-group')[lineIndex];
        if (!lyricsContainer || !lineElement) return;
        scrollAmount.value = -lineElement.offsetTop + (lyricsContainer.offsetHeight / 2) - (lineElement.offsetHeight / 2) - 32;
    }, 150);
};

const handleLyricsClick = (lineIndex) => {
    // if (!lyricsFlag.value) return;
    console.log('[PlayerControl] 点击歌词:', lineIndex);
    const lineStartTime = lyricsData.value[lineIndex].characters[0].startTime;
    audio.currentTime = lineStartTime / 1000;
    resetLyricsHighlight(audio.currentTime);
    scrollToCurrentLine(lineIndex);
    lyricsFlag.value = false;
    if (lyricScrollTimer) clearTimeout(lyricScrollTimer);
    lyricScrollTimer = null;
    // Auto-start playback if paused
    if (!playing.value) {
        audio.play();
    }
}

// Copy all lyrics to clipboard
const copyLyricsToClipboard = async () => {
    if (!showLyrics.value || !lyricsData.value || lyricsData.value.length === 0) {
        return;
    }
    try {
        let lyricsText = '';
        lyricsData.value.forEach((lineData) => {
            const originalLine = lineData.characters.map(char => char.char).join('');
            lyricsText += originalLine + '\n';
            if (lineData.translated) {
                lyricsText += lineData.translated + '\n';
            }
            if (lineData.romanized) {
                lyricsText += lineData.romanized + '\n';
            }
            if (lineData.translated || lineData.romanized) {
                lyricsText += '\n';
            }
        });
        await navigator.clipboard.writeText(lyricsText.trim());
        $message.success(t('ge-ci-yi-fu-zhi'));
    } catch (error) {
        $message.error(t('fu-zhi-ge-ci-shi-bai'));
    }
};

// Keyboard shortcuts
const handleKeyDown = (event) => {
    const isInputFocused = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (isInputFocused) return;

    switch (event.code) {
        case 'Space':
            event.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowLeft':
            playSongFromQueue('previous');
            break;
        case 'ArrowRight':
            playSongFromQueue('next');
            break;
        case 'Escape':
            if (showLyrics.value) toggleLyrics(currentSong.value.hash, audio.currentTime);
            break;
        case 'KeyC':
            // Ctrl+C or Cmd+C copy lyrics (fullscreen lyrics only)
            if ((event.ctrlKey || event.metaKey) && showLyrics.value) {
                event.preventDefault();
                copyLyricsToClipboard();
            }
            break;
    }
};

// Initialize system media shortcuts
const setupMediaShortcuts = () => {
    if (!isElectron()) return;

    window.electron.ipcRenderer.on('play-previous-track', () => playSongFromQueue('previous'));
    window.electron.ipcRenderer.on('play-next-track', () => playSongFromQueue('next'));
    window.electron.ipcRenderer.on('volume-up', () => {
        volume.value = Math.min(volume.value + 10, 100);
        changeVolume();
    });
    window.electron.ipcRenderer.on('volume-down', () => {
        volume.value = Math.max(volume.value - 10, 0);
        changeVolume();
    });
    window.electron.ipcRenderer.on('toggle-play-pause', togglePlayPause);
    window.electron.ipcRenderer.on('toggle-mute', toggleMute);
    window.electron.ipcRenderer.on('toggle-like', () => playlistSelect.value.toLike());
    window.electron.ipcRenderer.on('toggle-mode', togglePlaybackMode);
    window.electron.ipcRenderer.on('url-params', async (_event, data) => {
        console.log('[PlayerControl] 接收到URL参数:', data);

        // Handle song hash param
        if (data.hash) {
            console.log('[PlayerControl] 从URL启动播放歌曲:', data.hash);
            songQueue.privilegeSong(data.hash).then(res => {
                if (res.status == 1) {
                    const songInfo = res.data[0];
                    addSongToQueue(songInfo.hash, songInfo.albumname, getCover(songInfo.info.image, 480), songInfo.singername)
                }
            })
        }else if (data.listid) {
            // Handle playlist ID param
            console.log('[PlayerControl] 从URL启动跳转到歌单:', data.listid);
            router.push({
                path: '/PlaylistDetail',
                query: { global_collection_id: data.listid }
            });
        } else if (data.teamcode) {
            // Handle team join deep link
            console.log('[PlayerControl] 从URL启动打开组队活动并加入队伍:', data.teamcode);
            await createTeamEventPopup();
            await teamEventActions.joinTeam(data.teamcode);
        }
    });
};

// Toggle mute
const toggleMute = () => {
    void toggleAudioMute();
};

const pausePlayback = (reason) => {
    clearAutoSwitchTimer();
    if (!audio.paused) audio.pause();
    playing.value = false;
    mediaSession.clearPositionState?.();
    if (reason) console.log('[PlayerControl] 暂停播放:', reason);
};

const showSpeedMenu = ref(false);
const currentSpeed = ref(1.0);
const playbackSpeeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

// Pause on audio output device change (e.g. headphones)
let cleanupAudioOutputDeviceWatcher = null;
let lastAudioOutputDeviceSignature = null;
let audioOutputDeviceChangeHandler = null;

const setupAudioOutputDeviceWatcher = () => {
    if (cleanupAudioOutputDeviceWatcher) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;

    void getAudioOutputDeviceSignature().then(signature => {
        lastAudioOutputDeviceSignature = signature;
    }).catch(() => {
        lastAudioOutputDeviceSignature = null;
    });

    const handler = throttle(() => {
        void (async () => {
            try {
                const signature = await getAudioOutputDeviceSignature();
                if (signature === null) return;
                if (lastAudioOutputDeviceSignature === null) {
                    lastAudioOutputDeviceSignature = signature;
                    return;
                }
                if (signature !== lastAudioOutputDeviceSignature) {
                    lastAudioOutputDeviceSignature = signature;
                    if (!audio.paused) pausePlayback('检测到音频输出设备变化');
                }
            } catch (error) {
                console.warn('[PlayerControl] 获取音频输出设备信息失败:', error);
            }
        })();
    }, 800);

    if (navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', handler);
        cleanupAudioOutputDeviceWatcher = () => {
            navigator.mediaDevices.removeEventListener('devicechange', handler);
        };
    } else if ('ondevicechange' in navigator.mediaDevices) {
        const previous = navigator.mediaDevices.ondevicechange;
        navigator.mediaDevices.ondevicechange = handler;
        cleanupAudioOutputDeviceWatcher = () => {
            navigator.mediaDevices.ondevicechange = previous;
        };
    }
};

const setAudioOutputDeviceWatcherEnabled = (enabled) => {
    if (enabled) {
        setupAudioOutputDeviceWatcher();
        return;
    }
    cleanupAudioOutputDeviceWatcher?.();
    cleanupAudioOutputDeviceWatcher = null;
    lastAudioOutputDeviceSignature = null;
};

let audioOutputDeviceWatchChangeHandler = null;

const applyAudioOutputDevice = async (deviceId) => {
    const result = await setAudioOutputDevice(audio, deviceId);
    if (result.ok) return true;

    if (result.reason === 'UNSUPPORTED') {
        console.warn('[PlayerControl] 当前环境不支持切换音频输出设备（setSinkId不可用）');
    } else if (result.requested !== 'default') {
        console.error('[PlayerControl] 切换音频输出设备失败:', result.error);
        window.$modal.alert(t('qie-huan-yin-pin-shu-chu-shi-bai'));
    } else {
        console.warn('[PlayerControl] 切回默认音频输出设备失败:', result.error);
    }

    return false;
};

// Toggle speed menu
const toggleSpeedMenu = () => {
    showSpeedMenu.value = !showSpeedMenu.value;
};

// Change playback speed
const changePlaybackSpeed = (speed) => {
    currentSpeed.value = speed;
    setPlaybackRate(speed);
    showSpeedMenu.value = false;
    
    // Update SMTC position state to reflect new playback rate
    if (audio.duration && currentSong.value?.hash) {
        mediaSession.updatePositionState(audio.currentTime, audio.duration, speed);
    }
};

const handleDocumentClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    
    if (!target.closest('.quality-menu-wrapper')) {
        qualityMenuOpen.value = false;
    }
    if (!target.closest('.playback-speed')) {
        showSpeedMenu.value = false;
    }
};

const syncDesktopLyricsFont = (settings = JSON.parse(localStorage.getItem('settings') || '{}')) => {
    desktopLyricsFont.value = settings?.desktopLyricsFont || '';
};

const handleSettingsChange = (event) => {
    syncDesktopLyricsFont(event.detail?.settings);
};

// Navigate to search page for song
const searchSong = (songName) => {
    // Close fullscreen lyrics
    if (showLyrics.value) {
        toggleLyrics(currentSong.value.hash, audio.currentTime);
    }
    if (!songName) return;
    router.push({
        path: '/search',
        query: { q: songName }
    });
};

// Component mounted
onMounted(() => {
    console.log('[PlayerControl] 组件挂载');

    // Initialize audio settings
    audioController.initAudio();

    const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');
    syncDesktopLyricsFont(savedSettings);
    setAudioOutputDeviceWatcherEnabled(savedSettings.pauseOnAudioOutputChange === 'on');
    void applyAudioOutputDevice(savedSettings.audioOutputDevice);

    audioOutputDeviceWatchChangeHandler = (event) => {
        const enabled = !!event?.detail?.enabled;
        setAudioOutputDeviceWatcherEnabled(enabled);
    };
    window.addEventListener('audio-output-device-watch-change', audioOutputDeviceWatchChangeHandler);

    audioOutputDeviceChangeHandler = (event) => {
        const deviceId = event?.detail?.deviceId || 'default';
        void applyAudioOutputDevice(deviceId);
    };
    window.addEventListener('audio-output-device-change', audioOutputDeviceChangeHandler);

    // Listen for loudness normalization toggle
    const handleLoudnessChange = (event) => {
        const enabled = event.detail.enabled;
        console.log('[PlayerControl] 响度规格化开关变更:', enabled);
        toggleLoudnessNormalization(enabled);
    };
    window.addEventListener('loudness-normalization-change', handleLoudnessChange);

    // Initialize song and playback state
    const current_song = localStorage.getItem('current_song');
    if (current_song) {
        try {
            const savedSong = JSON.parse(current_song);
            if (isLocalSong(savedSong)) {
                savedSong.isLocal = true;
                savedSong.url = '';
                if (isBlobUrl(savedSong.img)) {
                    savedSong.img = './assets/images/ico.png';
                }
            }
            currentSong.value = savedSong;

            if (isLocalSong(savedSong)) {
                void restoreLocalSongCover(savedSong).then((cover) => {
                    if (!cover || currentSong.value.hash !== savedSong.hash) return;
                    currentSong.value.img = cover;
                    const { file, handle, ...savedLocalSong } = currentSong.value;
                    localStorage.setItem('current_song', JSON.stringify({
                        ...savedLocalSong,
                        url: ''
                    }));
                });
            }

            // Restore playback source if URL exists
            if (savedSong.url) {
                if (!isLocalSong(savedSong)) {
                    console.log('[PlayerControl] 从缓存恢复音频源:', savedSong.url);
                    audio.src = savedSong.url;
                }
            } else {
                console.log('[PlayerControl] 缓存的歌曲没有URL');
            }
        } catch (error) {
            console.error('[PlayerControl] 解析保存的歌曲信息失败:', error);
        }
    }

    // Initialize playback mode
    playbackMode.initPlaybackMode();

    // Set up media session
    mediaSession.initMediaSession({
        play: resumePlayback,
        pause: pausePlayback,
        playPrevious: () => playSongFromQueue('previous'),
        playNext: () => playSongFromQueue('next'),
        seekBackward: (seekOffset) => {
            if (audio.currentTime > seekOffset) {
                audio.currentTime -= seekOffset;
            } else {
                audio.currentTime = 0;
            }
        },
        seekForward: (seekOffset) => {
            if (audio.currentTime + seekOffset < audio.duration) {
                audio.currentTime += seekOffset;
            } else {
                audio.currentTime = audio.duration;
            }
        },
        seekTo: (seekTime) => {
            if (seekTime >= 0 && seekTime <= audio.duration) {
                audio.currentTime = seekTime;
            }
        }
    });

    // Set up system media shortcuts
    setupMediaShortcuts();

    // Restore playback position
    if (current_song && localStorage.getItem('player_progress')) {
        const savedProgress = localStorage.getItem('player_progress');
        audio.currentTime = savedProgress;
        console.log('[PlayerControl] 恢复播放进度:', savedProgress);
        progressWidth.value = (audio.currentTime / currentSong.value.timeLength) * 100;
    }

    // Restore playback speed setting
    const savedSpeed = localStorage.getItem('player_speed');
    if (savedSpeed) {
        currentSpeed.value = parseFloat(savedSpeed);
        setPlaybackRate(currentSpeed.value);
    }

    // Fetch VIP
    getVip();

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleDocumentClick);
    window.addEventListener('settings-change', handleSettingsChange);
    window.addEventListener('resize', handleWindowResize);

    // Set PlayerControl-specific listeners
    audio.addEventListener('pause', () => {
        playing.value = false;
        console.log('[PlayerControl] 暂停事件');
        // Clear SMTC position on pause
        mediaSession.clearPositionState();
        if (isElectron()) window.electron.ipcRenderer.send('play-pause-action', playing.value, audio.currentTime);
    });

    audio.addEventListener('play', () => {
        playing.value = true;
        console.log('[PlayerControl] 播放事件');
        if (!lyricsData.value.length) getCurrentLyrics();
        if (isElectron()) window.electron.ipcRenderer.send('play-pause-action', playing.value, audio.currentTime);
    });

    audio.addEventListener('error', async (e) => {
        console.log('[PlayerControl] 音频错误代码:', audio.error?.code);
        console.error('[PlayerControl] 音频错误:', e);
        if(audio.error?.code == 4){
            const result = await addSongToQueue(currentSong.value.hash, currentSong.value.name, currentSong.value.img, currentSong.value.author, true, 'flac');
            if (result && result.song) {
                playSong(result.song);
            }
        }else{
            window.$modal.alert(t('yin-pin-jia-zai-shi-bai'));
        }
    });

    console.log('[PlayerControl] 音频初始化完成');
});

// Sync lyrics to playback on lyrics data change
watch(lyricsData, (newLyrics) => {
    if (newLyrics && newLyrics.length > 0 && audio.currentTime > 0) {
        console.log('[PlayerControl] 歌词数据加载完成，同步到当前播放进度:', audio.currentTime);
        highlightCurrentChar(audio.currentTime, false);
        const currentLineIndex = getCurrentLineIndex(audio.currentTime);
        scrollToCurrentLine(currentLineIndex);
    }
});

// Cleanup on unmount
onUnmounted(() => {
    // Clear auto-switch timer
    clearAutoSwitchTimer();
    stopLyricsBackgroundCarousel();

    if (audioOutputDeviceWatchChangeHandler) {
        window.removeEventListener('audio-output-device-watch-change', audioOutputDeviceWatchChangeHandler);
        audioOutputDeviceWatchChangeHandler = null;
    }
    if (audioOutputDeviceChangeHandler) {
        window.removeEventListener('audio-output-device-change', audioOutputDeviceChangeHandler);
        audioOutputDeviceChangeHandler = null;
    }

    cleanupAudioOutputDeviceWatcher?.();
    cleanupAudioOutputDeviceWatcher = null;

    // Remove loudness normalization listener
    window.removeEventListener('loudness-normalization-change', () => {});

    // Use AudioController destroy to clean base listeners
    audioController.destroy();

    // Clean component-specific listeners
    audio.removeEventListener('pause', () => { });
    audio.removeEventListener('play', () => { });
    audio.removeEventListener('error', () => { });

    // Clean system media shortcuts
    if (isElectron()) {
        window.electron.ipcRenderer.removeAllListeners('play-previous-track');
        window.electron.ipcRenderer.removeAllListeners('play-next-track');
        window.electron.ipcRenderer.removeAllListeners('volume-up');
        window.electron.ipcRenderer.removeAllListeners('volume-down');
        window.electron.ipcRenderer.removeAllListeners('toggle-play-pause');
        window.electron.ipcRenderer.removeAllListeners('toggle-mute');
        window.electron.ipcRenderer.removeAllListeners('toggle-like');
        window.electron.ipcRenderer.removeAllListeners('toggle-mode');
    }

    // Clean keyboard events
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('click', handleDocumentClick);
    window.removeEventListener('settings-change', handleSettingsChange);
    window.removeEventListener('resize', handleWindowResize);
    if (lyricsResizeTimer) {
        clearTimeout(lyricsResizeTimer);
        lyricsResizeTimer = null;
    }
});

// Exposed API
defineExpose({
    playing,
    togglePlayPause,
    pause: () => {
        pausePlayback();
    },
    addSongToQueue: async (hash, name, img, author) => {
        clearAutoSwitchTimer();

        console.log('[PlayerControl] 外部调用addSongToQueue:', name);
        audio.pause();
        playing.value = false;
        const result = await addSongToQueue(hash, name, img, author);
        if (result && result.song) {
            await playSong(result.song);
        } else if (result && result.shouldPlayNext) {
            console.log('[PlayerControl] 歌曲无法播放');
            handleAutoSwitch();
        }
        return result;
    },
    addLocalMusicToQueue: async (localSong) => {
        clearAutoSwitchTimer();

        console.log('[PlayerControl] 外部调用addLocalMusicToQueue:', localSong.name);
        audio.pause();
        playing.value = false;
        
        const result = await addLocalMusicToQueue(localSong);
        if (result && result.song) {
            await playSong(result.song);
            console.log('[PlayerControl] 本地音乐播放成功:', localSong.name);
            return { song: result.song };
        } else {
            console.error('[PlayerControl] 播放本地音乐失败');
            return { error: true };
        }
    },
    addLocalPlaylistToQueue: async (localSongs, append = false) => {
        console.log('[PlayerControl] 外部调用addLocalPlaylistToQueue:', localSongs.length, '首歌曲');
        
        const queueSongs = await addLocalPlaylistToQueue(localSongs, append);
        
        // If not append mode, auto-play first track
        if (!append && queueSongs.length > 0) {
            let songIndex = 0;
            
            // In shuffle mode, pick random track
            if (currentPlaybackModeIndex.value == 0) {
                songIndex = Math.floor(Math.random() * queueSongs.length);
                console.log('[PlayerControl] 随机模式下添加本地歌单后随机播放:', queueSongs[songIndex].name);
            } else {
                console.log('[PlayerControl] 添加本地歌单后自动播放第一首:', queueSongs[0].name);
            }
            
            clearAutoSwitchTimer();
            audio.pause();
            playing.value = false;
            
            const result = await addLocalMusicToQueue(queueSongs[songIndex]);
            if (result && result.song) {
                await playSong(result.song);
            }
        }
        
        return queueSongs;
    },
    getPlaylistAllSongs,
    addPlaylistToQueue: async (info, append = false) => {
        const songs = await addPlaylistToQueue(info, append);
        if (songs && songs.length > 0 && !append) {
            // Choose track based on playback mode
            let songIndex = 0;

            // In shuffle mode, pick random track
            if (currentPlaybackModeIndex.value == 0) {
                songIndex = Math.floor(Math.random() * songs.length);
                console.log('[PlayerControl] 随机模式下添加歌单后随机播放:', songs[songIndex].name);
            } else {
                console.log('[PlayerControl] 添加歌单后自动播放第一首:', songs[0].name);
            }
            audio.pause();
            playing.value = false;
            // Play selected track
            const result = await addSongToQueue(
                songs[songIndex].hash,
                songs[songIndex].name,
                songs[songIndex].img,
                songs[songIndex].author,
                true
            );
            if (result && result.song) {
                await playSong(result.song);
            }
        }
        return songs;
    },
    addToNext,
    addCloudMusicToQueue: async (hash, name, author, timeLength, cover) => {
        clearAutoSwitchTimer();

        console.log('[PlayerControl] 外部调用addCloudMusicToQueue:', name);
        audio.pause();
        playing.value = false;
        const result = await addCloudMusicToQueue(hash, name, author, timeLength, cover);
        if (result && result.song) {
            await playSong(result.song);
    } else if (result && result.shouldPlayNext) {
        console.log('[PlayerControl] 歌曲无法播放');
        handleAutoSwitch();
        }
        return result;
    },
    addCloudPlaylistToQueue: async (songs, append = false) => {
        const queueSongs = await addCloudPlaylistToQueue(songs, append);
        if (queueSongs && queueSongs.length > 0 && !append) {
            // Choose track based on playback mode
            let songIndex = 0;

            // In shuffle mode, pick random track
            if (currentPlaybackModeIndex.value == 0) {
                songIndex = Math.floor(Math.random() * queueSongs.length);
                console.log('[PlayerControl] 随机模式下添加云盘歌单后随机播放:', queueSongs[songIndex].name);
            } else {
                console.log('[PlayerControl] 添加云盘歌单后自动播放第一首:', queueSongs[0].name);
            }

            // Play selected track
            const result = await addCloudMusicToQueue(
                queueSongs[songIndex].hash,
                queueSongs[songIndex].name,
                queueSongs[songIndex].author,
                queueSongs[songIndex].timeLength,
                queueSongs[songIndex].cover,
                true
            );
            if (result && result.song) {
                await playSong(result.song);
            }
        }
        return queueSongs;
    },
    currentSong
});

// Receive events from playback queue
const onQueueSongAdd = async (hash, name, img, author) => {
    clearAutoSwitchTimer();

    console.log('[PlayerControl] 从播放队列收到addSongToQueue事件:', name);
    audio.pause();
    playing.value = false;
    const result = await addSongToQueue(hash, name, img, author);
    if (result && result.song) {
        await playSong(result.song);
    } else if (result && result.shouldPlayNext) {
        console.log('[PlayerControl] 歌曲无法播放');
        handleAutoSwitch();
    }
};

const onQueueCloudSongAdd = async (hash, name, author, timeLength, cover) => {
    clearAutoSwitchTimer();

    console.log('[PlayerControl] 从播放队列收到addCloudMusicToQueue事件:', name);
    const result = await addCloudMusicToQueue(hash, name, author, timeLength, cover);
    if (result && result.song) {
        await playSong(result.song);
    } else if (result && result.shouldPlayNext) {
        console.log('[PlayerControl] 云盘歌曲无法播放');
        handleAutoSwitch();
    }
};

const onQueueLocalSongAdd = async (item) => {
    clearAutoSwitchTimer();
    audio.pause();
    playing.value = false;
    
    console.log('[PlayerControl] 从播放队列收到addLocalMusicToQueue事件:', item.name);
    const result = await addLocalMusicToQueue(item);
    if (result && result.song) {
        await playSong(result.song);
    } else if (result && result.shouldPlayNext) {
        console.log('[PlayerControl] 本地音乐无法播放');
        handleAutoSwitch();
    }
};
</script>

<style scoped>
@import '@/assets/style/PlayerControl.scss';
</style>
