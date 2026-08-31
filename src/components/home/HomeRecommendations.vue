<template>
    <section class="home-recommendations-section">
        <h2 class="section-title">{{ $t('tui-jian') }}</h2>
        <div class="recommendations">
            <div class="recommendations-layout">
                <div class="recommend-card radio-card">
                    <button class="play-fab" type="button" @click="playFM" :aria-label="$t('home-play-radio')">
                        <i class="fas fa-play"></i>
                    </button>
                    <div class="card-body">
                        <div class="card-eyebrow">
                            <i class="fas fa-broadcast-tower"></i>
                            <span>{{ $t('home-personal-fm') }}</span>
                            <button class="mode-chip" type="button" @click.stop="toggleMode">{{ modeIcon }}</button>
                        </div>
                        <div class="card-title">{{ radioSubtitle }}</div>
                        <div class="card-desc">{{ $t('home-fm-desc') }}</div>
                    </div>
                </div>

                <router-link :to="{ path: '/Ranking' }" class="recommend-card link-card">
                    <div class="card-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="card-body">
                        <div class="card-eyebrow">{{ $t('home-charts') }}</div>
                        <div class="card-title">{{ $t('home-charts-title') }}</div>
                        <div class="card-desc">{{ $t('home-charts-desc') }}</div>
                    </div>
                </router-link>

                <router-link
                    :to="{ path: '/PlaylistDetail', query: { global_collection_id: 'collection_3_25230245_24_0' } }"
                    class="recommend-card link-card"
                >
                    <div class="card-icon alt">
                        <i class="fas fa-heart"></i>
                    </div>
                    <div class="card-body">
                        <div class="card-eyebrow">{{ $t('home-featured') }}</div>
                        <div class="card-title">{{ $t('home-featured-title') }}</div>
                        <div class="card-desc">{{ $t('home-featured-desc') }}</div>
                    </div>
                </router-link>
            </div>
        </div>
        <Teleport to="body">
            <div class="note-container">
                <transition-group name="fly-note">
                    <div v-for="note in flyingNotes" :key="note.id" class="flying-note" :style="note.style">♪</div>
                </transition-group>
            </div>
        </Teleport>
    </section>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from 'vue-i18n';
import { get } from '../../utils/request';

const { t } = useI18n();

const props = defineProps({
    playerControl: Object
});

const currentMode = ref('1');
const modes = ['1', '2', '3', '4', '6'];

const modeIcon = computed(() => {
    switch (currentMode.value) {
        case '1': return '♥';
        case '2': return '♪';
        case '3': return '▲';
        case '4': return '◆';
        case '6': return '★';
        default: return '♥';
    }
});

const radioSubtitle = computed(() => {
    switch (currentMode.value) {
        case '1': return t('home-fm-title-1');
        case '2': return t('home-fm-title-2');
        case '3': return t('home-fm-title-3');
        case '4': return t('home-fm-title-4');
        case '6': return t('home-fm-title-6');
        default: return t('home-fm-title-default');
    }
});

const toggleMode = () => {
    const currentIndex = modes.indexOf(currentMode.value);
    currentMode.value = modes[(currentIndex + 1) % modes.length];
};

const flyingNotes = ref([]);
let noteId = 0;

const playFM = async (event) => {
    try {
        const playButton = event.currentTarget;
        const rect = playButton.getBoundingClientRect();
        const note = {
            id: noteId++,
            style: {
                '--start-x': `${rect.left + rect.width / 2}px`,
                '--start-y': `${rect.top + rect.height / 2}px`,
                left: '0',
                top: '0'
            }
        };
        flyingNotes.value.push(note);
        setTimeout(() => {
            flyingNotes.value = flyingNotes.value.filter(n => n.id !== note.id);
        }, 1500);

        const response = await get('/top/card', {
            params: { card_id: currentMode.value }
        });

        if (response.status === 1 && response.data?.song_list?.length > 0) {
            // Song names come from API and stay in their original language
            const newSongs = response.data.song_list.map(song => ({
                hash: song.hash,
                name: song.songname,
                cover: song.sizable_cover?.replace("{size}", 480),
                author: song.author_name,
                timelen: song.time_length
            }));
            props.playerControl.addPlaylistToQueue(newSongs);
        }
    } catch (error) {
        console.error('FM play error:', error);
    }
};
</script>

<style lang="scss" scoped>
.section-title {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 20px;
    color: #1d1d1f;
    letter-spacing: -0.03em;

    &:is(.dark .section-title) {
        color: rgba(255, 255, 255, 0.92);
    }
}

.recommendations {
    margin-bottom: 36px;
}

.recommendations-layout {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
}

.recommend-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 120px;
    padding: 20px;
    border-radius: 18px;
    background: #f5f5f7;
    color: #1d1d1f;
    text-decoration: none;
    box-sizing: border-box;
    transition: background 0.2s ease;
    border: 0;

    &:hover {
        transform: none;
        background: #ececef;
        text-decoration: none;
    }

    &:is(.dark .recommend-card) {
        background: #2c2c2e;
        color: rgba(255, 255, 255, 0.92);
    }

    &:is(.dark .recommend-card:hover) {
        background: #3a3a3c;
    }
}

.play-fab,
.card-icon {
    flex: 0 0 auto;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    border: 0;
    font-size: 17px;
    cursor: pointer;
    box-shadow: none;
    transition: opacity 0.2s ease;

    &:hover {
        transform: none;
        opacity: 0.9;
    }
}

/* Apple Music–style tinted glyphs */
.play-fab {
    background: linear-gradient(145deg, #ff9f0a 0%, #ff6500 100%);

    i {
        margin-left: 2px;
    }
}

.card-icon {
    background: linear-gradient(145deg, #64d2ff 0%, #0a84ff 100%);
}

.card-icon.alt {
    background: linear-gradient(145deg, #ff7a9c 0%, #ff2d55 100%);
}

.radio-card .card-eyebrow > i {
    color: #ff9500;
}

.card-body {
    min-width: 0;
    flex: 1;
}

.card-eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    color: #86868b;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
}

.card-title {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.02em;
}

.card-desc {
    margin-top: 4px;
    color: #86868b;
    font-size: 13px;
    line-height: 1.4;
}

.mode-chip {
    margin-left: auto;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 50%;
    background: rgba(var(--primary-color-rgb), 0.12);
    color: var(--primary-color);
    cursor: pointer;
    font-size: 12px;
}

.note-container {
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
    overflow: hidden;
}

.flying-note {
    position: absolute;
    font-size: 28px;
    color: var(--primary-color);
}

.fly-note-enter-active,
.fly-note-leave-active {
    animation: fly-note 1.5s ease-out forwards;
}

@keyframes fly-note {
    0% {
        transform: translate(var(--start-x), calc(var(--start-y) - 40px)) scale(1.1);
        opacity: 0.9;
    }
    100% {
        transform: translate(80vw, 100vh) rotate(280deg) scale(0.6);
        opacity: 0;
    }
}

@media screen and (max-width: 900px) {
    .recommendations-layout {
        grid-template-columns: 1fr;
    }
}
</style>
