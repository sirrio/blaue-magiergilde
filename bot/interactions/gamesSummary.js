const { MessageFlags } = require('discord.js');
const {
    fetchUpcomingGames,
    buildGamesEmbed,
    resolveTierEmojis,
} = require('../commands/game/games');
const { SUMMARY_BUTTON_ID } = require('../gamesSummaryPoster');

async function handle(interaction) {
    if (!interaction.isButton?.()) return false;
    if (interaction.customId !== SUMMARY_BUTTON_ID) return false;

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    let games = [];
    try {
        games = await fetchUpcomingGames(20);
    } catch (error) {
        console.warn('[bot] Games summary button: failed to load games:', error?.message || error);
        await interaction.editReply({
            content: 'Konnte die Spieleliste gerade nicht laden. Bitte später erneut versuchen.',
            embeds: [],
            components: [],
        });
        return true;
    }

    const tierEmojis = resolveTierEmojis(interaction.client);
    const embed = buildGamesEmbed(games, { tierEmojis });

    await interaction.editReply({
        content: '',
        embeds: [embed],
        components: [],
    });

    return true;
}

module.exports = { handle };
