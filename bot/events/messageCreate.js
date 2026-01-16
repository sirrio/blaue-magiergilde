const { handleCreationAvatarMessage, handleAvatarUpdateMessage } = require('../interactions/characters');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        try {
            const handledUpdate = await handleAvatarUpdateMessage(message);
            if (handledUpdate) return;
            await handleCreationAvatarMessage(message);
        } catch (error) {
            console.error('[bot] Failed to handle avatar upload message.', error);
        }
    },
};
