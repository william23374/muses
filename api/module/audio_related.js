const { cryptoMd5 } = require('../util');

const sortType = { all: 1, hot: 2, new: 3 };

// https://listkmrp3cdnretry.kugou.com/v3/album_audio/related
module.exports = (params, useAxios) => {
  const show_detail = Number(params.show_detail) === 0;

  let paramsMap = {
    album_audio_id: Number(params.album_audio_id),
    appid: 1005,
    area_code: 1,
    clientver: 12329,
  };

  if (!show_detail) {
    paramsMap = {
      ...paramsMap,
      page: params.page || 1,
      pagesize: params.pagesize || 30,
      show_input: 1,
      show_type: params.show_type || 0,
      sort: sortType[params.sort] || 1,
      type: params.type || 0,
    };
  }

  paramsMap['version'] = 1;

  const str = 'OIlwieks28dk2k092lksi2UIkp';
  const paramsString = Object.keys(paramsMap)
    .sort()
    .map((key) => `${key}=${typeof paramsMap[key] === 'object' ? JSON.stringify(paramsMap[key]) : paramsMap[key]}`)
    .join('');
  paramsMap['signature'] = cryptoMd5(`${str}${paramsString}${str}`);

  return useAxios({
    baseURL: 'https://listkmrp3cdnretry.kugou.com',
    url: !show_detail ? '/v3/album_audio/related' : '/v2/audio_related/total',
    params: paramsMap,
    method: 'get',
    encryptType: 'android',
    cookie: params?.cookie || {},
    clearDefaultParams: true,
  });
};
