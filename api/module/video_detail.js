const { appid, clientver, signParamsKey, cryptoMd5 } = require('../util');
// Get video details
module.exports = (params, useAxios) => {
  const dfid = params?.cookie?.dfid || '-'; // Customize
  const mid = params?.cookie?.KUGOU_API_MID; // Can be customized
  const uuid = cryptoMd5(`${dfid}${mid}`); // Can be customized
  const token = params?.token || params?.cookie?.token || '';
  const clienttime = Math.floor(new Date().getTime() / 1000);

  const resource = (params.id || '').split(',').map((s) => ({ video_id: s }));

  const dataMap = {
    appid,
    clientver,
    clienttime,
    mid,
    uuid,
    dfid,
    token: token || '',
    key: signParamsKey(clienttime.toString()),
    show_resolution: 1,
    data: resource,
  };
  return useAxios({
    url: '/v1/video',
    method: 'POST',
    data: dataMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
    clearDefaultParams: true,
    headers: { 'x-router': 'kmr.service.kugou.com' },
  });
};
