// Content blacklist editing (add/remove blocked songs or artists)
//
// Protocol description (verified):
//  - label distinguishes the blacklist type: 'song' (song) | 'singer' (singer)
//  - Binding of source and label: song -> 3, singer -> 4 (for other values, the server will report "wrong source/wrong label")
//  - items is a [{ k, v }] structure:
//      Song: k = FileHash (lowercase), v = JSON string {"n":"Singer-song title","m":"mixsongid","t":"Second-level timestamp"}
//      Singer: k = singerid string, v = JSON string {"n":"Singer name","t":"Second level timestamp"}
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
  const timestamp = String(clienttime);

  // Supports directly passing items ([{k,v}] structure, batch scenario), or passing simplified parameters to be constructed by this module
  let items = params?.items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (e) {
      items = undefined;
    }
  }
  if (!Array.isArray(items) || items.length === 0) {
    if (label === 'song') {
      // hash: song FileHash; mixsongid: song MixSongID; name: "Singer - Song Title"
      items = [
        {
          k: String(params?.hash || '').toLowerCase(),
          v: JSON.stringify({ n: params?.name || '', m: String(params?.mixsongid || ''), t: timestamp }),
        },
      ];
    } else {
      // singerid: singer ID; name: singer name
      items = [
        {
          k: String(params?.singerid || ''),
          v: JSON.stringify({ n: params?.name || '', t: timestamp }),
        },
      ];
    }
  }

  const dataMap = {
    userid,
    source: Number(params?.source || SOURCE_MAP[label]),
    label,
    items,
    action: params?.isDelete ? 'delete' : 'add',
    p: cryptoRSAEncrypt(JSON.stringify({ clienttime, token })),
  };

  return useAxios({
    baseURL: 'https://relationuser.kugou.com',
    url: '/v1/edit_list_items',
    method: 'POST',
    data: dataMap,
    cookie: params?.cookie || {},
    headers: { 'KG-TID': String(params?.moduleId || 473) },
    encryptType: 'android',
  });
};
