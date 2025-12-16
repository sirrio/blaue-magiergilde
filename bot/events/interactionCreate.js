const {
    Events,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const { pendingGames } = require('../state');
const { isOwner } = require('../commandConfig');
const {
    DiscordNotLinkedError,
    createUserForDiscord,
    createCharacterForDiscord,
    updateCharacterForDiscord,
    softDeleteCharacterForDiscord,
} = require('../appDb');
const { buildJoinConfirmButtons, notLinkedContent } = require('../linkingUi');

function isHttpUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isButton() && interaction.customId.startsWith('app')) {
            const [action, ownerDiscordId] = interaction.customId.split('_');

            if (String(interaction.user.id) !== String(ownerDiscordId)) {
                await interaction.reply({ content: 'Du kannst diese Aktion nicht ausführen.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (action === 'appLinkInfo') {
                await interaction.update({
                    content: [
                        notLinkedContent(),
                        '',
                        'Wenn du die App bereits nutzt: bitte verbinde Discord in deinem Profil (Connect Discord).',
                    ].join('\n'),
                    components: [],
                });
                return;
            }

            if (action === 'appJoinStart') {
                await interaction.update({
                    content: [
                        '**Neuen App-Account erstellen?**',
                        '',
                        'Das erstellt einen neuen Benutzer-Account, der an deine Discord-ID gebunden ist.',
                        '',
                        '**Nicht machen**, wenn du bereits einen App-Account hast (sonst hast du danach zwei Accounts).',
                    ].join('\n'),
                    components: [buildJoinConfirmButtons(ownerDiscordId)],
                });
                return;
            }

            if (action === 'appJoinCancel') {
                await interaction.update({
                    content: 'Abgebrochen.',
                    components: [],
                });
                return;
            }

            if (action === 'appJoinConfirm') {
                try {
                    const result = await createUserForDiscord(interaction.user);
                    await interaction.update({
                        content: result.created
                            ? 'Account erstellt und mit Discord verbunden. Du kannst den Command jetzt erneut ausführen.'
                            : 'Dein Discord ist bereits mit einem Account verbunden. Du kannst den Command jetzt erneut ausführen.',
                        components: [],
                    });
                } catch (error) {
                    console.error(error);
                    await interaction.update({ content: `Fehler beim Erstellen: ${error.message}`, components: [] });
                }
                return;
            }
        }

        if (interaction.isButton() && interaction.customId.startsWith('deleteCharacter')) {
            const [action, idRaw, ownerDiscordId] = interaction.customId.split('_');
            const characterId = Number(idRaw);

            if (!Number.isFinite(characterId) || characterId < 1) {
                await interaction.reply({ content: 'Ungültige Character-ID.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (String(interaction.user.id) !== String(ownerDiscordId)) {
                await interaction.reply({ content: 'Du kannst diese Aktion nicht ausführen.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (action === 'deleteCharacterCancel') {
                await interaction.update({ content: 'Abgebrochen.', components: [] });
                return;
            }

            if (action !== 'deleteCharacterConfirm') {
                await interaction.reply({ content: 'Unbekannte Aktion.', flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                const result = await softDeleteCharacterForDiscord(interaction.user, characterId);
                if (!result.ok) {
                    await interaction.update({ content: 'Charakter nicht gefunden oder bereits gelöscht.', components: [] });
                    return;
                }

                await interaction.update({ content: 'Charakter wurde gelöscht.', components: [] });
            } catch (error) {
                console.error(error);
                if (error instanceof DiscordNotLinkedError) {
                    await interaction.update({
                        content: notLinkedContent(),
                        components: [],
                    });
                    return;
                }
                await interaction.update({ content: `Fehler beim Löschen: ${error.message}`, components: [] });
            }
            return;
        }

        if (interaction.isButton() && interaction.customId.startsWith('tier_')) {
            const [, id, tier] = interaction.customId.split('_');
            const data = pendingGames.get(id);

            if (!data) {
                await interaction.reply({
                    content: 'Keine Daten gefunden.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (data.tiers.has(tier)) {
                data.tiers.delete(tier);
            } else {
                data.tiers.add(tier);
            }

            const row1 = new ActionRowBuilder().addComponents(
                ['BT', 'LT', 'HT', 'ET'].map(t =>
                    new ButtonBuilder()
                        .setCustomId(`tier_${id}_${t}`)
                        .setLabel(t)
                        .setStyle(data.tiers.has(t) ? ButtonStyle.Success : ButtonStyle.Secondary),
                ),
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`details_${id}`)
                    .setLabel('Weiter')
                    .setStyle(ButtonStyle.Primary),
            );

            await interaction.update({ components: [row1, row2] });
            return;
        }

        if (interaction.isButton() && interaction.customId.startsWith('details_')) {
            const id = interaction.customId.replace('details_', '');
            const data = pendingGames.get(id);

            if (!data) {
                await interaction.reply({
                    content: 'Keine Daten gefunden.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const now = new Date();
            const defaultDate = now.toISOString().slice(0, 10);
            const nextHour = new Date(now);
            nextHour.setMinutes(0, 0, 0);
            nextHour.setHours(nextHour.getHours() + 1);
            const defaultTime = nextHour.toISOString().slice(11, 16);

            const modal = new ModalBuilder()
                .setCustomId(`detailsModal_${id}`)
                .setTitle('Spieldetails');

            const dateInput = new TextInputBuilder()
                .setCustomId('gameDate')
                .setLabel('Datum (YYYY-MM-DD)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(defaultDate);

            const timeInput = new TextInputBuilder()
                .setCustomId('gameTime')
                .setLabel('Uhrzeit (HH:mm)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(defaultTime);

            const textInput = new TextInputBuilder()
                .setCustomId('gameText')
                .setLabel('Text')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(dateInput),
                new ActionRowBuilder().addComponents(timeInput),
                new ActionRowBuilder().addComponents(textInput),
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('detailsModal_')) {
            const id = interaction.customId.replace('detailsModal_', '');
            const data = pendingGames.get(id);

            if (!data) {
                await interaction.reply({
                    content: 'Keine Daten gefunden.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const dateString = interaction.fields.getTextInputValue('gameDate');
            const timeString = interaction.fields.getTextInputValue('gameTime');
            const text = interaction.fields.getTextInputValue('gameText') || '';
            pendingGames.delete(id);

            let time = Date.parse(`${dateString}T${timeString}`);
            if (Number.isNaN(time)) {
                time = Date.now();
            }

            const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'westwatch tales');
            const mention = role ? `<@&${role.id}>` : '@westwatch-tales';

            const emojiMap = {
                BT: '804713705358622800',
                LT: '804713705262546995',
                HT: '804713704918089780',
                ET: '804713705337782312',
            };

            const tiers = Array.from(data.tiers).map(t => {
                const emojiId = emojiMap[t];
                const emoji = emojiId ? interaction.client.emojis.cache.get(emojiId) : null;
                return emoji ? emoji.toString() : t;
            }).join(' ');

            const date = new Date(time);
            const formattedDate = `${date.toLocaleString('de-DE', {
                day: '2-digit',
            })}. ${date.toLocaleString('de-DE', { month: 'long' })} ${date.toLocaleString('de-DE', {
                year: 'numeric',
            })} ${date.toLocaleString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            })}`;

            const announcement = `${tiers} - ${formattedDate} - von <@${data.userId}> - ${mention} - ${text}`;
            const msg = await interaction.channel.send(announcement);
            await msg.startThread({ name: 'Spiel-Thread', autoArchiveDuration: 1440 });

            if (data.commandInteraction) {
                await data.commandInteraction.deleteReply().catch(() => {});
            }

            await interaction.reply({ content: 'Ankündigung erstellt.', flags: MessageFlags.Ephemeral });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId === 'registerCharacterModal') {
            if (!interaction.inGuild()) {
                await interaction.reply({ content: 'Bitte nutze diesen Befehl in einem Server (nicht in DMs).', flags: MessageFlags.Ephemeral });
                return;
            }

            const url = interaction.fields.getTextInputValue('regUrl');
            const tier = interaction.fields.getTextInputValue('regTier').toLowerCase();
            const characterName = interaction.fields.getTextInputValue('regName');
            const notes = interaction.fields.getTextInputValue('regNotes') || '';

            const allowedTiers = ['bt', 'lt', 'ht'];
            if (!allowedTiers.includes(tier)) {
                await interaction.reply({ content: 'Tier muss bt, lt oder ht sein.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (!isHttpUrl(url)) {
                await interaction.reply({ content: 'Ungültige URL (nur http/https).', flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                const characterId = await createCharacterForDiscord(interaction.user, {
                    name: characterName,
                    startTier: tier,
                    externalLink: url,
                    notes,
                });

                await interaction.reply({ content: `Charakter erstellt! ID: ${characterId}`, flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error(error);
                if (error instanceof DiscordNotLinkedError) {
                    await interaction.reply({
                        content: notLinkedContent(),
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
                await interaction.reply({ content: 'Fehler beim Speichern des Charakters.', flags: MessageFlags.Ephemeral });
            }
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('updateCharacterModal_')) {
            if (!interaction.inGuild()) {
                await interaction.reply({ content: 'Bitte nutze diesen Befehl in einem Server (nicht in DMs).', flags: MessageFlags.Ephemeral });
                return;
            }

            const id = Number(interaction.customId.replace('updateCharacterModal_', ''));
            const url = interaction.fields.getTextInputValue('updUrl');
            const tier = interaction.fields.getTextInputValue('updTier').toLowerCase();
            const characterName = interaction.fields.getTextInputValue('updName');
            const notes = interaction.fields.getTextInputValue('updNotes') || '';

            if (!Number.isFinite(id) || id < 1) {
                await interaction.reply({ content: 'Ungültige Character-ID.', flags: MessageFlags.Ephemeral });
                return;
            }

            const allowedTiers = ['bt', 'lt', 'ht'];
            if (!allowedTiers.includes(tier)) {
                await interaction.reply({ content: 'Tier muss bt, lt oder ht sein.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (!isHttpUrl(url)) {
                await interaction.reply({ content: 'Ungültige URL (nur http/https).', flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                const result = await updateCharacterForDiscord(interaction.user, id, {
                    name: characterName,
                    startTier: tier,
                    externalLink: url,
                    notes,
                });

                await interaction.reply({
                    content: result.ok ? 'Charakter aktualisiert.' : 'Charakter nicht gefunden.',
                    flags: MessageFlags.Ephemeral,
                });
            } catch (error) {
                console.error(error);
                if (error instanceof DiscordNotLinkedError) {
                    await interaction.reply({
                        content: notLinkedContent(),
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
                await interaction.reply({ content: 'Fehler beim Speichern des Charakters.', flags: MessageFlags.Ephemeral });
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        if (command.ownerOnly && !isOwner(interaction.user.id)) {
            await interaction.reply({
                content: 'Dieser Befehl ist Owner-only konfiguriert.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
            }
        }
    },
};
