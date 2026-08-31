// Selection of popular songs
// 3006: VIP exclusive recommendation
// 3001: Private and exclusive songs
// 3004: A niche treasure masterpiece
// 3014: TA who likes this song also likes it
// 3102: People who like "Europe and America" ​​also like it
// 3101: Concept er new promotion
// 3005: Early adopters of trends

module.exports = (params, useAxios) => {

  const dataMap = {
    tagid: params.tagid ?? '',
    u_info: '',
    source_mixsong: ''
  };

  return useAxios({
    url: 'youth/v1/song/single_card_recommend',
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    params: { 'card_id': params?.card_id || 3005, area_code: 1, platform: 'ios', module_id: 1, ver: 'v2', pagesize: params.pagesize ?? 30 , module_id: 1,  clientver: 11490 },
    cookie: params?.cookie || {},
  });
};
