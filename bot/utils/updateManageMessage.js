const EPHEMERAL_FLAG = 64;

async function updateManageMessage(interaction, payload, options = {}) {
    if (interaction?.isMessageComponent?.()) {
        await interaction.update(payload);
        return;
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
