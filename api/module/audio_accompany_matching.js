const { cryptoMd5, appid } = require('../util');

module.exports = (params, useAxios) => {

  const paramsMap = {
    isteen: 0,
    mixId: Number(params.mixId) || 0,
    usemkv: 1,
    platform: 2,
    fileName: params.fileName || '',
    hash: params.hash,
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
    baseURL: 'https://nsongacsing.kugou.com',
    url: '/sing7/accompanywan/json/v2/cdn/optimal_matching_accompany_2_listen.do',
    params: paramsMap,
    method: 'get',
    encryptType: 'android',
    cookie: params?.cookie || {},
    clearDefaultParams: true,
    notSignature: true,
  });
};
