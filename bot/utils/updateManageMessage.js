const EPHEMERAL_FLAG = 64;

async function updateManageMessage(interaction, payload, options = {}) {
    const sanitizedPayload = payload ? { ...payload } : payload;
    if (sanitizedPayload && 'flags' in sanitizedPayload) {
        delete sanitizedPayload.flags;
    }

    if (interaction?.isMessageComponent?.()) {
        try {
            await interaction.update(sanitizedPayload);
            return;
        } catch {
            return;
        }
    }

    const ephemeralFlag = options.ephemeralFlag ?? EPHEMERAL_FLAG;

    if (interaction?.isModalSubmit?.() && !interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: ephemeralFlag });
    }

    let updatedMessage = false;
    if (interaction?.message?.editable) {
        try {
            await interaction.message.edit(sanitizedPayload);
            updatedMessage = true;
        } catch {
            updatedMessage = false;
        }
    }

    if (!updatedMessage && interaction?.isRepliable?.()) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: ephemeralFlag });
        }

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(sanitizedPayload).catch(() => {});
        }
    }

    if (interaction?.deferred || interaction?.replied) {
        await interaction.deleteReply().catch(() => {});
    }
}

module.exports = { updateManageMessage };
