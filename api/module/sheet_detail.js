// Score details
module.exports = (params, useAxios) => {
  const paramsMap = {
    opern_id: params.id,
  }
  return useAxios({
    url: '/opern/v1/detail/info',
    encryptType: 'android',
    method: 'GET',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
