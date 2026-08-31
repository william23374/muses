// Get the singer's single (new version of the interface, returns the author list of each song, supports multiple singers)
// Note: The upper limit of pagesize for this interface is 100. If it exceeds, error_code=20010 will be returned.
module.exports = (params, useAxios) => {
  return useAxios({
    baseURL: 'https://gateway.kugou.com',
    url: '/openapi/kmr/v2/audio_group/author',
    method: 'GET',
    params: {
      author_id: params.id,
      area_code: 'all',
      sort: params?.sort === 'hot' ? 1 : 2, // 1: hottest, 2: latest
      page: params?.page || 1,
      pagesize: params?.pagesize || 30,
      replace_api_version: 1,
      mvdata_need: 1,
      show_audio_honor: 1,
      show_audio_tag: 1,
      replace_need: 1,
    },
    encryptType: 'android',
    cookie: params?.cookie || {},
    headers: { 'kg-tid': 36 },
  });
};