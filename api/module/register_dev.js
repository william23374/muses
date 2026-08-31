const { playlistAesEncrypt, playlistAesDecrypt, rsaEncrypt2, signParamsKey, clientver, appid } = require('../util');
module.exports = (params, useAxios) => {
  const userid = params?.userid || params?.cookie?.userid || 0;
  const token = params?.token || params.cookie?.token || '';
  //Available memory in bytes
  const availableRamSize = params?.availableRamSize || 4983533568;
  //Internal storage available space in bytes (approximately 48 MB)
  const availableRomSize = params?.availableRomSize || 48114719;
  //External storage available space in bytes (approximately 48 MB)
  const availableSDSize = params?.availableSDSize || 48114717;
  //Baseband version
  const basebandVer = params?.basebandVer || '';
  //battery percentage
  const batteryLevel = params?.batteryLevel || 100;
  //battery status
  const batteryStatus = params?.batteryStatus || 3;
  //brand
  const brand = params?.brand || 'Redmi';
  //Device serial number
  const buildSerial = params?.buildSerial || 'unknown';
  //Equipment code
  const device = params?.device || 'marble';
  //IMEI number
  const imei = params?.imei || params.cookie?.KUGOU_API_GUID;
  //sim card number serial number
  const imsi = params?.imsi || '';
  //Manufacturer
  const manufacturer = params?.manufacturer || 'Xiaomi';
  //device uuid
  const uuid = params?.uuid  || params.cookie?.KUGOU_API_GUID;
  //Is there an acceleration sensor?
  const accelerometer = params?.accelerometer || false;
  //Acceleration sensor value
  const accelerometerValue = params?.accelerometerValue || '';
  //Is there a gravity sensor?
  const gravity = params?.gravity || false;
  //Gravity sensor value
  const gravityValue = params?.gravityValue  || '';
  //Is there a gyroscope?
  const gyroscope = params?.gyroscope || false;
  //gyroscope value
  const gyroscopeValue = params?.gyroscopeValue || '';
  //Is there a light sensor?
  const light = params?.light  || false;
  //Light sensor value
  const lightValue = params?.lightValue || '';
  //Is there a magnetic sensor?
  const magnetic = params?.magnetic || false;
  //Magnetic sensor value
  const magneticValue = params?.magneticValue  || '';
  //Is there a direction sensor?
  const orientation = params?.orientation || false;
  //Orientation sensor value
  const orientationValue = params?.orientationValue || '';
  //Is there a pressure sensor?
  const pressure = params?.pressure|| false;
  //Pressure sensor value
  const pressureValue = params?.pressureValue || '';
  //Is there a step sensor?
  const step_counter = params?.step_counter || false;
  //Step sensor value
  const step_counterValue = params?.step_counterValue || '';
  //Is there a temperature sensor?
  const temperature = params?.temperature || false;
  //Temperature sensor value
  const temperatureValue = params?.temperatureValue || '';



  const dataMap = {
    'availableRamSize': availableRamSize,
    'availableRomSize': availableRomSize,
    'availableSDSize': availableSDSize,
    'basebandVer': basebandVer,
    'batteryLevel': batteryLevel,
    'batteryStatus': batteryStatus,
    'brand': brand,
    'buildSerial': buildSerial,
    'device': device,
    'imei': imei,
    'imsi': imsi,
    'manufacturer': manufacturer,
    'uuid': uuid,
    'accelerometer': accelerometer,
    'accelerometerValue': accelerometerValue,
    'gravity': gravity,
    'gravityValue': gravityValue,
    'gyroscope': gyroscope,
    'gyroscopeValue': gyroscopeValue,
    'light': light,
    'lightValue': lightValue,
    'magnetic': magnetic,
    'magneticValue': magneticValue,
    'orientation': orientation,
    'orientationValue': orientationValue,
    'pressure': pressure,
    'pressureValue': pressureValue,
    'step_counter': step_counter,
    'step_counterValue': step_counterValue,
    'temperature': temperature,
    'temperatureValue': temperatureValue,
  };

  const aesEncrypt = playlistAesEncrypt(dataMap);

  const p = rsaEncrypt2({ aes: aesEncrypt.key, uid: userid, token });

  return new Promise((resolve, reject) => {
    useAxios({
      baseURL: 'https://userservice.kugou.com',
      url: '/risk/v2/r_register_dev',
      method: 'POST',
      data: aesEncrypt.str,
      params: { part: 1, platid: 1, p },
      encryptType: 'android',
      cookie: params?.cookie || {},
      responseType: 'arraybuffer',
    })
      .then((res) => {
        res.body = playlistAesDecrypt({ str: res.body.toString('base64'), key: aesEncrypt.key });

        const { body } = res;
        if (body?.status === 1 && body?.data) {
          res.cookie.push(`dfid=${res.body.data['dfid']}`);
        }

        resolve(res);
      })
      .catch((e) => reject(e));
  });
};
