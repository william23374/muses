// Get the corresponding song/album/video/singer based on ip id
module.exports = (params, useAxios) => {
  const dataMap = {
    is_publish: 1,
    ip_id: params?.id,
    sort: 3,
    page: params?.page || 1,
    pagesize: params?.pagesize || 30,
    query: 1,
  };

  const type = ['audios', 'albums', 'videos', 'author_list'].includes(params?.type) ? params.type : 'audios';

  return useAxios({
    url: `/openapi/v1/ip/${type}`,
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    cookie: params?.cookie || {},
  });
};
