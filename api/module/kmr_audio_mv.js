const { appid, clientver } = require('../util');
// Get the corresponding mv of the song based on album_audio_id/MixSongID
module.exports = (params, useAxios) => {
  const resource = (params?.album_audio_id || '').split(',').map((s) => ({ album_audio_id: s }));

  const dataMap = {
    data: resource,
    fields: params.fields || '',
  };


  return useAxios({
    url: '/kmr/v1/audio/mv',
    method: 'POST',
    data: dataMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
    headers: {'x-router': 'openapi.kugou.com', 'KG-TID': 38},
  });
};
