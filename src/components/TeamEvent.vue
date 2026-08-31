<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MusesAuthStore } from '@/stores/store';

const { t } = useI18n();
const authStore = MusesAuthStore();

const { closePopup, status, copyTeamCode, createTeam, joinTeam, refreshStatus } = defineProps({
    closePopup: Function,
    status: Object,
    copyTeamCode: Function,
    createTeam: Function,
    joinTeam: Function,
    refreshStatus: Function
});

const popupRef = ref(null);

const closeWithAnimation = () => {
    popupRef.value?.classList.add('close');
    setTimeout(closePopup, 300);
}

const badgeLabel = computed(() => {
    if (!authStore.isAuthenticated) return '';
    const periodName = status.my.info?.period_info.name;
    const roleName = status.my.status?.is_create_team && t('dui-zhang') ||
                     status.my.status?.is_join_team && t('dui-yuan') ||
                     t('fang-ke');
    return `${periodName} ${roleName}`;
});
</script>

<template>
    <div class="mask" @click="closeWithAnimation"></div>
    <div class="popup" ref="popup">
        <div class="my-info">
            <div class="avatar-and-info">
                <img class="avatar" draggable="false" :src="authStore.UserInfo?.pic || './assets/images/profile.jpg'" />
                <span class="info">
                    <span class="nick">{{ authStore.UserInfo?.nickname || t('wei-deng-lu') }}</span>
                    <span class="badge">{{ badgeLabel }}</span>
                </span>
            </div>
            <div class="btns">
                <button class="act-btn" type="button" :title="t('shua-xin')" :disabled="status.refreshLock" @click="refreshStatus"><i class="fas fa-refresh" /></button>
                <button class="act-btn" type="button" :title="t('guan-bi')" @click="closeWithAnimation"><i class="fas fa-xmark" /></button>
            </div>
        </div>
        <span class="title">{{ t('wo-de-dui-wu') }}</span>
        <template v-if="!!status.my.status?.is_create_team || !!status.my.status?.is_join_team">
            <div v-if="!!status.my.status?.is_create_team" class="my-team">
                <span class="sub-title">{{ t('wo-chuang-jian-de-dui-wu', { n: status.my.teams.created?.member_list.length || 0 }) }}</span>
                <div class="members">
                    <img draggable="false" v-for="m in status.my.teams.created?.member_list" :src="m.user_pic" :title="m.nick_name" />
                    <span v-if="status.my.teams.created?.member_list.length < 3" class="invite" :title="t('fu-zhi-yao-qing-ma')" @click="() => copyTeamCode(status.my.teams.created?.team_code)"><i class="fas fa-plus" /></span>
                </div>
            </div>
            <div v-if="!!status.my.status?.is_join_team" class="my-team">
                <span class="sub-title">{{ t('wo-jia-ru-de-dui-wu', { n: status.my.teams.joined?.member_list.length || 0 }) }}</span>
                <div class="members">
                    <img draggable="false" v-for="m in status.my.teams.joined?.member_list" :src="m.user_pic" :title="m.nick_name" />
                    <span v-if="status.my.teams.joined?.member_list.length < 3" class="invite" :title="t('fu-zhi-yao-qing-ma')" @click="() => copyTeamCode(status.my.teams.joined?.team_code)"><i class="fas fa-plus" /></span>
                </div>
            </div>
        </template>
        <div v-else>{{ authStore.isAuthenticated ? t('hai-mei-you-dui-wu-ne') : t('deng-lu-hou-cai-neng-can-yu') }}</div>
        <span class="title">{{ t('huo-dong-xin-xi') }}</span>
        <template v-if="status.periodInfo" v-for="(info, period) in status.periodInfo" :key="period">
            <div v-if="info.name" class="period-card" :class="period">
                <span class="title">
                    {{ info.name }} {{ info.status_name }}
                </span>
                <div class="banner">
                    <div v-if="period === 'current_period_info'">
                        <div class="btns">
                            <button class="primary" type="button" :disabled="!authStore.isAuthenticated || !!status.my.status?.is_create_team" @click="createTeam">{{ t('chuang-jian-dui-wu') }}</button>
                            <button type="button" :disabled="!authStore.isAuthenticated || !!status.my.status?.is_join_team" @click="() => joinTeam()">{{ t('jia-ru-dui-wu') }}</button>
                        </div>
                    </div>
                    <span class="text" v-else>{{ t('gai-qi-huo-dong-yi-jie-shu') }}</span>
                </div>
                <span class="time">
                    {{ t('huo-dong-shi-jian', { start: info.start_time, end: info.end_time }) }}
                </span>
            </div>
        </template>
        <div v-else>{{ t('shao-nv-qi-dao-zhong') }}</div>
    </div>
</template>

<style lang="scss" scoped>
@keyframes popup-slidein {
    from { translate: 80%; }
    to { translate: 0; }
}

@keyframes popup-slideout {
    from { translate: 0; }
    to { translate: 100%; }
}

.mask {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.35);
    z-index: 100;
    backdrop-filter: blur(8px);
}

.title {
    font-weight: bold;
}

.my-info {
    display: flex;
    justify-content: space-between;
    >.avatar-and-info {
        display: flex;
        gap: 0.8rem;
        >.avatar {
            width: 45px;
            height: 45px;
            border-radius: 100%;
        }
        >.info {
            display: flex;
            flex-direction: column;
            >.nick {
                font-weight: 500;
            }
            >.badge {
                font-size: 0.8rem;
            }
        }
    }
    >.btns>.act-btn {
        color: var(--text-color);
        cursor: pointer;
        border: none;
        background-color: transparent;
        font-size: 1.2rem;
        &:hover {
            opacity: 0.6;
        }
        &:disabled {
            cursor: not-allowed;
            opacity: 0.2;
        }
    }
}

.my-team {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    >.sub-title {
        font-size: 0.8rem;
    }
    >.members {
        display: flex;
        >img {
            width: 32px;
            height: 32px;
            border-radius: 100%;
        }
        >.invite {
            cursor: pointer;
            width: 32px;
            height: 32px;
            border: 1px dashed;
            border-radius: 100%;
            >i {
                padding: 9px;
            }
        }
    }
}

.popup {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background-color: var(--background-color);
    padding: 1rem;
    position: absolute;
    top: 0;
    right: 0;
    width: max(20%, 350px);
    height: 100%;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    z-index: 101;
    animation: popup-slidein .3s forwards;

    &.close {
        animation: popup-slideout .3s forwards;
    }

    .period-card {
        color: #000;
        height: 80px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 8px;
        border-radius: 8px;
        border-color: var(--border-color);
        box-shadow: 2px 2px 2px var(--color-box-shadow);

        &.current_period_info {
            background-image: linear-gradient(280deg,#ff9a9e 0%, #fecfef 99%, #fecfef 100%);
        }
        &.last_period_info {
            background-image: linear-gradient(0deg,#cfd9df 0%, #e2ebf0 100%);
        }
        >.title {
            font-size: 1.2rem;
            font-weight: bold;
        }
        >.banner {
            padding: 0.4rem 0;
            text-align: center;

            .text {
                font-style: italic;
            }

            .btns {
                display: flex;
                gap: 0.4rem;
                justify-content: center;

                >button {
                    border: 1px solid #0001;
                    border-radius: 2px;
                    cursor: pointer;
                    &.primary {
                        color: #fff;
                        background-color: var(--primary-color);
                        box-shadow: 2px 2px 2px var(--color-box-shadow);
                    }
                    &:disabled {
                        opacity: 0.2;
                        cursor: not-allowed;
                    }
                }
            }
        }
        >.time {
            font-size: 0.8rem;
        }
    }
}
</style>
