import { ref } from 'vue';
import { get } from '../../utils/request';

export default function useProgressBar(audio, resetLyricsHighlight) {
    const progressWidth = ref(0);
    const isProgressDragging = ref(false);
    const isDraggingHandle = ref(false);
    const showTimeTooltip = ref(false);
    const tooltipPosition = ref(0);
    const tooltipTime = ref('0:00');
    const activeProgressBar = ref(null);
    const climaxPoints = ref([]);

    // Format time
    const formatTime = (seconds) => {
        if (seconds > 1000) seconds = seconds / 1000;
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Fetch song climax points
    const getMusicHighlights = async (hash) => {
        try {
            const response = await get(`/song/climax?hash=${hash}`);
            if (response.status !== 1) {
                climaxPoints.value = [];
                return;
            }
            climaxPoints.value = response.data.map(point => ({
                position: (parseInt(point.start_time) / 1000 / audio.duration) * 100,
                duration: parseInt(point.timelength) / 1000
            }));
        } catch (error) {
            climaxPoints.value = [];
        }
    };

    // Progress bar drag start
    const onProgressDragStart = (event) => {
        event.preventDefault();

        const currentProgressBar = event.target.closest('.progress-bar');
        if (!currentProgressBar) return;

        // Check if click is on handle dot
        const handle = event.target.closest('.progress-handle');
        if (!handle) {
            if (!audio.duration) return;
            const rect = currentProgressBar.getBoundingClientRect();
            const offsetX = Math.max(0, Math.min(event.clientX - rect.left, currentProgressBar.offsetWidth));
            const percentage = (offsetX / currentProgressBar.offsetWidth) * 100;
            progressWidth.value = Math.max(0, Math.min(percentage, 100));
        }

        isProgressDragging.value = true;
        isDraggingHandle.value = true;
        activeProgressBar.value = currentProgressBar;

        document.addEventListener('mousemove', onProgressDrag);
        document.addEventListener('mouseup', onProgressDragEnd);
    };

    // Progress bar dragging
    const onProgressDrag = (event) => {
        event.preventDefault();
        if (isProgressDragging.value && activeProgressBar.value) {
            const rect = activeProgressBar.value.getBoundingClientRect();
            const offsetX = Math.max(0, Math.min(event.clientX - rect.left, activeProgressBar.value.offsetWidth));
            const percentage = (offsetX / activeProgressBar.value.offsetWidth) * 100;
            progressWidth.value = Math.max(0, Math.min(percentage, 100));

            // Update time tooltip
            tooltipPosition.value = offsetX;
            const time = (percentage / 100) * audio.duration;
            tooltipTime.value = formatTime(time);
        }
    };

    // Progress bar drag end
    const onProgressDragEnd = (event) => {
        if (isProgressDragging.value && activeProgressBar.value) {
            const rect = activeProgressBar.value.getBoundingClientRect();
            const offsetX = Math.max(0, Math.min(event.clientX - rect.left, activeProgressBar.value.offsetWidth));
            const percentage = (offsetX / activeProgressBar.value.offsetWidth) * 100;
            const newTime = (percentage / 100) * audio.duration;

            audio.currentTime = Math.max(0, Math.min(newTime, audio.duration));
            resetLyricsHighlight(audio.currentTime);
        }

        isProgressDragging.value = false;
        isDraggingHandle.value = false;
        showTimeTooltip.value = false;
        activeProgressBar.value = null;
        document.removeEventListener('mousemove', onProgressDrag);
        document.removeEventListener('mouseup', onProgressDragEnd);
    };

    // Click progress bar to seek
    const updateProgressFromEvent = (event) => {
        if (isProgressDragging.value) return; // Ignore click while dragging

        const progressBar = event.target.closest('.progress-bar');
        if (!progressBar || !audio.duration) return;

        const rect = progressBar.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(event.clientX - rect.left, progressBar.offsetWidth));
        const percentage = (offsetX / progressBar.offsetWidth) * 100;
        const newTime = (percentage / 100) * audio.duration;

        audio.currentTime = Math.max(0, Math.min(newTime, audio.duration));
        progressWidth.value = percentage;
        resetLyricsHighlight(audio.currentTime);
    };

    // Update time tooltip
    const updateTimeTooltip = (event) => {
        const progressBar = event.target.closest('.progress-bar');
        if (!progressBar || !audio.duration) return;

        const rect = progressBar.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(event.clientX - rect.left, progressBar.offsetWidth));

        const tooltipWidth = 50;
        if (offsetX < tooltipWidth / 2) {
            tooltipPosition.value = tooltipWidth / 2;
        } else if (offsetX > progressBar.offsetWidth - tooltipWidth / 2) {
            tooltipPosition.value = progressBar.offsetWidth - tooltipWidth / 2;
        } else {
            tooltipPosition.value = offsetX;
        }

        const percentage = (offsetX / progressBar.offsetWidth);
        const time = percentage * audio.duration;
        tooltipTime.value = formatTime(time);

        showTimeTooltip.value = true;
    };

    // Hide time tooltip
    const hideTimeTooltip = () => {
        if (!isProgressDragging.value) {
            showTimeTooltip.value = false;
        }
    };

    return {
        progressWidth,
        isProgressDragging,
        showTimeTooltip,
        tooltipPosition,
        tooltipTime,
        climaxPoints,
        formatTime,
        getMusicHighlights,
        onProgressDragStart,
        updateProgressFromEvent,
        updateTimeTooltip,
        hideTimeTooltip
    };
} 