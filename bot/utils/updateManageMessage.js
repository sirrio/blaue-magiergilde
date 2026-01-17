const EPHEMERAL_FLAG = 64;

async function updateManageMessage(interaction, payload, options = {}) {
    if (interaction?.isMessageComponent?.()) {
        try {
            await interaction.update(payload);
            return;
        } catch {
            // Fall through to reply-based update when message no longer exists.
        }
    }

    const ephemeralFlag = options.ephemeralFlag ?? EPHEMERAL_FLAG;

    if (interaction?.isModalSubmit?.() && !interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: ephemeralFlag });
    }

    let updatedMessage = false;
    if (interaction?.message?.editable) {
        try {
            await interaction.message.edit(payload);
            updatedMessage = true;
        } catch {
            updatedMessage = false;
        }
    }

    if (!updatedMessage && interaction?.isRepliable?.()) {
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(payload).catch(() => {});
        } else {
            await interaction.reply({ ...payload, flags: ephemeralFlag }).catch(() => {});
        }
    }

    if (interaction?.deferred || interaction?.replied) {
        await interaction.deleteReply().catch(() => {});
    }
}

module.exports = { updateManageMessage };
