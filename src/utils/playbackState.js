export const TRACK_PLAYBACK = {
    PLAYING: 'playing',
    PAUSED: 'paused',
    STOPPED: 'stopped'
};

export const resolvePlayingFlag = (playing) => {
    if (playing && typeof playing === 'object' && 'value' in playing) {
        return !!playing.value;
    }
    return !!playing;
};

export const getTrackPlaybackState = ({ isCurrent = false, isPlaying = false } = {}) => {
    if (!isCurrent) return TRACK_PLAYBACK.STOPPED;
    return resolvePlayingFlag(isPlaying) ? TRACK_PLAYBACK.PLAYING : TRACK_PLAYBACK.PAUSED;
};

export const getTrackPlaybackIcon = (stateOrOptions) => {
    const state = typeof stateOrOptions === 'string'
        ? stateOrOptions
        : getTrackPlaybackState(stateOrOptions);

    if (state === TRACK_PLAYBACK.PLAYING) return 'fas fa-pause';
    return 'fas fa-play';
};

export const isTrackCurrent = (playerControl, track = {}) => {
    const current = playerControl?.currentSong;
    const song = current && typeof current === 'object' && 'value' in current ? current.value : current;
    if (!song) return false;
    if (track.hash && song.hash) return song.hash === track.hash;
    if (track.name && song.name) return song.name === track.name;
    return false;
};
