// Get the theme song list and say there are songs
const { clientver } = require('../util');
module.exports = (params, useAxios) => {
  const dataMap = {
    platform: 'android',
    clientver,
    clienttime: Date.now(),
    area_code: 1,
    module_id: 1,
    userid: params?.userid || params?.cookie?.userid || 0,
    theme_id: params?.theme_id,
  };

  return useAxios({
    url: '/v2/gettheme_songidlist',
    method: 'POST',
    encryptType: 'android',
    data: dataMap,
    cookie: params?.cookie || {},
    headers: { 'x-router': 'everydayrec.service.kugou.com' },
  });
};
