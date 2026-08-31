// Get the relative playlist based on IP
module.exports = (params, useAxios) => {
  const paramsMap = {
    ip: params?.id,
    page: params?.page || 1,
    pagesize: params?.pagesize || 30,
  };

  return useAxios({
    url: '/ocean/v6/pubsongs/list_info_for_ip',
    encryptType: 'android',
    method: 'POST',
    params: paramsMap,
    cookie: params?.cookie || {},
  });
};
