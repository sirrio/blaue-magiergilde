const EPHEMERAL_FLAG = 64;
const { getManageMessageTarget, setManageMessageTarget } = require('./manageMessageTarget');

async function updateManageMessage(interaction, payload, options = {}) {
    const sanitizedPayload = payload ? { ...payload } : payload;
    if (sanitizedPayload && 'flags' in sanitizedPayload) {
        delete sanitizedPayload.flags;
    }

    const isModalSubmit = interaction?.isModalSubmit?.();
    if (interaction?.isMessageComponent?.()) {
        try {
            await interaction.update(sanitizedPayload);
            return;
        } catch {
            // fall through to other update paths
        }
    }

    const ephemeralFlag = options.ephemeralFlag ?? EPHEMERAL_FLAG;

    if (isModalSubmit && !interaction.deferred && !interaction.replied) {
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

    if (!updatedMessage) {
        const target = getManageMessageTarget(interaction?.user?.id);
        if (target?.interaction?.editReply) {
            try {
                await target.interaction.editReply(sanitizedPayload);
                updatedMessage = true;
            } catch {
                updatedMessage = false;
            }
        }
    }

    if (!updatedMessage) {
        const target = getManageMessageTarget(interaction?.user?.id);
        if (target && interaction?.client) {
            try {
                const channel = await interaction.client.channels.fetch(target.channelId);
                if (channel?.isTextBased?.()) {
                    const message = await channel.messages.fetch(target.messageId);
                    if (message?.editable) {
                        await message.edit(sanitizedPayload);
                        updatedMessage = true;
                    }
                }
            } catch {
                updatedMessage = false;
            }
        }
    }

    if (!updatedMessage && interaction?.isRepliable?.()) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: ephemeralFlag });
        }

        if (interaction.deferred || interaction.replied) {
            try {
                await interaction.editReply(sanitizedPayload);
                updatedMessage = true;
            } catch {
                updatedMessage = false;
            }
        }
    }

    if (!updatedMessage && interaction?.channel?.isTextBased?.()) {
        try {
            const message = await interaction.channel.send(sanitizedPayload);
            if (message && interaction.user?.id) {
                setManageMessageTarget({ message, user: interaction.user });
            }
        } catch {
            // ignore final send failure
        }
    }

    if (isModalSubmit && (interaction?.deferred || interaction?.replied)) {
        await interaction.deleteReply().catch(() => undefined);
    }
}

module.exports = { updateManageMessage };
