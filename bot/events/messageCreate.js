const { handleCreationAvatarMessage, handleAvatarUpdateMessage } = require('../interactions/characters');
const { handleSupportTicketMessage } = require('../supportTickets');
const { pendingCharacterCreations, pendingCharacterAvatarUpdates } = require('../state');
const { reportBotError } = require('../utils/reportError');

function hasPendingAvatarFlow(message) {
    if (!message || message.guildId || !message.author?.id) {
        return false;
    }

    const userId = String(message.author.id);
    if (pendingCharacterAvatarUpdates.has(userId)) {
        return true;
    }

    const creationState = pendingCharacterCreations.get(userId);
    return Boolean(creationState && creationState.step === 'avatar');
}

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        try {
            const handledUpdate = await handleAvatarUpdateMessage(message);
            if (handledUpdate) {
                return;
            }

            const handledCreation = await handleCreationAvatarMessage(message);
            if (handledCreation) {
                return;
            }

            if (hasPendingAvatarFlow(message)) {
                return;
            }

            await handleSupportTicketMessage(message);
        } catch (error) {
            console.error('[bot] Failed to handle messageCreate flow.', error);
            void reportBotError(error, 'message_error', {
                channel_id: message.channelId ?? null,
                guild_id: message.guildId ?? null,
                author_id: message.author?.id ?? null,
            });
        }
    },
};
