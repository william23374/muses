import { h, reactive, ref, render } from 'vue';
import { get, post } from '@/utils/request';
import i18n from '@/utils/i18n';
import TeamEvent from '@/components/TeamEvent.vue';

const teamEventPopupOpened = ref(false);
const currentPeriod = ref(0);
const eventStatus = reactive({
    periodInfo: null,
    my: {
        info: null,
        status: null,
        teams: {
            created: null,
            joined: null
        }
    },
    refreshLock: false
});

const t = (key, params) => i18n.global.t(key, params);

const getMyTeam = () => {
    // 目前每人都只能同时创建和加入一个队伍
    // 所以直接这样写
    eventStatus.my.teams.created = !!eventStatus.my.status?.is_create_team && eventStatus.my.info?.my_create_team_list[0];
    eventStatus.my.teams.joined = !!eventStatus.my.status?.is_join_team && eventStatus.my.info?.my_join_team_list[0];
}

const refreshStatus = async () => {
    const periodInfo = await get('/team/period/info');
    eventStatus.periodInfo = periodInfo.data;
    currentPeriod.value = eventStatus.periodInfo?.current_period_info?.id || 0;
    if (!periodInfo.status || currentPeriod.value === 0) {
        window.$modal.alert(t('huo-qu-zu-dui-huo-dong-shi-bai', { msg: periodInfo.error_msg }));
        console.error('[组队活动] 获取当期组队活动失败, 错误码:', periodInfo.error_code);
        return;
    }
    console.log('[组队活动] 当期组队活动 id:', currentPeriod.value);
    eventStatus.my.status = (await get(`/team/my/status?period_id=${currentPeriod.value}`)).data;
    eventStatus.my.info = (await get(`/team/my/info?period_id=${currentPeriod.value}`)).data;
    getMyTeam();
}

const createTeam = async () => {
    if (currentPeriod.value === 0) return;
    return await get(`/team/my?period_id=${currentPeriod.value}`);
}

const joinTeam = async (team_code) => {
    if (!team_code) return;
    return await post('/team/join', { team_code });
}

const generateShareText = (teamCode) => {
    return window.electron
        ? t('zu-dui-yao-qing-lian-jie', { code: teamCode })
        : t('zu-dui-yao-qing-ma', { code: teamCode });
}

const copyTeamCode = async (teamCode) => {
    try {
        if (!teamCode) throw new Error('team code can\'t be empty');
        await navigator.clipboard.writeText(generateShareText(teamCode));
        window.$message.success(t('yao-qing-ma-yi-fu-zhi'));
    } catch (e) {
        window.$message.error(t('fu-zhi-shi-bai'));
        console.error('[组队活动] 复制邀请码失败:', e);
    }
}

const createTeamWithToast = async () => {
    try {
        const res = await createTeam();
        if (res.data?.team_id) {
            window.$message.success(t('chuang-jian-dui-wu-cheng-gong'));
            await refreshStatus();
        } else {
            window.$message.error(res.error_msg || t('chuang-jian-dui-wu-shi-bai'));
            console.error('[组队活动] 创建队伍失败:', res);
        }
    } catch (e) {
        if (e.response?.data?.team_id) {
            window.$message.success(t('chuang-jian-dui-wu-cheng-gong'));
            await refreshStatus();
            return;
        }
        window.$message.error(e.response?.data?.error_msg || t('chuang-jian-dui-wu-shi-bai'));
        console.error('[组队活动] 创建队伍失败:', e);
    }
}

const joinTeamWithToast = async (code = null) => {
    const team_code = code ? code : await window.$modal.prompt(t('shu-ru-dui-wu-ma'));
    if (!team_code) return;
    try {
        const res = await joinTeam(team_code);
        if (!res.error_code) {
            window.$message.success(t('jia-ru-dui-wu-cheng-gong'));
            await refreshStatus();
        } else {
            window.$message.error(res.error_msg || t('jia-ru-dui-wu-shi-bai'));
            console.error('[组队活动] 加入队伍失败:', res);
        }
    }
    catch (e) {
        window.$message.error(e.response?.data?.error_msg || t('jia-ru-dui-wu-shi-bai'));
        console.error('[组队活动] 加入队伍失败:', e);
    }
}

const refreshStatusWithToast = () => {
    eventStatus.refreshLock = true;
    refreshStatus().then(() => window.$message.success(t('shua-xin-cheng-gong'))).catch(e => {
        window.$message.error(t('shua-xin-shi-bai'));
        console.error('[组队活动] 手动刷新状态失败:', e);
    });
    setTimeout(() => eventStatus.refreshLock = false, 1500);
}

export const actions = {
    copyTeamCode,
    createTeam: createTeamWithToast,
    joinTeam: joinTeamWithToast,
    refreshStatus: refreshStatusWithToast
}

export const createTeamEventPopup = async () => {
    if (teamEventPopupOpened.value) return;
    await refreshStatus().catch(e => console.error('[组队活动] 状态初始化失败:', e));
    const container = document.createElement('div');
    container.id = 'team-event';
    document.body.append(container);
    const closePopup = () => {
        container.remove();
        teamEventPopupOpened.value = false;
    }
    const vnode = h(TeamEvent, { ...actions, closePopup, status: eventStatus });
    render(vnode, container);
    teamEventPopupOpened.value = true;
}
