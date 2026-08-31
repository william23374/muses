const { cryptoAesEncrypt, rsaEncrypt2 } = require('../util');
// Unfollow singer
module.exports = (params, useAxios) => {
  const singerid = params.id;
  const token = params?.token || params.cookie?.token || '';
  const userid = params?.userid || params?.cookie?.userid || 0;
  const clienttime = Math.floor(Date.now() / 1000);

  const encrypt = cryptoAesEncrypt({ singerid, token });

  const dataMap = {
    plat: 0,
    userid,
    singerid,
    source: 7,
    p: rsaEncrypt2({ clienttime, key: encrypt.key }),
    params: encrypt.str
  }


  return useAxios({
    url: '/followservice/v3/unfollow_singer',
    method: 'post',
    data: dataMap,
    encryptType: 'android',
    cookie: params?.cookie || {},
  });
};
