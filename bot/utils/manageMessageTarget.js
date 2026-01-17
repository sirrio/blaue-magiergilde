const { manageMessageTargets } = require('../state');

function setManageMessageTarget(interaction) {
    if (!interaction?.message || !interaction?.user?.id) return;
    const channelId = interaction.message.channelId;
    const messageId = interaction.message.id;
    if (!channelId || !messageId) return;
    manageMessageTargets.set(String(interaction.user.id), { channelId, messageId, interaction });
}

function getManageMessageTarget(userId) {
    if (!userId) return null;
    return manageMessageTargets.get(String(userId)) || null;
}

module.exports = { setManageMessageTarget, getManageMessageTarget };
