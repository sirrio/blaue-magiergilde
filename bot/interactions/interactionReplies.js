const { MessageFlags } = require('discord.js');

async function updateCreationReply(state, payload) {
    const interaction = state?.promptInteraction;
    if (!interaction || !interaction.isRepliable?.()) return;

    if (interaction.isMessageComponent?.() && !interaction.replied && !interaction.deferred) {
        await interaction.update(payload);
        return;
    }

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply(payload);
        return;
    }

    const replyPayload = {
        ...payload,
        flags: payload?.flags ?? MessageFlags.Ephemeral,
    };

    await interaction.reply(replyPayload);
}

module.exports = { updateCreationReply };
