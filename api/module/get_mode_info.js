// Get sound effect details
const { signParamsKey } = require('../util');
module.exports = (params, useAxios) => {
  const paramsMap = {
    model_id: Number(params.model_id || 0),
    req_src: 'collection',
    earphone_vip: 1,
    sound_ver: 2,
    key: signParamsKey(Date.now()),
    page: params.page || 1,
    pagesize: params.pagesize || 30,
  };

  

  return useAxios({
    baseURL: 'http://mobileservice.kugou.com',
    url: '/api/v5/earphone/get_model_info',
    encryptType: 'android',
    method: 'GET',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
