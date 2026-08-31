import { ref } from 'vue';

export default function useAudioController({ onSongEnd, updateCurrentTime }) {
    const audio = new Audio();
    // Set crossOrigin for Web Audio API cross-origin access
    audio.crossOrigin = 'anonymous';

    const playing = ref(false);
    const isMuted = ref(false);
    const volume = ref(66);
    const playbackRate = ref(1.0);

    // Volume slider uses square mapping for logarithmic perception; finer control at 1–10%
    const VOLUME_CURVE = 2;
    const sliderToAmplitude = (value) => Math.pow(Math.max(0, Math.min(100, value)) / 100, VOLUME_CURVE);
    const amplitudeToSlider = (amplitude) => Math.round(Math.pow(Math.max(0, Math.min(1, amplitude)), 1 / VOLUME_CURVE) * 100);

    const isElectronClient = () => typeof window !== 'undefined' && typeof window.electron !== 'undefined';
    const canUseSystemVolumeApi = () => isElectronClient() && typeof window.electronAPI?.getSystemVolume === 'function';

    let syncWithSystemVolume = false;
    let volumePollTimer = null;
    let ignoreSystemVolumeUntil = 0;
    let lastKnownSystemVolume = null;
    let volumeBeforeMute = 66;

    const applyLocalVolume = () => {
        audio.volume = sliderToAmplitude(volume.value);
        audio.muted = isMuted.value || volume.value === 0;
    };

    const applySystemPlaybackGain = () => {
        // Keep media element at full gain so system volume is the single source of truth
        audio.volume = 1;
        audio.muted = false;
    };

    const markLocalVolumeWrite = () => {
        ignoreSystemVolumeUntil = Date.now() + 900;
    };

    const syncVolumeFromSystem = async ({ force = false } = {}) => {
        if (!syncWithSystemVolume || !canUseSystemVolumeApi()) return null;
        if (!force && Date.now() < ignoreSystemVolumeUntil) return null;

        const result = await window.electronAPI.getSystemVolume();
        if (!result?.success) return null;

        const nextVolume = result.muted ? 0 : result.volume;
        lastKnownSystemVolume = result.volume;
        if (result.muted) {
            isMuted.value = true;
            if (volume.value !== 0) volumeBeforeMute = volume.value || volumeBeforeMute;
            volume.value = 0;
        } else {
            isMuted.value = false;
            volume.value = nextVolume;
            if (nextVolume > 0) volumeBeforeMute = nextVolume;
        }
        applySystemPlaybackGain();
        return result;
    };

    const startSystemVolumePolling = () => {
        if (volumePollTimer || !syncWithSystemVolume) return;
        volumePollTimer = window.setInterval(() => {
            if (document.hidden) return;
            void syncVolumeFromSystem();
        }, 800);
    };

    const stopSystemVolumePolling = () => {
        if (!volumePollTimer) return;
        window.clearInterval(volumePollTimer);
        volumePollTimer = null;
    };

    // Web Audio API for dynamic gain
    const audioContext = ref(null);
    const sourceNode = ref(null);
    const gainNode = ref(null);
    const currentLoudnessGain = ref(1.0); // Current loudness gain factor
    const loudnessNormalizationEnabled = ref(false); // Loudness normalization toggle, off by default
    const webAudioInitialized = ref(false); // Whether Web Audio is initialized

    // Init Web Audio API — only when loudness normalization enabled, on user gesture
    const initWebAudio = () => {
        try {
            // Init Web Audio API only when enabled
            if (!loudnessNormalizationEnabled.value) {
                console.log('[AudioController] 响度规格化未启用，使用原生音频播放');
                return false;
            }

            if (!audioContext.value) {
                audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
                console.log('[AudioController] Web Audio API 初始化成功');
                console.log('[AudioController] AudioContext 初始状态:', audioContext.value.state);

                // Create audio graph connection immediately
                try {
                    sourceNode.value = audioContext.value.createMediaElementSource(audio);
                    gainNode.value = audioContext.value.createGain();
                    sourceNode.value.connect(gainNode.value);
                    gainNode.value.connect(audioContext.value.destination);

                    // Set initial gain
                    gainNode.value.gain.setValueAtTime(currentLoudnessGain.value, audioContext.value.currentTime);

                    webAudioInitialized.value = true;
                    console.log('[AudioController] Web Audio 音频图创建完成');
                    console.log('[AudioController] 初始增益值:', gainNode.value.gain.value);
                } catch (sourceError) {
                    console.error('[AudioController] 创建音频源失败（可能是CORS问题）:', sourceError);
                    // Clean up created resources
                    if (audioContext.value) {
                        audioContext.value.close();
                        audioContext.value = null;
                    }
                    webAudioInitialized.value = false;
                    console.warn('[AudioController] 由于CORS限制，响度规格化已禁用，使用原生播放');
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('[AudioController] Web Audio API 初始化失败:', error);
            webAudioInitialized.value = false;
            return false;
        }
    };

    // Apply loudness normalization
    const applyLoudnessNormalization = (loudnessData) => {
        // Skip if Web Audio not initialized
        if (!webAudioInitialized.value || !loudnessNormalizationEnabled.value) {
            console.log('[AudioController] Web Audio 未启用，跳过响度规格化');
            return;
        }

        console.log('[AudioController] 开始应用响度规格化, loudnessData:', loudnessData);

        if (!loudnessData) {
            console.log('[AudioController] 歌曲无响度规格化数据，使用默认增益');
            currentLoudnessGain.value = 1.0;

            // Update gainNode
            if (gainNode.value && audioContext.value) {
                gainNode.value.gain.setValueAtTime(1.0, audioContext.value.currentTime);
                console.log('[AudioController] 重置音频增益为 1.0, 当前增益值:', gainNode.value.gain.value);
            }
            return;
        }

        try {
            const { volume, volumeGain, volumePeak } = loudnessData;

            // Loudness normalization algorithm
            // volume: LUFS value (e.g. -11.4 means -11.4 LUFS)
            // volumeGain: suggested gain adjustment (dB)
            // volumePeak: peak (0-1)

            // Target loudness -14 LUFS (Spotify standard)
            const targetLoudness = -14.0;
            const loudnessAdjustment = targetLoudness - volume;

            // Compute gain factor (dB to linear)
            // gain = 10^(dB/20)
            let gainAdjustment = Math.pow(10, loudnessAdjustment / 20);

            // Apply volumeGain if API provided gain suggestion
            if (volumeGain !== 0) {
                gainAdjustment *= Math.pow(10, volumeGain / 20);
            }

            // Prevent clipping: cap gain if peak would exceed 1.0
            if (volumePeak > 0 && volumePeak * gainAdjustment > 0.95) {
                gainAdjustment = 0.95 / volumePeak;
                console.log('[AudioController] 限制增益以防止削波');
            }

            // Clamp gain 0.01–3.0 (-40dB to +9.5dB) for hot masters
            currentLoudnessGain.value = Math.max(0.01, Math.min(3.0, gainAdjustment));

            console.log('[AudioController] 响度规格化:', {
                volume: volume + ' LUFS',
                volumeGain: volumeGain + ' dB',
                volumePeak,
                adjustment: loudnessAdjustment.toFixed(2) + ' dB',
                finalGain: (20 * Math.log10(currentLoudnessGain.value)).toFixed(2) + ' dB',
                gainMultiplier: currentLoudnessGain.value.toFixed(3)
            });

            // Apply new gain
            if (gainNode.value && audioContext.value) {
                gainNode.value.gain.setValueAtTime(currentLoudnessGain.value, audioContext.value.currentTime);
                console.log('[AudioController] 增益已应用, 当前增益值:', gainNode.value.gain.value);
            }
        } catch (error) {
            console.error('[AudioController] 应用响度规格化失败:', error);
            currentLoudnessGain.value = 1.0;
            // Reset gain on error
            if (gainNode.value && audioContext.value) {
                gainNode.value.gain.setValueAtTime(1.0, audioContext.value.currentTime);
            }
        }
    };

    // Ensure AudioContext running (init if needed, then resume)
    const ensureAudioContextRunning = async () => {
        // Init Web Audio first if loudness normalization enabled but not initialized
        if (loudnessNormalizationEnabled.value && !webAudioInitialized.value) {
            console.log('[AudioController] 首次播放，初始化 Web Audio API...');
            if (!initWebAudio()) {
                console.warn('[AudioController] Web Audio API 初始化失败，使用原生播放');
                return;
            }
        }

        // If initialized, ensure AudioContext is running
        if (webAudioInitialized.value && audioContext.value) {
            console.log('[AudioController] 检查 AudioContext 状态:', audioContext.value.state);

            if (audioContext.value.state === 'suspended') {
                console.log('[AudioController] AudioContext 处于 suspended，尝试恢复...');
                try {
                    await audioContext.value.resume();
                    console.log('[AudioController] AudioContext 已恢复为:', audioContext.value.state);
                } catch (error) {
                    console.error('[AudioController] 恢复 AudioContext 失败:', error);
                }
            } else {
                console.log('[AudioController] AudioContext 状态正常:', audioContext.value.state);
            }

            // Verify audio graph connection
            if (gainNode.value) {
                console.log('[AudioController] 当前增益节点值:', gainNode.value.gain.value);
            }
        }
    };

    // Toggle loudness normalization
    const toggleLoudnessNormalization = (enabled) => {
        const previousState = loudnessNormalizationEnabled.value;
        loudnessNormalizationEnabled.value = enabled;

        // Persist to settings
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        settings.loudnessNormalization = enabled ? 'on' : 'off';
        localStorage.setItem('settings', JSON.stringify(settings));

        // If Web Audio initialized, only adjust gain; cannot fully disable
        if (webAudioInitialized.value) {
            if (gainNode.value && audioContext.value) {
                const newGain = enabled ? currentLoudnessGain.value : 1.0;
                gainNode.value.gain.setValueAtTime(newGain, audioContext.value.currentTime);
                console.log('[AudioController] 响度规格化', enabled ? '已启用' : '已禁用', ', 增益:', newGain);
            }
        } else if (enabled && !previousState) {
            // Enabling after disabled requires Web Audio init
            console.warn('[AudioController] 启用响度规格化需要刷新页面才能生效');
            // Try init (may be too late if audio element already in use)
            // initWebAudio();
        }

        console.log('[AudioController] 响度规格化开关变更:', enabled ? '开启' : '关闭');
    };

    // Initialize audio settings
    const initAudio = async () => {
        const savedVolume = localStorage.getItem('player_volume');
        if (savedVolume !== null) volume.value = parseFloat(savedVolume);
        isMuted.value = volume.value === 0;
        volumeBeforeMute = volume.value > 0 ? volume.value : 66;

        if (canUseSystemVolumeApi()) {
            try {
                const supported = await window.electronAPI.systemVolumeSupported();
                syncWithSystemVolume = Boolean(supported);
            } catch {
                syncWithSystemVolume = false;
            }
        }

        if (syncWithSystemVolume) {
            applySystemPlaybackGain();
            await syncVolumeFromSystem({ force: true });
            startSystemVolumePolling();
            console.log('[AudioController] 已启用系统音量同步');
        } else {
            applyLocalVolume();
        }

        // Initialize playback speed
        const savedSpeed = localStorage.getItem('player_speed');
        if (savedSpeed !== null) {
            playbackRate.value = parseFloat(savedSpeed);
            audio.playbackRate = playbackRate.value;
        }

        // Check loudness normalization without immediate Web Audio init
        // Web Audio inits on first play for user-gesture context
        const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');
        const savedNormalization = savedSettings.loudnessNormalization || 'off';
        loudnessNormalizationEnabled.value = savedNormalization === 'on';

        audio.addEventListener('ended', onSongEnd);
        audio.addEventListener('pause', handleAudioEvent);
        audio.addEventListener('play', handleAudioEvent);
        audio.addEventListener('timeupdate', updateCurrentTime);

        console.log('[AudioController] 初始化完成，音量设置为:', audio.volume, 'volume值:', volume.value, '播放速度:', audio.playbackRate);
        console.log('[AudioController] 响度规格化状态:', loudnessNormalizationEnabled.value ? '已启用（将在首次播放时初始化）' : '未启用');
    };

    // Handle play/pause events
    const handleAudioEvent = (event) => {
        if (event.type === 'play') {
            playing.value = true;
        } else if (event.type === 'pause') {
            playing.value = false;
        }
        console.log(`[AudioController] ${event.type}事件: playing=${playing.value}`);
        if (typeof window !== 'undefined' && typeof window.electron !== 'undefined') {
            window.electron.ipcRenderer.send('play-pause-action', playing.value, audio.currentTime);
        }
    };

    // Toggle play/pause
    const togglePlayPause = async () => {
        console.log(`[AudioController] 切换播放状态: playing=${playing.value}, src=${audio.src}`);
        if (playing.value) {
            audio.pause();
            playing.value = false;
        } else {
            try {
                // Ensure AudioContext running before play (if enabled)
                await ensureAudioContextRunning();

                await audio.play();
                playing.value = true;
            } catch (error) {
                console.error('[AudioController] 播放失败:', error);
                return false;
            }
        }
        return true;
    };

    // Toggle mute
    const toggleMute = async () => {
        if (syncWithSystemVolume && canUseSystemVolumeApi()) {
            markLocalVolumeWrite();
            const shouldMute = !(isMuted.value || volume.value === 0);
            if (!shouldMute && volumeBeforeMute <= 0) volumeBeforeMute = lastKnownSystemVolume || 66;
            try {
                const result = await window.electronAPI.setSystemMuted(shouldMute);
                if (result?.success) {
                    if (shouldMute) {
                        if (volume.value > 0) volumeBeforeMute = volume.value;
                        volume.value = 0;
                        isMuted.value = true;
                    } else {
                        volume.value = result.volume || volumeBeforeMute || 66;
                        isMuted.value = false;
                    }
                    applySystemPlaybackGain();
                    return;
                }
            } catch (error) {
                console.warn('[AudioController] 系统静音同步失败，回退本地静音:', error);
            }
        }

        isMuted.value = !isMuted.value;
        if (isMuted.value) {
            if (volume.value > 0) volumeBeforeMute = volume.value;
            volume.value = 0;
        } else {
            volume.value = volumeBeforeMute || amplitudeToSlider(audio.volume) || 66;
        }
        applyLocalVolume();
        localStorage.setItem('player_volume', volume.value);
        console.log(`[AudioController] 切换静音: muted=${isMuted.value}`);
    };

    // Change volume
    const changeVolume = async () => {
        const nextVolume = Math.max(0, Math.min(100, Number(volume.value) || 0));
        volume.value = nextVolume;
        isMuted.value = nextVolume === 0;
        if (nextVolume > 0) volumeBeforeMute = nextVolume;

        if (syncWithSystemVolume && canUseSystemVolumeApi()) {
            markLocalVolumeWrite();
            applySystemPlaybackGain();
            try {
                const result = await window.electronAPI.setSystemVolume(nextVolume);
                if (result?.success) {
                    lastKnownSystemVolume = result.volume;
                    volume.value = result.muted ? 0 : result.volume;
                    isMuted.value = Boolean(result.muted) || volume.value === 0;
                    return;
                }
            } catch (error) {
                console.warn('[AudioController] 系统音量同步失败，回退本地音量:', error);
            }
        }

        applyLocalVolume();
        localStorage.setItem('player_volume', volume.value);
        console.log(`[AudioController] 修改音量: volume=${volume.value}, audio.volume=${audio.volume}, muted=${isMuted.value}`);
    };

    // Set progress
    const setCurrentTime = (time) => {
        audio.currentTime = time;
        console.log(`[AudioController] 设置进度: time=${time}`);
    };

    // Set playback speed
    const setPlaybackRate = (speed) => {
        playbackRate.value = speed;
        audio.playbackRate = speed;
        localStorage.setItem('player_speed', speed);
        console.log('[AudioController] 设置播放速度:', speed);
    };

    // Cleanup on destroy
    const destroy = () => {
        console.log('[AudioController] 销毁音频控制器');
        stopSystemVolumePolling();
        audio.pause();
        audio.load();
        audio.removeEventListener('play', handleAudioEvent);
        audio.removeEventListener('ended', onSongEnd);
        audio.removeEventListener('pause', handleAudioEvent);
        audio.removeEventListener('timeupdate', updateCurrentTime);

        // Clean Web Audio resources
        if (webAudioInitialized.value) {
            if (sourceNode.value) {
                sourceNode.value.disconnect();
            }
            if (gainNode.value) {
                gainNode.value.disconnect();
            }
            if (audioContext.value) {
                audioContext.value.close();
            }
        }
    };

    return {
        audio,
        playing,
        isMuted,
        volume,
        playbackRate,
        initAudio,
        togglePlayPause,
        toggleMute,
        changeVolume,
        setCurrentTime,
        setPlaybackRate,
        destroy,
        amplitudeToSlider,
        // Loudness normalization related
        applyLoudnessNormalization,
        ensureAudioContextRunning,
        toggleLoudnessNormalization,
        loudnessNormalizationEnabled,
        currentLoudnessGain,
        webAudioInitialized
    };
} 
