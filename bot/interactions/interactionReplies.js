async function updateCreationReply(state, payload) {
    const interaction = state?.activeInteraction || state?.promptInteraction;
    if (!interaction || !interaction.isRepliable?.()) return false;

    if (interaction.isMessageComponent?.() && !interaction.replied && !interaction.deferred) {
        try {
            await interaction.update(payload);
            return true;
        } catch {
            // fall through to editReply
        }
    }

    if (interaction.replied || interaction.deferred) {
        try {
            await interaction.editReply(payload);
            return true;
        } catch {
            return false;
        }
    }

    return false;
}

module.exports = { updateCreationReply };
