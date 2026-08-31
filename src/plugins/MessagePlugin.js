import { createApp, ref } from 'vue';
import MessageNotification from '@/components/MessageNotification.vue';

export default {
    install() {
        const messageInstance = ref(null);

        const mountMessage = () => {
            if (!messageInstance.value) {
                const MessageComponent = createApp(MessageNotification);
                const div = document.createElement('div');
                document.body.appendChild(div);
                messageInstance.value = MessageComponent.mount(div);
            }
        };

        // Create message method
        const message = (content, type = 'default', duration = 3000) => {
            mountMessage();
            return messageInstance.value.addMessage(content, type, duration);
        };

        // Create typed message methods
        const success = (content, duration = 3000) => {
            mountMessage();
            return messageInstance.value.success(content, duration);
        };

        const error = (content, duration = 3000) => {
            mountMessage();
            return messageInstance.value.error(content, duration);
        };

        const warning = (content, duration = 3000) => {
            mountMessage();
            return messageInstance.value.warning(content, duration);
        };

        const info = (content, duration = 3000) => {
            mountMessage();
            return messageInstance.value.info(content, duration);
        };

        // Mount methods globally
        window.$message = {
            message,
            success,
            error,
            warning,
            info
        };
    },
};