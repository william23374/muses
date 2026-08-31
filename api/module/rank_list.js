// Get the leaderboard list

module.exports = (params, useAxios) => {
  const paramsMap = {
    plat: 2,
    withsong: params.withsong || 1,
    parentid: 0,
  };

  return useAxios({
    url: '/ocean/v6/rank/list',
    method: 'get',
    encryptType: 'android',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
