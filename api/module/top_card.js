// Selection of popular songs
// song_module_1 card_id_1: Selected good songs to listen to as you like || Private and exclusive good songs
// song_module_2 card_id_2: Classic nostalgic golden songs
// song_module_3 card_id_3: Selection of popular songs
// song_module_4 card_id_4: A niche treasure masterpiece
// song_module_6 card_id_6: VIP exclusive recommendation

const { appid, clientver, cryptoMd5, signParamsKey } = require('../util');

module.exports = (params, useAxios) => {
  const dfid = params?.dfid || params?.cookie?.dfid || '-';
  const fakem = '60f7ebf1f812edbac3c63a7310001701760f';
  const mid = params?.cookie?.KUGOU_API_MID;
  const dateTime = Date.now();

  const dataMap = {
    appid,
    clientver,
    platform: 'android',
    clienttime: dateTime,
    userid: params?.userid || params?.cookie?.userid || 0,
    key: signParamsKey(dateTime),
    fakem,
    area_code: 1,
    mid,
    uuid: '-',
    client_playlist: [],
    u_info: 'a0c35cd40af564444b5584c2754dedec',
  };

  return useAxios({
    url: '/singlecardrec.service/v1/single_card_recommend',
    encryptType: 'android',
    method: 'POST',
    data: dataMap,
    params: { 'card_id': params?.card_id || 1, fakem, area_code: 1, platform: 'ios'},
    cookie: params?.cookie || {},
  });
};
