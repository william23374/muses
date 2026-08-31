const crypto = require('crypto');
const { signatureWebParams,appid,clientver,srcappid,publicLiteRasKey } = require('../util');

/**
 * RSA padding-free encryption (used for Token encryption, different from the project's RSA encryption function)
 */
function rsaNoPadEncrypt(data, publicKeyPem) {
    const key = crypto.createPublicKey(publicKeyPem);
    const encrypted = crypto.publicEncrypt(
        {
            key: key,
            padding: crypto.constants.RSA_NO_PADDING,
        },
        data
    );
    return encrypted.toString('hex');
}

/**
 * Device logout (kick offline) module
 *  The token needs to be encrypted into a specific format required by the interface for successful authentication.
 */
module.exports = (params, useAxios) => {
    // ----- Extract parameters (preferably obtained from cookies) -----
    const rawToken = params?.token || params?.cookie?.token || '';
    const userid = Number(params?.userid || params?.cookie?.userid || '0');
    const mid = params?.cookie?.KUGOU_API_MID || params?.mid || '';
    const dfid = params?.dfid || params?.cookie?.dfid || '-';
    const uuid = params?.uuid || params?.cookie?.uuid || '-';

    // ----- Token encryption part -----
    let token = rawToken;
    const prefix = 'moc.uoguk.59::';                // fixed prefix
    const input = Buffer.from(prefix + rawToken, 'utf8');
    const padded = Buffer.alloc(128);
    input.copy(padded);
    // Encrypt and add h5 prefix
    const encrypted = rsaNoPadEncrypt(padded, publicLiteRasKey).toUpperCase();
    token = 'h5' + encrypted;                       // Consistent with client format

    // -----Assemble request parameters -----
    const clienttime = Date.now();
    const dataMap = {
        appid,
        clientver,
        clienttime,
        mid,
        uuid,
        dfid,
        plat: 1,
        userid,
        token,
        srcappid,
        t_mid: params.t_mid,
        t: params.t,
        t_appid: params.t_appid,
        t_clientver: params.t_clientver,
    };

    // ----- Generate signature -----
    const signature = signatureWebParams(dataMap);      //Use the web version signature here
    const finalParams = { ...dataMap, signature };      //Encapsulated final request parameters

    // ----- Send request -----
    return useAxios({
        url: '/loginservice/v1/dev_logout',
        method: 'GET',
        params: finalParams,
        cookie: params?.cookie || {},
        headers: { 'Host':'gateway.kugou.com'}
    });
};
