// Query the level information of Kugou Listening and report the listening time
//
// Two modes:
//  1. Query mode (default): Returns the server’s current cumulative listening time (d_sec), grade (p_grade), points, etc.
//  2. Reporting mode: pass in d_sec + diff_sec to synchronize the local cumulative listening time
//     d_sec Local cumulative listening seconds (must >= server current value)
//     diff_sec The number of seconds added since the last synchronization
//     md5      = MD5(d_sec + diff_sec + y_type + m_type)
//
// Dual protocol support:
//  - v2 (lite exclusive): userinfo.user.kugou.com/v2/get_grade_info, body tile parameter + key verification
//  - v4 (standard version): userinfoservice.kugou.com/v4/get_grade_info, pk(RSA)+params(AES) encryption structure
// Defaults to platform selection; can be forced using params.protocol ('v2' | 'v4').
//
// Note: The v2 protocol is a conceptual version (lite) client user level system, and reporting is valid under the lite platform (platform=lite)
// (The server performs cumulative accounting according to diff_sec, and the increment is constrained by the time since the last report. Please call it according to the normal rhythm of listening to songs).
// v4 is the standard version client protocol: pk/params encryption structure + query signature, the standard version account can be queried;
// The listening time of the standard version is maintained by the actual playback statistics (delay) of the server. get_grade_info is only used for query/reconciliation.
// Increments reported for the standard version will not be recorded.

const crypto = require('crypto');
const {
  cryptoAesEncrypt,
  cryptoMd5,
  cryptoRSAEncrypt,
  publicLiteRasKey,
  publicRasKey,
} = require('../util');
const { appid, clientver, liteAppid, liteClientver } = require('../util/config.json');

// Platform signature salt value (consistent with the dual-platform configuration of util/helper.js and util/crypto.js)
const APPKEY_MAP = {
  lite: 'LnT6xpN3khm36zse0QzvmgTZ3waWdRSA',
  standard: 'OIlwieks28dk2k092lksi2UIkp',
};

// v4 common request header (KG-DEVID / KG-CLIENTTIMEMS)
const v4Headers = (clientVer, mid, ms) => ({
  'Content-Type': 'application/json; charset=UTF-8',
  'User-Agent': `Android15-1070-${clientVer}-201-0-get_user_grade_info-wifi`,
  'KG-DEVID': mid,
  'KG-CLIENTTIMEMS': String(ms),
  // Note: request.js injects default kg-thash/kg-rc/kg-rec/kg-rf headers;
  // measured differences do not affect query/accounting results; not overridden here.
});

// Build v4 reporting/query request
const buildV4 = (params, useAxios, cfg) => {
  const token = params?.token || params?.cookie?.token || '';
  const userid = String(params?.userid || params?.cookie?.userid || 0);
  const mid = params?.mid || params?.cookie?.mid || params?.cookie?.KUGOU_API_MID || '';
  const dfid = params?.dfid || params?.cookie?.dfid || '-';
  const uuid = params?.uuid || '-';
  const ms = Date.now();
  const clienttime = Math.floor(ms / 1000);

  const { appId, appKey, clientVer, publicKey } = cfg;

  // y_type/m_type (default 0)
  const y_type = params?.y_type || 0;
  const m_type = params?.m_type || 0;
  const d_sec = params?.d_sec != null ? Number(params.d_sec) : 0;
  const diff_sec = params?.diff_sec != null ? Number(params.diff_sec) : 0;

  // md5 = MD5(d_sec + diff_sec + y_type + m_type)
  const md5 = cryptoMd5(String(d_sec) + String(diff_sec) + String(y_type) + String(m_type));

  // AES seed key: 16-bit pure hex (the first 16 bits of hex are taken after AES-128 generates the key)
  const aesSeed = crypto.randomBytes(8).toString('hex');
  const seedMd5 = cryptoMd5(aesSeed);
  // params encryption: AES-256-CBC, key=MD5(seed)[0:32], iv=MD5(seed)[16:32]
  const paramsEnc = cryptoAesEncrypt(
    { userid, token, md5 },
    { key: seedMd5.substring(0, 32), iv: seedMd5.substring(16, 32) }
  );
  // pk: RSA/ECB/NOPADDING encryption {clienttime_ms, key} (hex lowercase)
  const pk = cryptoRSAEncrypt({ clienttime_ms: ms, key: aesSeed }, publicKey);

  const body = {
    plat: 1,
    userid,
    clienttime_ms: ms,
    type: 0,
    d_sec,
    diff_sec,
    y_type,
    m_type,
    pk,
    params: paramsEnc,
    medal: 0,
  };
  const bodyStr = JSON.stringify(body);

  // query parameter + signature: MD5(appkey + sorting query + body + appkey)
  const signParams = { clienttime, mid, dfid, uuid, appid: appId, clientver: clientVer };
  const signStr = Object.keys(signParams)
    .sort()
    .map((k) => `${k}=${signParams[k]}`)
    .join('');
  const signature = cryptoMd5(`${appKey}${signStr}${bodyStr}${appKey}`);

  return useAxios({
    baseURL: 'https://userinfoservice.kugou.com',
    url: '/v4/get_grade_info',
    method: 'POST',
    data: bodyStr,
    params: Object.assign({}, signParams, { signature }),
    clearDefaultParams: true,
    notSignature: true, // signature is already in the request, skip automatic signature
    headers: v4Headers(clientVer, mid, ms),
    cookie: params?.cookie || {},
  });
};

// Build v2 reporting/query request (lite client, original implementation)
const buildV2 = (params, useAxios, cfg) => {
  const token = params?.token || params?.cookie?.token || '';
  const userid = Number(params?.userid || params?.cookie?.userid || 0);
  const mid = params?.mid || params?.cookie?.mid || params?.cookie?.KUGOU_API_MID || '';
  const uuid = params?.uuid || '-';
  const dfid = params?.dfid || params?.cookie?.dfid || '-';
  const type = params?.type || 1;

  const { appId, appKey, clientVer, publicKey } = cfg;
  const clienttime = Math.floor(Date.now() / 1000);

  // Request verification key: MD5 (appid + appkey + clientver + clienttime)
  const key = crypto
    .createHash('md5')
    .update(appId + appKey + clientVer + clienttime)
    .digest('hex');

  const dataMap = { mid, type, uuid, userid };

  // Reporting mode (with cache): requires token and d_sec/diff_sec
  const isReport = params?.d_sec != null && params?.diff_sec != null;
  let p;
  if (isReport) {
    const d_sec = Number(params.d_sec);
    const diff_sec = Number(params.diff_sec);
    const y_type = params?.y_type || 0;
    const m_type = params?.m_type || 0;
    const md5 = crypto
      .createHash('md5')
      .update(String(d_sec) + String(diff_sec) + String(y_type) + String(m_type))
      .digest('hex');
    // p plain text: {"token":...,"md5":...}, hex in uppercase after RSA encryption
    p = cryptoRSAEncrypt({ token, md5 }, publicKey).toUpperCase();
    Object.assign(dataMap, { d_sec, diff_sec, y_type, m_type });
  } else {
    // Query mode (no cache): p plain text {"clienttime":...,"userid":...}
    const innerJson = JSON.stringify({ clienttime, userid });
    p = cryptoRSAEncrypt(innerJson, publicKey).toUpperCase();
  }
  dataMap.p = p;

  // Public parameters (within body)
  Object.assign(dataMap, { appid: appId, clientver: clientVer, clienttime, key });

  return useAxios({
    baseURL: 'http://userinfo.user.kugou.com',
    url: '/v2/get_grade_info',
    method: 'POST',
    data: dataMap,
    params: { dfid }, // Only dfid in URL query
    clearDefaultParams: true,
    notSignature: true, // This interface does not generate a signature, and the key field is the request verification
    headers: {
      'Content-Type': 'text/plain; charset=ISO-8859-1',
      'User-Agent': `Android15-1070-${clientVer}-201-0-get_user_grade_info-wifi`,
      // Generate random KG-THash for each request (simulating client behavior, fixed 7-bit hex)
      'KG-THash': Math.floor(Math.random() * 0xfffffff)
        .toString(16)
        .padStart(7, '0'),
      'KG-Rec': '1',
      'KG-RC': '1',
    },
    cookie: params?.cookie || {},
  });
};

module.exports = (params, useAxios) => {
  const isLite = process.env.platform === 'lite';
  const protocol = params?.protocol || (isLite ? 'v2' : 'v4');

  // Platform parameters (supports params coverage; v4 is exclusive to the standard version and has fixed standard platform configuration)
  const useV4 = protocol === 'v4';
  const cfg = {
    appId: String(params?.appid || (useV4 ? appid : isLite ? liteAppid : appid)),
    appKey: params?.appkey || APPKEY_MAP[useV4 ? 'standard' : isLite ? 'lite' : 'standard'],
    clientVer: String(params?.clientver || (useV4 ? clientver : isLite ? liteClientver : clientver)),
    publicKey: params?.publicKey || (useV4 ? publicRasKey : isLite ? publicLiteRasKey : publicRasKey),
  };

  return useV4 ? buildV4(params, useAxios, cfg) : buildV2(params, useAxios, cfg);
};
