const { handleCreationAvatarMessage } = require('../interactions/characters');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        try {
            await handleCreationAvatarMessage(message);
        } catch (error) {
            console.error('[bot] Failed to handle avatar upload message.', error);
        }
    },
};
