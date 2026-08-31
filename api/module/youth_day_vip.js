// To receive VIP (receive for one day) you need to log in
const { srcappid } = require("../util");

module.exports = (params, useAxios) => {
  return useAxios({
    url: '/youth/v1/recharge/receive_vip_listen_song',
    encryptType: 'android',
    method: 'post',
    params: { source_id: 90139, receive_day: params.receive_day },
    headers: {'content-type': 'application/x-www-form-urlencoded'  },
    cookie: params?.cookie,
  });
};
