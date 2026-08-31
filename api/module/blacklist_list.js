// Content blacklist query (get a list of blocked songs or singers)
//
// Protocol description (verified):
//  - label distinguishes the blacklist type: 'song' (song) | 'singer' (singer)
//  - Source and label binding: song -> 3, singer -> 4
//  - page / pagesize paging parameters, the upper limit of a single page on the client is 500; turn the page to total / pagesize to get the full amount
//  - Return entry: song is { song_k: FileHash, song_v: '{"n": name, "m": mixsongid, "t": time}', t },
//    The singer is { singer_k: singerid, singer_v: '{"n": singer name, "t": time}', t }
//  - p is RSA encrypted {"clienttime":seconds,"token":"<token>"}, no other fields can be appended
//  - Use default parameter set + android signature (no need for clearDefaultParams)
//  - KG-TID values ​​based on scenarios: 473 Blacklist Management (default), 474 Guess You Like, 18 Daily Recommendations, 30 Theme Playlists
//  - The response is determined to be successful with status == 1 (error_code is the failure code)
const { cryptoRSAEncrypt } = require('../util');

const SOURCE_MAP = { song: 3, singer: 4 };

module.exports = (params, useAxios) => {
  const token = params?.token || params?.cookie?.token || '';
  const userid = Number(params?.userid || params?.cookie?.userid || 0);
  const clienttime = Math.floor(Date.now() / 1000);
  const label = params?.label === 'singer' ? 'singer' : 'song';

  const dataMap = {
    userid,
    source: Number(params?.source || SOURCE_MAP[label]),
    label,
    p: cryptoRSAEncrypt(JSON.stringify({ clienttime, token })),
    page: Number(params?.page || 1),
    pagesize: Math.min(Number(params?.pagesize || 30), 500),
  };

  return useAxios({
    baseURL: 'https://relationuser.kugou.com',
    url: '/v2/get_list_items',
    method: 'POST',
    data: dataMap,
    cookie: params?.cookie || {},
    headers: { 'KG-TID': String(params?.moduleId || 473) },
    encryptType: 'android',
  });
};
