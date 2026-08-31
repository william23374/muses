import { defineStore } from 'pinia';

export const useMusicQueueStore = defineStore('MusicQueue', {
    state: () => ({
        queue: [], // Playlist
    }),
    actions: {
        // Add song to playback queue
        addSong(song) {
            this.queue.push(song);
        },
        // Set entire queue
        setQueue(newQueue) {
            this.queue = newQueue;
        },
        // Get playback queue
        getQueue() {
            return this.queue;
        },
        // Remove song at index
        removeSong(index) {
            this.queue.splice(index, 1);
        },
        // Clear playback queue
        clearQueue() {
            this.queue = [];
        },
    },
    persist: {
        enabled: true,
        strategies: [
            {
                key: 'MusicQueue',
                storage: localStorage,
                paths: ['queue'],
            },
        ],
    },
});
