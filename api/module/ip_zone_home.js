// Get today's recommended information, it may be empty
module.exports = (params, useAxios) => {
  const paramsMap = {
    id: params?.id,
    share: 0,
  };

  return useAxios({
    url: '/v1/zone/home',
    encryptType: 'android',
    method: 'GET',
    params: paramsMap,
    cookie: params?.cookie || {},
    headers: { 'x-router': 'yuekucategory.kugou.com' },
  });
};
