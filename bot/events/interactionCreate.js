const { Events } = require('discord.js');

function isUnknownInteractionError(error) {
    return error?.code === 10062 || error?.rawError?.code === 10062;
}

function interactionModules() {
    return {
        appJoin: require('../interactions/appJoin'),
        characterApproval: require('../interactions/characterApproval'),
        characters: require('../interactions/characters'),
        hiddenBid: require('../interactions/hiddenBid'),
        newGame: require('../interactions/newGame'),
        reactionDraw: require('../interactions/reactionDraw'),
        supportTickets: require('../supportTickets'),
        noticeEmbeds: require('../utils/noticeEmbeds'),
    };
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) return;

                await command.execute(interaction);
                return;
            }

            const {
                appJoin,
                characterApproval,
                characters,
                hiddenBid,
                newGame,
                reactionDraw,
                supportTickets,
            } = interactionModules();

            if (await supportTickets.handleSupportTicketInteraction(interaction)) return;
            if (await appJoin.handle(interaction)) return;
            if (await characterApproval.handle(interaction)) return;
            if (await characters.handle(interaction)) return;
            if (await hiddenBid.handle(interaction)) return;
            if (await newGame.handle(interaction)) return;
            if (await reactionDraw.handle(interaction)) return;
        } catch (error) {
             
            console.error(error);
            if (!interaction.isRepliable || !interaction.isRepliable()) return;
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: 64 });
                }
                if (interaction.deferred || interaction.replied) {
                    const { noticeEmbeds } = interactionModules();
                    await interaction.editReply({
                        content: '',
                        embeds: [noticeEmbeds.buildErrorEmbed('Unexpected error', 'An error occurred.')],
                        components: [],
                    });
                }
            } catch (replyError) {
                if (!isUnknownInteractionError(replyError)) {
                    throw replyError;
                }
            }
        }
    },
};
