const { srcappid, appid } = require('../util');

// QR code key generation interface
module.exports = (params, useAxios) => {
  return useAxios({
    baseURL: 'https://login-user.kugou.com',
    url: '/v2/qrcode',
    method: 'GET',
    params: {
      appid: params?.type === 'web' ? 1014 : 1001,
      type: 1,
      plat: 4,
      qrcode_txt: `https://h5.kugou.com/apps/loginQRCode/html/index.html?appid=${appid}&`,
      srcappid,
    },
    encryptType: 'web',
    cookie: params?.cookie || {},
  });
};
