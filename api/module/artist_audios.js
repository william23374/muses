const { cryptoMd5, signParamsKey, clientver, appid } = require('../util');
// Get artist singles

module.exports = (params, useAxios) => {
  const clienttime = Math.floor(new Date().getTime() / 1000);
  const mid = params?.cookie?.KUGOU_API_MID;
  const dataMap = {
    appid,
    clientver,
    mid,
    clienttime,
    key: signParamsKey(clienttime),
    author_id: params.id,
    pagesize: params?.pagesize || 30,
    page: params?.page || 1,
    sort: params?.sort === 'hot' ? 1 : 2, // 1: hottest, 2: latest
    area_code: 'all',
  };

  return useAxios({
    baseURL: 'https://openapi.kugou.com',
    url: '/kmr/v1/audio_group/author',
    method: 'POST',
    data: dataMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
    headers: { 'x-router': 'openapi.kugou.com', 'kg-tid': 220 },
  });
};
