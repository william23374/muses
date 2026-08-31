<template>
    <template v-if="isElectron()">
        <div class="extensions-toolbar">
            <div class="extensions-tabs">
                <button class="tab-btn" :class="{ active: currentView === 'installed' }" @click="currentView = 'installed'">
                    {{ t('yi-an-zhuang-cha-jian') }}
                </button>
                <button class="tab-btn" :class="{ active: currentView === 'market' }" @click="currentView = 'market'">
                    {{ t('cha-jian-shi-chang') }}
                </button>
            </div>

            <div v-if="currentView === 'installed'" class="extensions-actions">
                <button @click="refreshExtensions(true)" class="extension-btn primary" :disabled="extensionsLoading">
                    <i class="fas fa-sync-alt"></i>
                    {{ extensionsLoading ? t('jia-zai-zhong') : t('shua-xin-cha-jian') }}
                </button>
                <button @click="openExtensionsDir" class="extension-btn secondary">
                    <i class="fas fa-folder-open"></i>
                    {{ t('da-kai-cha-jian-mu-lu') }}
                </button>
                <button @click="installPlugin" class="extension-btn success" :disabled="extensionsLoading">
                    <i class="fas fa-upload"></i>
                    {{ t('an-zhuang-cha-jian') }}
                </button>
            </div>

            <div v-else class="market-actions">
                <div class="market-search">
                    <i class="fas fa-search"></i>
                    <input v-model.trim="marketSearch" type="text" :placeholder="t('sou-suo-cha-jian-placeholder')" />
                </div>
                <button @click="fetchMarketPlugins(true)" class="extension-btn primary" :disabled="marketLoading">
                    <i class="fas fa-rotate-right"></i>
                    {{ marketLoading ? t('jia-zai-zhong') : t('shua-xin-shi-chang') }}
                </button>
                <button @click="openPluginsRepo" class="extension-btn secondary">
                    <i class="fas fa-arrow-up-right-from-square"></i>
                    {{ t('shang-jia-ju-bao') }}
                </button>
            </div>
        </div>

        <div v-if="currentView === 'installed'">
            <div v-if="!extensionsLoading && extensions.length > 0" class="extensions-list">
                <div v-for="extension in extensions" :key="extension.id" class="market-item installed-item">
                    <div class="market-item-header">
                        <div class="market-title-group">
                            <div class="extension-icon">
                            <img
                                v-if="extension.iconData"
                                :src="extension.iconData"
                                :alt="displayPluginName(extension)"
                                @error="handleIconError"
                                class="extension-icon-img"
                            />
                            <i v-else class="fas fa-puzzle-piece"></i>
                            </div>
                            <div class="market-title-text">
                                <h4>{{ displayPluginName(extension) }}</h4>
                                <p>{{ displayPluginDescription(extension) }}</p>
                            </div>
                        </div>
                        <div class="market-status-group">
                            <span class="market-badge installed">{{ t('yi-an-zhuang') }}</span>
                            <button v-if="extension.hasPopup" @click="openExtensionPopup(extension.id)" class="extension-btn secondary" :disabled="extensionsLoading">
                                <i class="fas fa-up-right-from-square"></i>
                                {{ t('da-kai-tan-chuang') }}
                            </button>
                            <button @click="uninstallExtension(extension.id, displayPluginName(extension), extension.directory)" class="extension-btn danger" :disabled="extensionsLoading">
                                <i class="fas fa-trash"></i>
                                {{ t('xie-zai') }}
                            </button>
                        </div>
                    </div>

                    <div class="market-meta">
                        <span>{{ t('ban-ben') }} {{ extension.version || t('wei-zhi') }}</span>
                        <span class="author-meta">
                            {{ t('zuo-zhe') }}
                            <a :href="extension.authorUrl || 'javascript:void(0)'" :target="extension.authorUrl ? '_blank' : '_self'" rel="noopener noreferrer">
                                {{ extension.author || t('wei-zhi') }}
                            </a>
                        </span>
                        <span>ID {{ extension.pluginId || extension.id }}</span>
                    </div>

                    <p v-if="!extension.moeKoeAdapted" class="extension-compatibility-warning installed-warning">
                        <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                        <span>{{ t('cha-jian-wei-shi-pei') }}</span>
                    </p>
                    <p v-if="isCurrentAppVersionLowerThanMin(extension.minversion)" class="extension-compatibility-warning installed-warning">
                        <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                        <span>{{ t('muses-ban-ben-guo-di', { version: extension.minversion }) }}</span>
                    </p>
                    <div v-if="extension.nativeHosts?.length" class="native-host-panel">
                        <div class="native-host-title">
                            <i class="fas fa-terminal" aria-hidden="true"></i>
                            <span>{{ t('ben-di-er-jin-zhi-quan-xian') }}</span>
                        </div>
                        <div v-for="host in extension.nativeHosts" :key="host.id" class="native-host-row">
                            <div class="native-host-info">
                                <strong>{{ host.id }}</strong>
                                <span>{{ host.path }}</span>
                            </div>
                            <div class="native-host-actions">
                                <span class="market-badge" :class="resolveNativeHostBadge(host).className">
                                    {{ resolveNativeHostBadge(host).text }}
                                </span>
                                <button
                                    class="extension-btn"
                                    :class="host.authorized ? 'danger' : 'primary'"
                                    :disabled="extensionsLoading || nativeHostActionLoading === `${extension.id}:${host.id}` || !host.valid || !host.supported"
                                    @click="toggleNativeHostAuthorization(extension, host)"
                                >
                                    <i v-if="nativeHostActionLoading === `${extension.id}:${host.id}`" class="fas fa-spinner fa-spin"></i>
                                    <i v-else :class="host.authorized ? 'fas fa-ban' : 'fas fa-shield-alt'"></i>
                                    {{ host.authorized ? t('qu-xiao-shou-quan') : t('shou-quan') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else-if="!extensionsLoading && extensions.length === 0" class="extensions-empty">
                <div class="empty-icon">
                    <i class="fas fa-puzzle-piece"></i>
                </div>
                <h4>{{ t('zan-wu-cha-jian') }}</h4>
                <p>{{ t('jiang-cha-jian-wen-jian-jia-fang-ru-cha-jian-mu-lu') }}</p>
            </div>

            <div v-if="extensionsLoading" class="extensions-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>{{ t('zheng-zai-jia-zai-cha-jian') }}</p>
            </div>
        </div>

        <div v-else class="market-panel">
            <div v-if="marketLoading" class="extensions-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>{{ t('zheng-zai-jia-zai-cha-jian-shi-chang') }}</p>
            </div>

            <div v-else-if="marketError" class="market-feedback error">
                <div class="empty-icon">
                    <i class="fas fa-circle-exclamation"></i>
                </div>
                <h4>{{ t('cha-jian-shi-chang-jia-zai-shi-bai') }}</h4>
                <p>{{ marketError }}</p>
            </div>

            <div v-else-if="pagedMarketPlugins.length > 0" class="market-list">
                <div v-for="plugin in pagedMarketPlugins" :key="plugin.uniqueKey" class="market-item">
                    <div class="market-item-header">
                        <div class="market-title-group">
                            <div class="extension-icon market-icon">
                                <img
                                    v-if="plugin.icon"
                                    :src="plugin.icon"
                                    :alt="displayPluginName(plugin)"
                                    @error="handleMarketIconError"
                                    class="extension-icon-img"
                                />
                                <i v-else class="fas fa-store"></i>
                            </div>
                            <div class="market-title-text">
                                <h4>
                                    <a
                                        class="market-title-link"
                                        :href="plugin.snapshotUrl"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        :title="t('cha-kan-xiang-mu-di-zhi', { name: displayPluginName(plugin) })"
                                    >
                                        {{ displayPluginName(plugin) }}
                                    </a>
                                    <span v-if="isCurrentAppVersionLowerThanMin(plugin.minversion)" class="market-min-version-inline">
                                        {{ t('xu-yao-ban-ben', { version: plugin.minversion }) }}
                                    </span>
                                </h4>
                                <p>{{ displayPluginDescription(plugin) }}</p>
                            </div>
                        </div>
                        <div class="market-status-group">
                            <span class="market-badge" :class="resolveMarketState(plugin).badgeClass">
                                {{ resolveMarketState(plugin).badgeText }}
                            </span>
                            <button
                                class="extension-btn"
                                :class="resolveMarketState(plugin).buttonClass"
                                :disabled="marketActionLoading === plugin.uniqueKey || !plugin.downloadUrl"
                                @click="handleMarketInstall(plugin)"
                            >
                                <i v-if="marketActionLoading === plugin.uniqueKey" class="fas fa-spinner fa-spin"></i>
                                <i v-else :class="resolveMarketState(plugin).buttonIcon"></i>
                                {{ marketActionLoading === plugin.uniqueKey ? t('chu-li-zhong') : resolveMarketState(plugin).buttonText }}
                            </button>
                        </div>
                    </div>

                    <div class="market-meta">
                        <span>{{ t('ban-ben') }} {{ plugin.version || t('wei-zhi') }}</span>
                        <span class="author-meta">
                            {{ t('zuo-zhe') }}
                            <a
                                :href="plugin.approvedIssueUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                :title="t('cha-kan-shang-jia-bao-gao', { name: displayPluginName(plugin) })"
                            >
                                {{ plugin.author || t('wei-zhi') }}
                            </a>
                        </span>
                        <span v-if="resolveMarketPermissions(plugin).length > 0" class="market-permissions">
                            <span
                                v-for="permission in resolveMarketPermissions(plugin)"
                                :key="permission.key"
                                class="permission-badge"
                            >
                                <i :class="permission.icon"></i>
                                {{ permission.label }}
                            </span>
                        </span>
                    </div>

                    <div v-if="plugin.tags.length > 0" class="market-tags">
                        <span v-for="tag in plugin.tags" :key="tag" class="market-tag">{{ tag }}</span>
                    </div>
                </div>

                <div v-if="marketTotalPages > 1" class="market-pagination">
                    <button class="extension-btn secondary small" :disabled="marketPage === 1" @click="marketPage -= 1">
                        {{ t('shang-yi-ye') }}
                    </button>
                    <span>{{ t('di-x-ye', { page: marketPage, total: marketTotalPages }) }}</span>
                    <button class="extension-btn secondary small" :disabled="marketPage === marketTotalPages" @click="marketPage += 1">
                        {{ t('xia-yi-ye') }}
                    </button>
                </div>
            </div>

            <div v-else class="market-feedback">
                <div class="empty-icon">
                    <i class="fas fa-store-slash"></i>
                </div>
                <h4>{{ marketPlugins.length === 0 ? t('zan-wu-ke-yong-cha-jian') : t('mei-you-pi-pei-cha-jian') }}</h4>
                <p>{{ marketPlugins.length === 0 ? t('shi-chang-kong') : t('huan-ge-guan-jian-ci') }}</p>
            </div>
        </div>
    </template>
    <div v-else class="extensions-empty">
        <div class="empty-icon">
            <i class="fas fa-puzzle-piece"></i>
        </div>
        <h4>{{ t('web-cha-jian-ti-shi') }}</h4>
    </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, te, locale } = useI18n()
const MARKET_URL = 'https://raw.githubusercontent.com/MoeKoeMusic/MoeKoeMusic-Plugins/refs/heads/main/plugins.json'
const MARKET_PAGE_SIZE = 5

const localizePluginField = (pluginId, field, fallback) => {
    if (!pluginId) return fallback || ''
    const key = `plugin-meta.${pluginId}.${field}`
    if (te(key) || te(key, 'en')) return t(key)
    return fallback || ''
}
const displayPluginName = (ext) => localizePluginField(ext.pluginId || ext.id, 'name', ext.name)
const displayPluginDescription = (ext) => localizePluginField(ext.pluginId || ext.id, 'description', ext.description) || t('zan-wu-miao-shu')

const extensions = ref([])
const extensionsLoading = ref(false)
const currentView = ref('installed')
const marketPlugins = ref([])
const marketLoading = ref(false)
const marketLoaded = ref(false)
const marketError = ref('')
const marketSearch = ref('')
const marketPage = ref(1)
const marketActionLoading = ref('')
const currentAppVersion = ref('')
const nativeHostActionLoading = ref('')

const normalizedInstalledExtensions = computed(() => extensions.value)

const filteredMarketPlugins = computed(() => {
    const keyword = marketSearch.value.trim().toLowerCase()
    if (!keyword) {
        return marketPlugins.value
    }

    return marketPlugins.value.filter(plugin => {
        const text = [
            displayPluginName(plugin),
            displayPluginDescription(plugin),
            plugin.name,
            plugin.description,
            plugin.author,
            plugin.id,
            plugin.directory,
            ...(plugin.tags || [])
        ].filter(Boolean).join(' ').toLowerCase()

        return text.includes(keyword)
    })
})

const marketTotalPages = computed(() => {
    return Math.max(1, Math.ceil(filteredMarketPlugins.value.length / MARKET_PAGE_SIZE))
})

const pagedMarketPlugins = computed(() => {
    const start = (marketPage.value - 1) * MARKET_PAGE_SIZE
    return filteredMarketPlugins.value.slice(start, start + MARKET_PAGE_SIZE)
})

watch(marketSearch, () => {
    marketPage.value = 1
})

watch(filteredMarketPlugins, () => {
    if (marketPage.value > marketTotalPages.value) {
        marketPage.value = marketTotalPages.value
    }
})

watch(currentView, async view => {
    if (view === 'market' && !marketLoaded.value && !marketLoading.value) {
        await fetchMarketPlugins()
    }
})

const refreshExtensions = async (reload = false) => {
    extensionsLoading.value = true
    try {
        if (reload) {
            const reloadResult = await window.electronAPI?.reloadExtensions()
            if (!reloadResult?.success) {
                console.error('Failed to reload plugins:', reloadResult?.message)
            }
        }

        await new Promise(resolve => setTimeout(resolve, 300))
        const result = await window.electronAPI?.getExtensions()
        if (result?.success) {
            extensions.value = result.extensions || []
        } else {
            console.error('Failed to get plugins:', result?.error)
        }
    } catch (error) {
        console.error('Error refreshing plugins:', error)
    } finally {
        extensionsLoading.value = false
    }
}

const fetchMarketPlugins = async (force = false) => {
    if (!force && marketLoaded.value) {
        return
    }

    marketLoading.value = true
    marketError.value = ''

    try {
        const response = await fetch(MARKET_URL, {
            method: 'GET',
            cache: 'no-store'
        })

        if (!response.ok) {
            throw new Error(t('qing-qiu-shi-bai', { status: `${response.status} ${response.statusText || ''}`.trim() }))
        }

        const payload = await response.json()
        const normalized = normalizeMarketPayload(payload)

        marketPlugins.value = normalized.filter(plugin => plugin.status === 'active')
        marketLoaded.value = true
        marketPage.value = 1
    } catch (error) {
        marketPlugins.value = []
        marketLoaded.value = false
        marketError.value = error?.message || t('wu-fa-du-qu-shi-chang')
        console.error('Failed to fetch plugin market:', error)
    } finally {
        marketLoading.value = false
    }
}

const normalizeMarketPayload = payload => {
    const list = Array.isArray(payload)
        ? payload
        : payload?.plugins || payload?.items || payload?.data || []

    if (!Array.isArray(list)) {
        throw new Error(t('shi-chang-shu-ju-ge-shi-cuo-wu'))
    }

    return list.map((item, index) => normalizeMarketPlugin(item, index)).filter(Boolean)
}

const normalizeMarketPlugin = (item, index) => {
    if (!item || typeof item !== 'object') {
        return null
    }

    const snapshot = item.snapshot && typeof item.snapshot === 'object' ? item.snapshot : {}
    const repositoryValue = item.repositoryUrl || ''
    const downloadUrl = normalizeUrl(item.downloadUrl)

    const plugin = {
        uniqueKey: item.id,
        id: String(item.id).trim(),
        name: String(item.name).trim(),
        directory: String(item.id).trim(),
        version: String(item.version).trim(),
        description: String(item.description).trim(),
        author: String(item.author).trim(),
        status: String(item.status || '').trim().toLowerCase(),
        icon: normalizeUrl(item.iconUrl),
        tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag).trim()).filter(Boolean) : [],
        repositoryUrl: normalizeUrl(repositoryValue),
        snapshotUrl: normalizeUrl(snapshot.snapshotUrl || item.snapshotUrl || ''),
        approvedIssueUrl: normalizeUrl(item.approvedIssueUrl || ''),
        downloadUrl,
        minversion: item.minversion,
        permissions: {
            networkAccess: item.networkAccess === true,
            fileAccess: item.fileAccess === true,
            binaryContent: item.binaryContent === true,
            storageAccess: item.storageAccess === true
        }
    }

    if (!plugin.name) {
        return null
    }

    return plugin
}

const normalizeUrl = value => {
    if (typeof value !== 'string') {
        return ''
    }

    const trimmed = value.trim()
    if (!trimmed) {
        return ''
    }

    if (trimmed.includes('github.com') && trimmed.includes('/blob/')) {
        return trimmed.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/')
    }

    return trimmed
}


const findInstalledExtension = plugin => {
    const pluginId = String(plugin?.id || '').trim().toLowerCase()
    if (!pluginId) {
        return null
    }

    return normalizedInstalledExtensions.value.find(extension => {
        return String(extension?.pluginId || '').trim().toLowerCase() === pluginId
    }) || null
}

const compareVersions = (currentVersion, latestVersion) => {
    const currentTokens = tokenizeVersion(currentVersion)
    const latestTokens = tokenizeVersion(latestVersion)
    const length = Math.max(currentTokens.length, latestTokens.length)

    for (let index = 0; index < length; index += 1) {
        const currentToken = currentTokens[index] ?? 0
        const latestToken = latestTokens[index] ?? 0

        if (typeof currentToken === 'number' && typeof latestToken === 'number') {
            if (currentToken !== latestToken) {
                return currentToken > latestToken ? 1 : -1
            }
            continue
        }

        const currentText = String(currentToken)
        const latestText = String(latestToken)
        const result = currentText.localeCompare(latestText)
        if (result !== 0) {
            return result > 0 ? 1 : -1
        }
    }

    return 0
}

const tokenizeVersion = version => {
    return version
        .split(/[\.\-_]/)
        .filter(Boolean)
        .map(part => (/^\d+$/.test(part) ? Number(part) : part.toLowerCase()))
}

const isCurrentAppVersionLowerThanMin = minVersion => {
    const required = minVersion
    const current = currentAppVersion.value

    if (!required || !current) {
        return false
    }

    return compareVersions(current, required) < 0
}

const resolveNativeHostBadge = host => {
    if (!host.valid) {
        return { className: 'unknown', text: t('sheng-ming-wu-xiao') }
    }
    if (!host.supported) {
        return { className: 'unknown', text: t('ping-tai-bu-zhi-chi') }
    }
    if (host.running) {
        return { className: 'installed', text: t('yun-xing-zhong') }
    }
    if (host.authorized) {
        return { className: 'available', text: t('yi-shou-quan') }
    }
    return { className: 'update', text: t('dai-shou-quan') }
}

const resolveMarketPermissions = plugin => {
    const permissions = plugin?.permissions || {}

    return [
        {
            key: 'networkAccess',
            label: t('lian-wang-fang-wen'),
            icon: 'fas fa-globe',
            enabled: permissions.networkAccess === true
        },
        {
            key: 'fileAccess',
            label: t('wen-jian-fang-wen'),
            icon: 'fas fa-folder-open',
            enabled: permissions.fileAccess === true
        },
        {
            key: 'binaryContent',
            label: t('han-er-jin-zhi'),
            icon: 'fas fa-microchip',
            enabled: permissions.binaryContent === true
        },
        {
            key: 'storageAccess',
            label: t('cun-chu-quan-xian'),
            icon: 'fas fa-database',
            enabled: permissions.storageAccess === true
        }
    ].filter(permission => permission.enabled)
}

const toggleNativeHostAuthorization = async (extension, host) => {
    const nextAuthorized = !host.authorized
    const loadingKey = `${extension.id}:${host.id}`

    if (nextAuthorized) {
        const confirmed = await showConfirm({
            message: buildNativeHostAuthorizationMessage(extension, host),
            messageSize: 'small',
            confirmText: t('tong-yi-shou-quan'),
            cancelText: t('bu-tong-yi')
        })
        if (!confirmed) {
            return
        }
    }

    nativeHostActionLoading.value = loadingKey
    try {
        const result = await window.electronAPI?.setNativeHostAuthorization(extension.id, host.id, nextAuthorized)
        if (!result?.success) {
            throw new Error(result?.message || t('cao-zuo-shi-bai'))
        }
        await refreshExtensions()
    } catch (error) {
        showAlert(t('ben-di-cheng-xu-shou-quan-shi-bai', { error: error?.message || t('wei-zhi-cuo-wu') }))
    } finally {
        nativeHostActionLoading.value = ''
    }
}

const buildNativeHostAuthorizationMessage = (extension, host) => {
    return [
        t('native-host-auth-title', { name: displayPluginName(extension) }),
        host.path,
        '',
        t('native-host-auth-1'),
        t('native-host-auth-2'),
        t('native-host-auth-3'),
        t('native-host-auth-4'),
        '',
        t('native-host-auth-footer')
    ].join('\n')
}

const resolveMarketState = plugin => {
    const installedExtension = findInstalledExtension(plugin)

    if (!plugin.downloadUrl) {
        return {
            action: null,
            badgeClass: 'unknown',
            badgeText: t('que-shao-xia-zai-di-zhi'),
            buttonClass: 'secondary',
            buttonIcon: 'fas fa-ban',
            buttonText: t('wu-fa-an-zhuang')
        }
    }

    if (!installedExtension) {
        return {
            action: 'install',
            badgeClass: 'available',
            badgeText: t('wei-an-zhuang'),
            buttonClass: 'success',
            buttonIcon: 'fas fa-download',
            buttonText: t('an-zhuang-jian')
        }
    }

    const versionDiff = compareVersions(installedExtension.version, plugin.version)
    if (versionDiff < 0) {
        return {
            action: 'update',
            badgeClass: 'update',
            badgeText: t('ke-geng-xin', { from: installedExtension.version, to: plugin.version }),
            buttonClass: 'primary',
            buttonIcon: 'fas fa-arrow-up',
            buttonText: t('geng-xin')
        }
    }

    return {
        action: 'reinstall',
        badgeClass: 'installed',
        badgeText: t('yi-an-zhuang-ban-ben', { version: installedExtension.version }),
        buttonClass: 'secondary',
        buttonIcon: 'fas fa-check',
        buttonText: t('chong-xin-an-zhuang')
    }
}

const handleMarketInstall = async plugin => {
    const installedExtension = findInstalledExtension(plugin)
    const state = resolveMarketState(plugin)
    const pluginDisplayName = displayPluginName(plugin)

    if (!plugin.downloadUrl) {
        showAlert(t('que-shao-xia-zai-wu-fa-an-zhuang'))
        return
    }

    if (installedExtension && state.action === 'reinstall') {
        const confirmed = await showConfirm(t('chong-xin-an-zhuang-que-ren', { name: pluginDisplayName }))
        if (!confirmed) {
            return
        }
    }

    marketActionLoading.value = plugin.uniqueKey

    try {
        const result = await window.electronAPI?.installPluginFromUrl(
            plugin.downloadUrl,
            installedExtension?.id || '',
            installedExtension?.directory || ''
        )

        if (!result?.success) {
            throw new Error(result?.message || t('an-zhuang-shi-bai-jian'))
        }

        await refreshExtensions(true)
        showAlert(
            installedExtension
                ? t('cha-jian-geng-xin-cheng-gong', { name: pluginDisplayName })
                : t('cha-jian-an-zhuang-cheng-gong-ming', { name: pluginDisplayName })
        )
    } catch (error) {
        console.error('Failed to install plugin from market:', error)
        showAlert(t('cha-jian-cao-zuo-shi-bai-ming', {
            name: pluginDisplayName,
            action: installedExtension ? t('geng-xin-dong-zuo') : t('an-zhuang-dong-zuo'),
            error: error?.message || t('wei-zhi-cuo-wu')
        }))
    } finally {
        marketActionLoading.value = ''
    }
}

const openExtensionsDir = async () => {
    try {
        const result = await window.electronAPI?.openExtensionsDir()
        if (!result?.success) {
            console.error('Failed to open plugins directory:', result?.error)
        }
    } catch (error) {
        console.error('Error opening plugins directory:', error)
    }
}

const openPluginsRepo = () => {
    window.open('https://github.com/MoeKoeMusic/MoeKoeMusic-Plugins', '_blank', 'noopener,noreferrer')
}

const openExtensionPopup = async extensionId => {
    try {
        const result = await window.electronAPI?.openExtensionPopup(extensionId)
        if (!result?.success) {
            showAlert(`${t('da-kai-tan-chuang-shi-bai')}: ${result?.message || t('wei-zhi-cuo-wu')}`)
        }
    } catch (error) {
        showAlert(`${t('da-kai-tan-chuang-shi-bai')}: ${error.message}`)
    }
}

const uninstallExtension = async (extensionId, extensionName, extensionDir) => {
    try {
        const confirmed = await showConfirm(t('que-ren-xie-zai-cha-jian').replace('name', extensionName))
        if (!confirmed) {
            return
        }

        const result = await window.electronAPI?.uninstallExtension(extensionId, extensionDir)
        if (result?.success) {
            await refreshExtensions()
        } else {
            showAlert(`${t('xie-zai-cha-jian-shi-bai')}: ${result?.error || t('wei-zhi-cuo-wu')}`)
        }
    } catch (error) {
        showAlert(`${t('xie-zai-cha-jian-shi-bai')}: ${error.message}`)
    }
}

const handleIconError = event => {
    event.target.style.display = 'none'
    const iconContainer = event.target.parentElement
    if (iconContainer && !iconContainer.querySelector('i')) {
        const icon = document.createElement('i')
        icon.className = 'fas fa-puzzle-piece'
        iconContainer.appendChild(icon)
    }
}

const handleMarketIconError = event => {
    event.target.style.display = 'none'
    const iconContainer = event.target.parentElement
    if (iconContainer && !iconContainer.querySelector('i')) {
        const icon = document.createElement('i')
        icon.className = 'fas fa-store'
        iconContainer.appendChild(icon)
    }
}

const installPlugin = async () => {
    try {
        const result = await window.electronAPI?.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: t('cha-jian-bao'), extensions: ['zip'] }
            ]
        })

        if (result?.filePath) {
            await handlePluginInstall(result.filePath)
        }
    } catch (error) {
        showAlert(`${t('xuan-ze-wen-jian-shi-bai')}: ${error.message}`)
    }
}

const handlePluginInstall = async filePath => {
    try {
        extensionsLoading.value = true
        const result = await window.electronAPI?.installPluginFromZip(filePath)
        if (result?.success) {
            showAlert(t('cha-jian-an-zhuang-cheng-gong'))
            await refreshExtensions()
        } else {
            showAlert(`${t('an-zhuang-cha-jian-shi-bai')}: ${result?.message || t('wei-zhi-cuo-wu')}`)
        }
    } catch (error) {
        showAlert(`${t('an-zhuang-cha-jian-chu-cuo')}: ${error.message}`)
    } finally {
        extensionsLoading.value = false
    }
}

const showAlert = message => {
    return window.$modal.alert(message)
}

const showConfirm = async message => {
    return window.$modal.confirm(message)
}

const isElectron = () => {
    return typeof window !== 'undefined' && typeof window.electron !== 'undefined'
}

onMounted(async () => {
    if (isElectron()) {
        currentAppVersion.value = localStorage.getItem('version')
        await refreshExtensions()
    }
})
</script>

<style lang="scss" scoped>
$primary: #2563eb;
$primary-hover: #1d4ed8;
$success: #16a34a;
$success-hover: #15803d;
$secondary: #6b7280;
$secondary-hover: #4b5563;
$danger: #dc2626;
$danger-hover: #b91c1c;
$text-muted: #666;
$border-light: #e5e7eb;
$border-dark: #232527;

.extensions-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 5px;
    margin-bottom: 24px;
    flex-wrap: wrap;
}

.extensions-tabs {
    display: flex;
    gap: 8px;
    padding: 6px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.12);

    .tab-btn {
        border: none;
        background: transparent;
        color: var(--text-color, #333);
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;

        &.active {
            background: var(--color-primary, #ff69b4);
            color: #fff;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        }
        
        &:is(.dark .tab-btn) {
            color: #f3f4f6;

            &.active {
                background: var(--color-primary, #ff69b4);
                color: #fff;
            }
        }
    }
}

.extensions-actions,
.market-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
}

.market-search {
    display: flex;
    align-items: center;
    padding: 0 14px;
    height: 40px;
    border-radius: 10px;
    border: 1px solid var(--border-color, #d9d9d9);
    background: var(--background-color, #fff);

    i {
        color: #888;
    }

    input {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        color: var(--text-color, #333);
        font-size: 14px;
    }

    &:is(.dark .market-search) {
        background-color: #222;
        border-color: $border-dark;

        i,
        input {
            color: #f3f4f6;
        }
    }
}

.extension-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;

    &:disabled {
        opacity: 0.65;
        cursor: not-allowed;
    }

    &.primary {
        background: $primary;
        color: white;

        &:hover:not(:disabled) {
            background: $primary-hover;
        }
    }

    &.success {
        background: $success;
        color: white;

        &:hover:not(:disabled) {
            background: $success-hover;
        }
    }

    &.secondary {
        background: $secondary;
        color: white;

        &:hover:not(:disabled) {
            background: $secondary-hover;
        }
    }

    &.danger {
        background: $danger;
        color: white;

        &:hover:not(:disabled) {
            background: $danger-hover;
        }
    }

    &.small {
        padding: 6px 10px;
        font-size: 12px;
    }
}

.extensions-list,
.market-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.extension-item,
.market-item {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 18px;
    border: 1px solid var(--border-color, $border-light);
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(247, 247, 247, 0.98));
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);

    &:is(.dark .extension-item, .dark .market-item) {
        border-color: $border-dark;
        background: linear-gradient(135deg, rgba(23, 23, 23, 0.92), rgba(32, 32, 32, 0.98));
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
    }
}

.extension-info,
.market-title-group {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    min-width: 0;
}

.extension-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    border-radius: 12px;
    font-size: 22px;
    overflow: hidden;
    flex-shrink: 0;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
}

.extension-details,
.market-title-text {
    min-width: 0;

    h4 {
        margin: 0 0 6px 0;
        font-size: 16px;
        color: var(--text-color, #222);

        .market-title-link {
            color: inherit;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }
        }

    }

    p {
        margin: 0;
        font-size: 13px;
        color: $text-muted;
    }

    &:is(.dark .extension-details, .dark .market-title-text) {
        h4 {
            color: rgba(255, 255, 255, 0.9);
        }

        p {
            color: rgba(255, 255, 255, 0.74);
        }
    }
}

.market-min-version-inline {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    margin-left: 8px;
    border-radius: 999px;
    border: 1px solid rgba(180, 83, 9, 0.28);
    background: rgba(180, 83, 9, 0.12);
    color: #b45309;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    position: relative;
    top: -3px;
}

.extension-description {
    max-width: 480px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.extension-version {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    a {
        color: $primary;
        text-decoration: none;
    }
}

.extension-compatibility-warning {
    color: #b45309 !important;
    font-size: 12px !important;
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
}

.installed-warning {
    margin: 0;
}

.native-host-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid rgba(180, 83, 9, 0.22);
    background: rgba(180, 83, 9, 0.08);
}

.native-host-title,
.native-host-row,
.native-host-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.native-host-title {
    color: #92400e;
    font-size: 13px;
    font-weight: 700;
}

.native-host-row {
    justify-content: space-between;
    flex-wrap: wrap;
}

.native-host-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;

    strong {
        color: var(--text-color, #222);
        font-size: 13px;
    }

    span {
        color: $text-muted;
        font-size: 12px;
        word-break: break-all;
    }

    &:is(.dark .native-host-info) {
        strong {
            color: rgb(112, 112, 112);
        }
    }
}

.extension-actions,
.market-status-group {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.extension-status,
.market-badge {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;

    &.enabled,
    &.installed {
        background: #dcfce7;
        color: #166534;
    }

    &.available {
        background: #e0f2fe;
        color: #075985;
    }

    &.update {
        background: #fef3c7;
        color: #92400e;
    }

    &.unknown {
        background: #f3f4f6;
        color: #4b5563;
    }

    &:is(.dark .extension-status, .dark .market-badge) {

        &.enabled,
        &.installed {
            background: #166534;
            color: #dcfce7;
        }

        &.available {
            background: #075985;
            color: #e0f2fe;
        }

        &.update {
            background: #92400e;
            color: #fef3c7;
        }

        &.unknown {
            background: #4b5563;
            color: #f3f4f6;
        }
    }
}

.market-panel {
    min-height: 240px;
}

.market-item {
    flex-direction: column;

    &-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
    }
}

.market-meta {
    margin: 0;
    font-size: 13px;
    color: $text-muted;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    align-items: center;

    span {
        min-width: 0;
    }

    .author-meta {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        max-width: 220px;
        white-space: nowrap;

        a {
            color: $primary;
            text-decoration: none;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }

    a {
        color: $primary;
        text-decoration: none;
    }
}

.market-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.market-permissions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.market-tag {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    background: rgba(37, 99, 235, 0.1);
    color: #1d4ed8;
}

.permission-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 11px;
    line-height: 1.25;
    background: #fef3c7;
    color: #92400e;
}

.market-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 8px;
}

.extensions-empty,
.extensions-loading,
.market-feedback {
    text-align: center;
    padding: 48px 20px;
    color: $text-muted;

    h4 {
        margin: 0 0 8px 0;
        color: var(--text-color, #333);
    }

    p {
        margin: 0 0 20px 0;
    }
}

.market-feedback.error {
    border: 1px solid rgba(220, 38, 38, 0.15);
    border-radius: 14px;
    background: rgba(254, 242, 242, 0.85);
}

.empty-icon {
    font-size: 48px;
    color: #c4c4c4;
    margin-bottom: 16px;
}

.extensions-loading i {
    font-size: 24px;
    margin-bottom: 12px;
}

@media (max-width: 768px) {

    .extensions-toolbar,
    .market-item-header {
        flex-direction: column;
        align-items: stretch;
    }

    .extensions-tabs,
    .market-actions,
    .extensions-actions,
    .market-search {
        width: 100%;
    }

    .market-search {
        min-width: 0;
    }

    .extension-actions,
    .market-status-group {
        justify-content: flex-start;
    }
}
</style>
