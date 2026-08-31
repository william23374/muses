const LIKED_SUFFIX = '喜欢的音乐';
const DEFAULT_COLLECTION_SUFFIX = '的默认收藏';

export const isLikedPlaylistName = (name) => {
    if (!name) return false;
    return name === '我喜欢' || name.endsWith(LIKED_SUFFIX);
};

export const isDefaultCollectionName = (name) => {
    if (!name) return false;
    return name === '默认收藏' || name.endsWith(DEFAULT_COLLECTION_SUFFIX);
};

export const isPlaceholderPlaylistCover = (pic) => {
    if (!pic) return true;
    const value = String(pic);
    return (
        value.includes('live.png') ||
        value.includes('ico.png') ||
        value.includes('default') ||
        value.endsWith('/0')
    );
};

export const displayPlaylistName = (name, t) => {
    if (!name) return '';
    if (name === '我喜欢') return t('wo-xi-huan');
    if (name === '默认收藏') return t('mo-ren-shou-cang');
    if (name.endsWith(LIKED_SUFFIX)) {
        const userName = name.slice(0, -LIKED_SUFFIX.length);
        return t('xx-xi-huan-de-yin-le', { name: userName || '' });
    }
    if (name.endsWith(DEFAULT_COLLECTION_SUFFIX)) {
        const userName = name.slice(0, -DEFAULT_COLLECTION_SUFFIX.length);
        return t('xx-de-mo-ren-shou-cang', { name: userName || '' });
    }
    return name;
};

export const playlistSystemCoverType = (item) => {
    const name = item?.name;
    if (isLikedPlaylistName(name)) return 'liked';
    if (isDefaultCollectionName(name)) return 'collection';
    if (isPlaceholderPlaylistCover(item?.pic)) return 'playlist';
    return null;
};

export const playlistSystemCoverIcon = (type) => {
    if (type === 'liked') return 'fas fa-heart';
    if (type === 'collection') return 'fas fa-bookmark';
    return 'fas fa-music';
};
