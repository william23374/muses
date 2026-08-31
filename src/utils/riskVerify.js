import { createVNode, render } from 'vue';
import RiskVerifyModal from '@/components/RiskVerifyModal.vue';
import i18n from '@/utils/i18n';

let verifyQueue = Promise.resolve();

const getHeader = (headers, name) => {
    if (!headers) return '';
    if (typeof headers.get === 'function') {
        return headers.get(name);
    }

    const lowerName = name.toLowerCase();
    const key = Object.keys(headers).find(item => item.toLowerCase() === lowerName);
    return key ? headers[key] : '';
};

const getRiskEventId = (payload, headers = {}) => {
    const data = payload?.data || {};
    const candidates = [
        payload?.ssaCode,
        payload?.ssa_code,
        data?.ssaCode,
        data?.ssa_code,
        getHeader(headers, 'ssa-code'),
        getHeader(headers, 'ssa'),
        getHeader(headers, 'ssaCode'),
    ];

    return String(candidates.find(item => item) || '').trim();
};

const isRiskError = (payload, headers = {}) => {
    const data = payload?.data || {};
    const code = Number(payload?.error_code || data?.error_code || 0);
    const failed = Number(payload?.status || data?.status || 0) === 0;
    return code === 20028 || (failed && Boolean(getRiskEventId(payload, headers)));
};

const cleanupTencentCaptchaDom = () => {
    document.body.classList.remove('risk-verify-tencent-active');
    document
        .querySelectorAll('#tcaptcha_transform_dy, [id^="tcaptcha_transform"], .tcaptcha_transform')
        .forEach(node => {
            if (node !== document.body && node !== document.documentElement) {
                node.remove();
            }
        });
};

const openRiskVerifyModal = (eventId, requestRiskApi) => {
    if (typeof document === 'undefined') {
        throw new Error(i18n.global.t('dang-qian-huan-jing-bu-neng-xian-shi-an-quan-yan-zheng'));
    }

    return new Promise((resolve, reject) => {
        const container = document.createElement('div');
        container.dataset.riskVerifyHost = 'true';
        document.body.appendChild(container);

        let settled = false;

        const close = () => {
            if (container === document.body || container === document.documentElement) {
                return;
            }

            render(null, container);
            if (container.dataset.riskVerifyHost === 'true') {
                container.remove();
            }
        };

        const settle = (callback, value) => {
            if (settled) return;
            settled = true;
            close();
            callback(value);
        };

        const vnode = createVNode(RiskVerifyModal, {
            eventId,
            requestRiskApi,
            onSuccess: () => {
                settle(resolve, true);
                cleanupTencentCaptchaDom();
            },
            onCancel: () => settle(resolve, false),
        });

        render(vnode, container);
    });
};

const queueVerify = (eventId, requestRiskApi) => {
    const current = verifyQueue.then(() => openRiskVerifyModal(eventId, requestRiskApi));
    verifyQueue = current.catch(() => undefined).then(() => undefined);
    return current;
};

export const getRiskEventIdFromResponse = (response) => {
    return getRiskEventId(response?.data, response?.headers);
};

export const handleRiskResponse = async (response, requestAgain, requestRiskApi) => {
    const payload = response?.data || {};
    const headers = response?.headers || {};
    const config = response?.config || {};

    if (config.__skipRisk) {
        return { handled: false };
    }

    if (!isRiskError(payload, headers)) {
        return { handled: false };
    }

    if (config.__riskRetryCount >= 1) {
        const error = new Error(i18n.global.t('an-quan-yan-zheng-wei-tong-guo'));
        error.response = response;
        throw error;
    }

    const eventId = getRiskEventId(payload, headers);
    if (!eventId) {
        return { handled: false };
    }

    if (typeof requestAgain !== 'function' || typeof requestRiskApi !== 'function') {
        throw new Error(i18n.global.t('que-shao-an-quan-yan-zheng-qing-qiu-fang-fa'));
    }

    const verified = await queueVerify(eventId, requestRiskApi);
    if (!verified) {
        return { handled: true, data: payload };
    }

    const retryResponse = await requestAgain({
        ...config,
        __riskRetryCount: (config.__riskRetryCount || 0) + 1,
    });
    const retryPayload = retryResponse?.data ?? retryResponse;

    if (isRiskError(retryPayload, retryResponse?.headers)) {
        const error = new Error(i18n.global.t('an-quan-yan-zheng-wei-tong-guo'));
        error.response = retryResponse;
        throw error;
    }

    return { handled: true, data: retryPayload };
};
