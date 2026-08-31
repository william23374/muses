const { srcappid, appid } = require('../util');

// Kugou QR code status detection
// 0 means the QR code has expired, 1 means waiting to scan the code, 2 means pending confirmation, 4 means authorized login is successful (token will be returned under status code 4)
module.exports = (params, useAxios) => {
  return new Promise((resolve, reject) => {
    useAxios({
      baseURL: 'https://login-user.kugou.com',
      url: '/v2/get_userinfo_qrcode',
      method: 'GET',
      params: {
        plat: 4,
        appid,
        srcappid,
        qrcode: params?.key,
        dev: params?.cookie?.KUGOU_API_DEV,
      },
      encryptType: 'web',
      cookie: params?.cookie || {},
    })
      .then((resp) => {
        if (resp.body?.data?.status == 4) {
          resp.cookie.push(`token=${resp.body?.data?.token}`);
          resp.cookie.push(`userid=${resp.body?.data?.userid}`);
        }
        resolve(resp);
      })
      .catch((e) => reject(e));
  });
};
