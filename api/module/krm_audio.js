// Get the corresponding singer/album/song information of the song based on album_audio_id/MixSongID
module.exports = (params, useAxios) => {
  const resource = (params?.album_audio_id || '').split(',').map((s) => ({ entity_id: Number(s) }));

  const dataMap = {
    data: resource,
    fields: params.fields || 'base',
  };

  return useAxios({
    url: '/kmr/v2/audio',
    method: 'POST',
    data: dataMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
    headers: {'x-router': 'openapi.kugou.com', 'KG-TID': 238},
  });
};
