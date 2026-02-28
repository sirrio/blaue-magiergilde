const { Events } = require('discord.js');

const appJoin = require('../interactions/appJoin');
const characterApproval = require('../interactions/characterApproval');
const characters = require('../interactions/characters');
const hiddenBid = require('../interactions/hiddenBid');
const newGame = require('../interactions/newGame');
const { handleSupportTicketInteraction } = require('../supportTickets');
const { buildErrorEmbed } = require('../utils/noticeEmbeds');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (await handleSupportTicketInteraction(interaction)) return;
            if (await appJoin.handle(interaction)) return;
            if (await characterApproval.handle(interaction)) return;
            if (await characters.handle(interaction)) return;
            if (await hiddenBid.handle(interaction)) return;
            if (await newGame.handle(interaction)) return;

            if (!interaction.isChatInputCommand()) return;

            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            await command.execute(interaction);
        } catch (error) {
             
            console.error(error);
            if (!interaction.isRepliable || !interaction.isRepliable()) return;
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: 64 });
            }
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: '',
                    embeds: [buildErrorEmbed('Unexpected error', 'An error occurred.')],
                    components: [],
                });
            }
        }
    },
};
