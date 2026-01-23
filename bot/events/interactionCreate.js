const { Events } = require('discord.js');

const { isOwner } = require('../commandConfig');
const appJoin = require('../interactions/appJoin');
const characters = require('../interactions/characters');
const newGame = require('../interactions/newGame');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (await appJoin.handle(interaction)) return;
            if (await characters.handle(interaction)) return;
            if (await newGame.handle(interaction)) return;

            if (!interaction.isChatInputCommand()) return;

            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            if (command.ownerOnly && !isOwner(interaction.user.id)) {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: 64 });
                }
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: 'You are not allowed to use this command.', components: [] });
                }
                return;
            }

            await command.execute(interaction);
        } catch (error) {
             
            console.error(error);
            if (!interaction.isRepliable || !interaction.isRepliable()) return;
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: 64 });
            }
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: 'An error occurred.', components: [] });
            }
        }
    },
};
