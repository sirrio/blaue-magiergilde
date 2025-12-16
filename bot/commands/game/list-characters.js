const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { commandName } = require('../../commandConfig');
const { DiscordNotLinkedError, listCharactersForDiscord } = require('../../appDb');
const { replyNotLinked } = require('../../linkingUi');

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
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'Bitte nutze diesen Befehl in einem Server (nicht in DMs).', flags: MessageFlags.Ephemeral });
            return;
        }

        let characters;
        try {
            characters = await listCharactersForDiscord(interaction.user);
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return;
            }
            throw error;
        }

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
