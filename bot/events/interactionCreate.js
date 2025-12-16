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
                await interaction.reply({ content: 'Du bist nicht berechtigt, diesen Befehl zu nutzen.', ephemeral: true });
                return;
            }

            await command.execute(interaction);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (!interaction.isRepliable || !interaction.isRepliable()) return;

            const payload = { content: 'Es ist ein Fehler aufgetreten.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload);
            } else {
                await interaction.reply(payload);
            }
        }
    },
};
