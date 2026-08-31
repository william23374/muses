import { defineStore } from 'pinia';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import { isBridgeEnabled, ipcRawRequest } from '../utils/bridge';

// Standalone axios instance for device registration (no interceptors, avoids circular dependency)
const registerDeviceApi = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
});

export const MusesAuthStore = defineStore('MusesData', {
    state: () => ({
        UserInfo: null, // User info
        Config: null, // Config info
        Device: null, // Device info
    }),
    actions: {
        fetchConfig(key) {
            if (!this.Config) return null;
            const configItem = this.Config.find(item => item.key === key);
            return configItem ? configItem.value : null;
        },
        async setData(data) {
            if (data.UserInfo) this.UserInfo = data.UserInfo;
            if (data.Config) this.Config = data.Config;
        },
        clearData() {
            this.UserInfo = null; // Clear user info
        },
        async initDevice() {
            if (this.Device) return this.Device;
            try {
                // Inside Electron the register/dev request goes over the IPC bridge
                // (no local HTTP server); in a browser it uses the web API.
                const response = isBridgeEnabled()
                    ? { data: (await ipcRawRequest({ method: 'GET', url: '/register/dev', cookie: {} }))?.body }
                    : await registerDeviceApi.get('/register/dev');
                const device = response?.data?.data;
                if (device) {
                    this.Device = device;
                    return device;
                }
            } catch (error) {
                console.error('Failed to register device:', error);
            }
            return null;
        }
    },
    getters: {
        isAuthenticated: (state) => !!state.UserInfo && !!state.UserInfo, // Whether logged in
    },
    persist: {
        enabled: true,
        strategies: [
            {
                key: 'MusesData',
                storage: localStorage,
                paths: ['UserInfo', 'Config', 'Device'],
            },
        ],
    },
});
