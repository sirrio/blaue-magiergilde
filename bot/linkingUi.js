const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

function notLinkedContent() {
    return [
        '**Dein Discord ist noch nicht mit der Blaue Magiergilde App verbunden.**',
        '',
        'Damit der Bot *deine bestehenden Charaktere* verwalten kann, musst du Discord einmalig mit deinem App-Account verbinden.',
        '',
        'Wenn du **noch keinen** Account hast, kannst du hier einen neuen App-Account erstellen (mit deiner Discord-ID).',
        '',
        '**Wichtig:** Wenn du die App bereits nutzt, *erstelle keinen neuen Account*, sondern verbinde Discord in deinem Profil.',
    ].join('\n');
}

function buildNotLinkedButtons(discordUserId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`appJoinStart_${discordUserId}`)
            .setLabel('Account erstellen (Join)')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`appLinkInfo_${discordUserId}`)
            .setLabel('Ich habe schon einen Account')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildJoinConfirmButtons(discordUserId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`appJoinConfirm_${discordUserId}`)
            .setLabel('Ja, Account erstellen')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`appJoinCancel_${discordUserId}`)
            .setLabel('Abbrechen')
            .setStyle(ButtonStyle.Secondary),
    );
}

async function replyNotLinked(interaction) {
    await interaction.reply({
        content: notLinkedContent(),
        components: [buildNotLinkedButtons(interaction.user.id)],
        flags: MessageFlags.Ephemeral,
    });
}

module.exports = {
    replyNotLinked,
    buildNotLinkedButtons,
    buildJoinConfirmButtons,
    notLinkedContent,
};
