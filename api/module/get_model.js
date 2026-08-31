// Get community sounds

module.exports = (params, useAxios) => {
  const paramsMap = {
    super_vip: 1,
    sound_ver: 2,
    page: params.page || 1,
    pagesize: params.pagesize || 30,
    apiver: 3,
    classify: '2,3',
    plat: 2,
    privilege: 1,
    sort: params.sort || 2
  };




  return useAxios({
    url: '/ocean/v6/sound/list',
    encryptType: 'android',
    method: 'GET',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
