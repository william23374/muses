// Music score list 3. Piano (0: Basic, 1: Advanced), 1. Guitar (1: Advanced, 2: Basic, 0: Intermediate), 2. Ukulele (0: Basic, 1: Advanced), 4: Simplified Notation (0: Basic)
module.exports = (params, useAxios) => {
  const paramsMap = {
    mixsongid: params.album_audio_id,
    instruments: params.instruments ?? 1,
    opern_level: params?.level ?? 0
  }
  return useAxios({
    url: '/opern/v1/detail/song_info',
    encryptType: 'android',
    method: 'GET',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
