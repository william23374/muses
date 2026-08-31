// src/services/request.js
import axios from 'axios';
import { MusesAuthStore } from '../stores/store';
import { getApiBaseUrl } from './apiBaseUrl';
import { handleRiskResponse } from './riskVerify';
import { isBridgeEnabled, ipcRequest } from './bridge';
import i18n from './i18n';

const t = (key) => i18n.global.t(key);

// Build the device/auth cookie object sent to the main-process bridge, using the
// same identifiers the HTTP Authorization header carries (token/dfid/KUGOU_API_*).
// UserInfo/Device may be null (guest / not yet registered) — be null-safe.
function buildAuthCookie() {
    const MusesAuth = MusesAuthStore();
    const UserInfo = MusesAuth?.UserInfo || null;
    const Device = MusesAuth?.Device || null;
    return {
        token: UserInfo?.token,
        userid: UserInfo?.userid,
        t1: UserInfo?.t1,
        dfid: Device?.dfid,
        KUGOU_API_MID: Device?.mid,
        KUGOU_API_GUID: Device?.guid,
        KUGOU_API_DEV: Device?.serverDev,
        KUGOU_API_MAC: Device?.mac,
    };
}

// Create an axios instance
const httpClient = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor
httpClient.interceptors.request.use(
    config => {
        const MusesAuth = MusesAuthStore();
        const token = MusesAuth.UserInfo?.token;
        const userid = MusesAuth.UserInfo?.userid;
        const t1 = MusesAuth.UserInfo?.t1;
        const dfid = MusesAuth.Device?.dfid;
        const mid = MusesAuth.Device?.mid;
        const guid = MusesAuth.Device?.guid;
        const serverDev = MusesAuth.Device?.serverDev;
        const mac = MusesAuth.Device?.mac;

        const authParts = [];
        if (token) authParts.push(`token=${(token)}`);
        if (userid) authParts.push(`userid=${(userid)}`);
        if (dfid) authParts.push(`dfid=${(dfid)}`);
        if (t1) authParts.push(`t1=${(t1)}`);
        if (mid) authParts.push(`KUGOU_API_MID=${(mid)}`);
        if (guid) authParts.push(`KUGOU_API_GUID=${(guid)}`);
        if (serverDev) authParts.push(`KUGOU_API_DEV=${(serverDev)}`);
        if (mac) authParts.push(`KUGOU_API_MAC=${(mac)}`);

        if (authParts.length > 0) {
            config.headers = {
                ...config.headers,
                Authorization: authParts.join(';')
            };
        }
        return config;
    },
    error => Promise.reject(error)
);

// Response interceptor
httpClient.interceptors.response.use(
    async response => {
        if (response.config.__rawResponse) {
            return response;
        }

        const riskResult = await handleRiskResponse(response, (retryConfig) =>
            httpClient.request({ ...retryConfig, __rawResponse: true }),
            (url, params) => httpClient.get(url, { params, __skipRisk: true }),
        );
        if (riskResult.handled) {
            return riskResult.data;
        }

        return response.data;
    },
    async error => {
        if (error.config?.__rawResponse) {
            return Promise.reject(error);
        }

        if (error.response) {
            const riskResult = await handleRiskResponse(error.response, (retryConfig) =>
                httpClient.request({ ...retryConfig, __rawResponse: true }),
                (url, params) => httpClient.get(url, { params, __skipRisk: true }),
            );
            if (riskResult.handled) {
                return riskResult.data;
            }
        }

        if (error.response) {
            console.error(`http error status:${error.response.status}`,error.response.data);
            if (error.response?.data?.data) {
                console.error(error.response.data.data);
            // } else {
            //     $message.error('Server error, please try again later!');
            }
        } else if (error.request) {
            console.error('No response received:', error.request);
            $message.error(t('fu-wu-qi-wei-xiang-ying'));
        } else {
            console.error('Error:', error.message);
            $message.error(t('qing-qiu-cuo-wu'));
        }
        return Promise.reject(error);
    }
);

// Wrapped GET request
export const get = async (url, params = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = isBridgeEnabled()
            ? await ipcRequest({ method: 'GET', url, params, cookie: buildAuthCookie() })
            : await httpClient.get(url, { params, ...config });
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// Wrapped POST request
export const post = async (url, data = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = isBridgeEnabled()
            ? await ipcRequest({ method: 'POST', url, data, cookie: buildAuthCookie() })
            : await httpClient.post(url, data, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// Wrapped PUT request
export const put = async (url, data = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = isBridgeEnabled()
            ? await ipcRequest({ method: 'PUT', url, data, cookie: buildAuthCookie() })
            : await httpClient.put(url, data, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// Wrapped DELETE request
export const del = async (url, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = isBridgeEnabled()
            ? await ipcRequest({ method: 'DELETE', url, cookie: buildAuthCookie() })
            : await httpClient.delete(url, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// Wrapped PATCH request
export const patch = async (url, data = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const response = isBridgeEnabled()
            ? await ipcRequest({ method: 'PATCH', url, data, cookie: buildAuthCookie() })
            : await httpClient.patch(url, data, config);
        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// Wrapped image upload request
export const uploadImage = async (url, file, additionalData = {}, config = {}, onSuccess = null, onError = null) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        // Additional data (e.g. related product info) can also be appended to formData
        for (const key in additionalData) {
            if (Object.prototype.hasOwnProperty.call(additionalData, key)) {
                formData.append(key, additionalData[key]);
            }
        }

        // Ensure Content-Type is set to multipart/form-data
        const response = await httpClient.post(url, formData, {
            ...config,
            headers: {
                ...config.headers,
                'Content-Type': 'multipart/form-data'
            }
        });

        if (onSuccess) onSuccess(response);
        return response;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};

// Export httpClient for direct axios instance access when needed
export default httpClient;
