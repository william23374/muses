export const ONBOARDING_GUIDE_VERSION = '1';
export const ONBOARDING_GUIDE_STORAGE_KEY = 'muses:onboarding-guide-version';
export const ONBOARDING_GUIDE_INTRO_STORAGE_KEY = 'muses:onboarding-guide-intro-version';
export const ONBOARDING_GUIDE_STORAGE_PREFIX = 'muses:onboarding-guide:';
export const ONBOARDING_GUIDE_EVENT = 'muses-open-onboarding-guide';

export const onboardingGuideSteps = [
    {
        selector: '.app-header .nav-links',
        titleKey: 'onboarding-kuai-su-qie-huan-ye-mian',
        descriptionKey: 'onboarding-kuai-su-qie-huan-ye-mian-desc'
    },
    {
        selector: '.app-header .search-bar input',
        titleKey: 'onboarding-sou-suo-yin-le-bu-zhou',
        descriptionKey: 'onboarding-sou-suo-yin-le-bu-zhou-desc'
    },
    {
        selector: '.app-header .profile',
        titleKey: 'onboarding-zhang-hao-yu-she-zhi',
        descriptionKey: 'onboarding-zhang-hao-yu-she-zhi-desc'
    },
    {
        selector: '.player-container .controls',
        titleKey: 'onboarding-bo-fang-kong-zhi-bu-zhou',
        descriptionKey: 'onboarding-bo-fang-kong-zhi-bu-zhou-desc'
    },
    {
        selector: '.player-container .extra-controls',
        titleKey: 'onboarding-geng-duo-bo-fang-gong-neng',
        descriptionKey: 'onboarding-geng-duo-bo-fang-gong-neng-desc'
    }
];

export const onboardingGuideGroups = [
    {
        key: 'userAgreement',
        version: '1',
        routeNames: ['Index'],
        triggerSelector: '.user-agreement-guide',
        steps: [
            {
                selector: '.user-agreement-guide',
                titleKey: 'onboarding-yong-hu-tiao-kuan',
                descriptionKey: 'onboarding-yong-hu-tiao-kuan-desc'
            }
        ]
    },
    {
        key: 'main',
        version: ONBOARDING_GUIDE_VERSION,
        storageKey: ONBOARDING_GUIDE_STORAGE_KEY,
        routeNames: ['Index', 'Discover', 'Library', 'Settings', 'PlaylistDetail', 'Search', 'RecommendedSearch', 'Ranking', 'CloudDrive', 'LocalMusic'],
        triggerSelector: '.app-header',
        steps: onboardingGuideSteps
    },
    {
        key: 'home',
        version: '2',
        routeNames: ['Index'],
        triggerSelector: '.recommendations',
        steps: [
            {
                selector: '.recommend-title',
                titleKey: 'onboarding-qie-huan-tui-jian-ka-pian',
                descriptionKey: 'onboarding-qie-huan-tui-jian-ka-pian-desc'
            },
            {
                selector: '.recommendations .radio-card',
                titleKey: 'onboarding-muses-radio',
                descriptionKey: 'onboarding-muses-radio-desc'
            },
            {
                selector: '.radio-title .shuffle-icon',
                titleKey: 'onboarding-qie-huan-dian-tai-lei-xing',
                descriptionKey: 'onboarding-qie-huan-dian-tai-lei-xing-desc'
            },
            {
                selector: '.ranking-entry',
                titleKey: 'onboarding-pai-hang-bang-ru-kou',
                descriptionKey: 'onboarding-pai-hang-bang-ru-kou-desc'
            },
            {
                selector: '.playlist-entry',
                titleKey: 'onboarding-a-jue-jiang-de-ge-dan',
                descriptionKey: 'onboarding-a-jue-jiang-de-ge-dan-desc'
            },
            {
                selector: '.section-title .mama',
                titleKey: 'onboarding-mei-ri-tui-jian-yi-jian-jia-ru',
                descriptionKey: 'onboarding-mei-ri-tui-jian-yi-jian-jia-ru-desc'
            },
            {
                selector: '.song-list .song-item',
                titleKey: 'onboarding-mei-ri-tui-jian-ge-qu',
                descriptionKey: 'onboarding-mei-ri-tui-jian-ge-qu-desc'
            },
            {
                selector: '.playlist-grid .playlist-item',
                titleKey: 'onboarding-tui-jian-ge-dan-bu-zhou',
                descriptionKey: 'onboarding-tui-jian-ge-dan-bu-zhou-desc'
            }
        ]
    },
    {
        key: 'discover',
        version: '1',
        routeNames: ['Discover'],
        triggerSelector: '.discover-page',
        steps: [
            {
                selector: '.discover-switch',
                titleKey: 'onboarding-fa-xian-ye-fen-lei',
                descriptionKey: 'onboarding-fa-xian-ye-fen-lei-desc'
            },
            {
                selector: '.discover-page',
                titleKey: 'onboarding-fa-xian-geng-duo-nei-rong',
                descriptionKey: 'onboarding-fa-xian-geng-duo-nei-rong-desc'
            }
        ]
    },
    {
        key: 'library',
        version: '1',
        routeNames: ['Library'],
        triggerSelector: '.library-page',
        steps: [
            {
                selector: '.library-page .profile-header',
                titleKey: 'onboarding-yin-le-ku-zi-liao-ka',
                descriptionKey: 'onboarding-yin-le-ku-zi-liao-ka-desc'
            },
            {
                selector: '.favorite-header .section-title',
                titleKey: 'onboarding-wo-xi-huan-ting',
                descriptionKey: 'onboarding-wo-xi-huan-ting-desc'
            },
            {
                selector: '.favorite-header .favorite-close-button',
                titleKey: 'onboarding-yin-cang-chang-ting-qu-yu',
                descriptionKey: 'onboarding-yin-cang-chang-ting-qu-yu-desc'
            },
            {
                selector: '.library-page .category-tabs',
                titleKey: 'onboarding-yin-le-ku-fen-lei',
                descriptionKey: 'onboarding-yin-le-ku-fen-lei-desc'
            },
            {
                selector: '.music-grid .create-playlist-button',
                titleKey: 'onboarding-yun-pan-he-ben-di-yin-le',
                descriptionKey: 'onboarding-yun-pan-he-ben-di-yin-le-desc'
            },
            {
                selector: '.music-grid .music-card:not(.create-playlist-button)',
                titleKey: 'onboarding-ge-dan-he-shou-cang-nei-rong',
                descriptionKey: 'onboarding-ge-dan-he-shou-cang-nei-rong-desc'
            },
            {
                selector: '.music-grid .create-playlist-button:last-child',
                titleKey: 'onboarding-chuang-jian-ge-dan-bu-zhou',
                descriptionKey: 'onboarding-chuang-jian-ge-dan-bu-zhou-desc'
            }
        ]
    },
    {
        key: 'playlistDetail',
        version: '1',
        routeNames: ['PlaylistDetail'],
        triggerSelector: '.detail-page',
        steps: [
            {
                selector: '.detail-page .header',
                titleKey: 'onboarding-ge-dan-xin-xi',
                descriptionKey: 'onboarding-ge-dan-xin-xi-desc'
            },
            {
                selector: '.detail-page .actions',
                titleKey: 'onboarding-bo-fang-he-shou-cang',
                descriptionKey: 'onboarding-bo-fang-he-shou-cang-desc'
            },
            {
                selector: '.track-list-actions',
                titleKey: 'onboarding-lie-biao-gong-ju',
                descriptionKey: 'onboarding-lie-biao-gong-ju-desc'
            },
            {
                selector: '.batch-action-btn',
                titleKey: 'onboarding-pi-liang-cao-zuo-bu-zhou',
                descriptionKey: 'onboarding-pi-liang-cao-zuo-bu-zhou-desc'
            },
            {
                selector: '.track-list',
                titleKey: 'onboarding-ge-qu-lie-biao-bu-zhou',
                descriptionKey: 'onboarding-ge-qu-lie-biao-bu-zhou-desc'
            }
        ]
    },
    {
        key: 'playerLyrics',
        version: '2',
        triggerSelector: '.lyrics-bg .lyrics-screen',
        steps: [
            {
                selector: '.lyrics-bg .lyrics-screen',
                titleKey: 'onboarding-quan-ping-ge-ci',
                descriptionKey: 'onboarding-quan-ping-ge-ci-desc'
            },
            {
                selector: '.lyrics-bg .album-art-container',
                titleKey: 'onboarding-qie-huan-chang-pian-mo-shi',
                descriptionKey: 'onboarding-qie-huan-chang-pian-mo-shi-desc'
            },
            {
                selector: '.fullscreen-lyrics-settings .settings-guide-anchor',
                titleKey: 'onboarding-quan-ping-ge-ci-kuai-jie-she-zhi',
                descriptionKey: 'onboarding-quan-ping-ge-ci-kuai-jie-she-zhi-desc'
            },
            {
                selector: '.lyrics-mode-btn',
                titleKey: 'onboarding-qie-huan-ge-ci-mo-shi',
                descriptionKey: 'onboarding-qie-huan-ge-ci-mo-shi-desc'
            },
            {
                selector: '#lyrics-container',
                titleKey: 'onboarding-ge-ci-gun-dong-qu-yu',
                descriptionKey: 'onboarding-ge-ci-gun-dong-qu-yu-desc'
            },
            {
                selector: '.lyrics-bg .close-btn',
                titleKey: 'onboarding-tui-chu-quan-ping-ge-ci',
                descriptionKey: 'onboarding-tui-chu-quan-ping-ge-ci-desc'
            }
        ]
    },
    {
        key: 'settings',
        version: '1',
        routeNames: ['Settings'],
        triggerSelector: '.settings-page',
        steps: [
            {
                selector: '.settings-sidebar',
                titleKey: 'onboarding-she-zhi-fen-lei',
                descriptionKey: 'onboarding-she-zhi-fen-lei-desc'
            },
            {
                selector: '.settings-cards .setting-card',
                titleKey: 'onboarding-she-zhi-xiang-ka-pian',
                descriptionKey: 'onboarding-she-zhi-xiang-ka-pian-desc'
            },
            {
                selector: '.reset-settings-button',
                titleKey: 'onboarding-hui-fu-chu-chang-she-zhi',
                descriptionKey: 'onboarding-hui-fu-chu-chang-she-zhi-desc'
            }
        ]
    }
];
