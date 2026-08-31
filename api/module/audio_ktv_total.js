const { cryptoMd5, appid } = require('../util');

module.exports = (params, useAxios) => {

  const paramsMap = {
    isteen: 0,
    songId: Number(params.songId),
    usemkv: 1,
    platform: 2,
    singerName: params.singerName,
    songHash: params.songHash,
    version: 12375,
    appid,
  }


  const str = '*s&iN#G70*';
  const paramsString = Object.keys(paramsMap)
    .sort()
    .map((key) => `${key}=${typeof paramsMap[key] === 'object' ? JSON.stringify(paramsMap[key]) : paramsMap[key]}`)
    .join('&');
  paramsMap['sign'] = cryptoMd5(`${paramsString}${str}`).substring(8, 24);
  
  return useAxios({
    baseURL: 'https://acsing.service.kugou.com',
    url: '/sing7/listenguide/json/v2/cdn/listenguide/get_total_opus_num_v02.do',
    params: paramsMap,
    method: 'get',
    encryptType: 'android',
    cookie: params?.cookie || {},
    clearDefaultParams: true,
    notSignature: true,
  });
};
