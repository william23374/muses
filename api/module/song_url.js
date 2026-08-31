const { randomString } = require('../util/util');

// Get music URLs
// quality supports magic music effects
// piano - piano
// acappella - vocal/accompaniment separation
// subwoofer - instruments
// ancient - ukulele
// dj - dj
module.exports = (params, useAxios) => {
  const quality = ['piano', 'acappella', 'subwoofer', 'ancient', 'dj', 'surnay'].includes(params.quality)
    ? `magic_${params?.quality}`
    : params.quality;

  const isLite = process.env.platform === 'lite';
  const page_id = isLite ? 967177915 : 151369488;
  const ppage_id = isLite
    ? (params.ppage_id || '356753938,823673182,967485191')
    : '463467626,350369493,788954147';

  const paramsMap = {
    album_id: Number(params.album_id ?? 0),
    area_code: 1,
    hash: (params?.hash || '').toLowerCase(),
    ssa_flag: 'is_fromtrack',
    version: 11430,
    page_id,
    quality: quality || 128,
    album_audio_id: Number(params.album_audio_id ?? 0),

    behavior: 'play',
    pid: isLite ? 411 : 2,
    cmd: 26,
    pidversion: 3001,
    IsFreePart: params?.free_part ? 1 : 0, // Whether to return preview portion (partial songs only)
    ppage_id,
    cdnBackup: 1,
    module: '',
    clientver: 11430,
  };
  
  return useAxios({
    url: '/v5/url',
    method: 'GET',
    params: paramsMap,
    encryptType: 'android',
    headers: { 'x-router': 'trackercdn.kugou.com'},
    encryptKey: true,
    notSign: true,
    cookie: Object.assign({}, {dfid: randomString(24)}, params?.cookie ),
  });
};
