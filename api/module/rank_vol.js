// Get the list of past rankings
module.exports = (params, useAxios) => {
  const paramsMap = {
    rank_cid: params.rank_cid || 0,
    rankid: params.rankid,
    ranktype: 1,
    type: 0,
    plat: 2,
  };

  return useAxios({
    url: '/ocean/v6/rank/vol',
    method: 'get',
    encryptType: 'android',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
