const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { commandName } = require('../../commandConfig');
const { listCharactersForDiscord } = require('../../appDb');

function splitIntoMessages(lines, maxLength = 1900) {
    const messages = [];
    let current = '';

    for (const line of lines) {
        const candidate = current.length === 0 ? line : `${current}\n${line}`;
        if (candidate.length > maxLength) {
            if (current.length > 0) messages.push(current);
            current = line;
            continue;
        }
        current = candidate;
    }

    if (current.length > 0) messages.push(current);
    return messages;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('list-characters'))
        .setDescription('Liste deiner Charaktere (aus der App).'),
    async execute(interaction) {
        const characters = await listCharactersForDiscord(interaction.user);

        if (characters.length === 0) {
            await interaction.reply({ content: 'Keine Charaktere gefunden.', flags: MessageFlags.Ephemeral });
            return;
        }

        const lines = characters.map(c => `${c.id}: ${c.name} [${c.start_tier}] - ${c.external_link}`);
        const messages = splitIntoMessages(lines);

        await interaction.reply({ content: `Deine Charaktere:\n${messages[0]}`, flags: MessageFlags.Ephemeral });
        for (let i = 1; i < messages.length; i++) {
            // eslint-disable-next-line no-await-in-loop
            await interaction.followUp({ content: messages[i], flags: MessageFlags.Ephemeral });
        }
    },
};
