export default function useMediaSession() {
  // Initialize media session
  const initMediaSession = (handlers) => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;

    // play / pause use explicit resume/pause actions; never toggle to avoid misjudgment
    if (typeof handlers.play === 'function') {
      navigator.mediaSession.setActionHandler('play', () => handlers.play());
    }
    if (typeof handlers.pause === 'function') {
      navigator.mediaSession.setActionHandler('pause', () => handlers.pause());
    }

    navigator.mediaSession.setActionHandler('previoustrack', handlers.playPrevious);
    navigator.mediaSession.setActionHandler('nexttrack', handlers.playNext);

    // SMTC timeline control
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      if (handlers.seekBackward) {
        const seekOffset = details.seekOffset || 10; // Default rewind 10 seconds
        handlers.seekBackward(seekOffset);
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      if (handlers.seekForward) {
        const seekOffset = details.seekOffset || 10; // Default fast-forward 10 seconds
        handlers.seekForward(seekOffset);
      }
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (handlers.seekTo && details.seekTime !== undefined) {
        handlers.seekTo(details.seekTime);
      }
    });
  };

  // Update media session metadata
  const changeMediaSession = (song) => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;

    const defaultArtwork = './assets/images/logo.png';
    const checkImageAccessibility = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => resolve(defaultArtwork);
        img.src = src;
      });
    };

    const updateMediaSession = async () => {
      try {
        const artworkSrc = await checkImageAccessibility(song.img || defaultArtwork);
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.name,
          artist: song.author,
          album: song.album,
          artwork: [{ src: artworkSrc }]
        });
      } catch (error) {
        console.error("Failed to update media session metadata:", error);
      }
    };

    updateMediaSession();
  };

  // Update playback position state
  const updatePositionState = (currentTime, duration, playbackRate = 1.0) => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;

    try {
      if (typeof currentTime === 'number' && typeof duration === 'number' &&
          currentTime >= 0 && duration > 0 && currentTime <= duration) {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: playbackRate,
          position: currentTime
        });
      }
    } catch (error) {
      console.error("Failed to update position state:", error);
    }
  };

  // Clear position state
  const clearPositionState = () => {
    if (!("mediaSession" in navigator) || !navigator.mediaSession) return;

    try {
      navigator.mediaSession.setPositionState(null);
    } catch (error) {
      console.error("Failed to clear position state:", error);
    }
  };

  return {
    initMediaSession,
    changeMediaSession,
    updatePositionState,
    clearPositionState
  };
}
