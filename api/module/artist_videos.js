// Get singer mv

const tag_idx = { official: 18, live: 20, fan: 23, artist: 42419, all: '' };

module.exports = (params, useAxios) => {
  const paramsMap = {
    author_id: params.id,
    is_fanmade: '',
    tag_idx: tag_idx[params?.tag || 'all'] || '', // 18: Official version, 20: Live version, 23: Rice-made version, 42419: Singer release
    pagesize: params.pagesize || 30,
    page: params.page || 1,
  };

  return useAxios({
    baseURL: 'https://openapicdn.kugou.com',
    url: '/kmr/v1/author/videos',
    method: 'GET',
    params: paramsMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
