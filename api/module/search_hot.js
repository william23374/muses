// Hot search
module.exports = (params, useAxios) => {
  const paramsMap = {
    navid: 1,
    plat: 2,
  };

  return useAxios({
    url: '/api/v3/search/hot_tab',
    method: 'GET',
    params: paramsMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
    headers: {'x-router': 'msearch.kugou.com'}
  });
};
