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
const db = require('../db');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
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
                const emId = emojiMap[t];
                const e = emId ? interaction.client.emojis.cache.get(emId) : null;
                return e ? e.toString() : t;
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

            await interaction.reply({ content: 'Ankündigung erstellt', flags: MessageFlags.Ephemeral });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId === 'registerCharacterModal') {
            const url = interaction.fields.getTextInputValue('regUrl');
            const tier = interaction.fields.getTextInputValue('regTier').toLowerCase();
            const characterName = interaction.fields.getTextInputValue('regName');
            const notes = interaction.fields.getTextInputValue('regNotes') || '';
            const discordName = interaction.user.tag;
            const discordId = interaction.user.id;

            const allowedTiers = ['bt', 'lt', 'ht'];
            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch {
                await interaction.reply({ content: 'Ungültige URL.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (parsedUrl.hostname !== 'dndbeyond.com' && !parsedUrl.hostname.endsWith('.dndbeyond.com')) {
                await interaction.reply({ content: 'URL muss von dndbeyond.com stammen.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (!allowedTiers.includes(tier)) {
                await interaction.reply({ content: 'Tier muss bt, lt oder ht sein.', flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                await db.execute(
                    'INSERT INTO registrations (character_name, character_url, start_tier, tier, notes, discord_name, discord_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                    [characterName, parsedUrl.toString(), tier, tier, notes, discordName, discordId],
                );
                await interaction.reply({ content: 'Registrierung gespeichert!', flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Fehler beim Speichern.', flags: MessageFlags.Ephemeral });
            }
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('updateCharacterModal_')) {
            const id = interaction.customId.replace('updateCharacterModal_', '');
            const url = interaction.fields.getTextInputValue('updUrl');
            const tier = interaction.fields.getTextInputValue('updTier').toLowerCase();
            const characterName = interaction.fields.getTextInputValue('updName');
            const notes = interaction.fields.getTextInputValue('updNotes') || '';

            const allowedTiers = ['bt', 'lt', 'ht'];
            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch {
                await interaction.reply({ content: 'Ungültige URL.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (parsedUrl.hostname !== 'dndbeyond.com' && !parsedUrl.hostname.endsWith('.dndbeyond.com')) {
                await interaction.reply({ content: 'URL muss von dndbeyond.com stammen.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (!allowedTiers.includes(tier)) {
                await interaction.reply({ content: 'Tier muss bt, lt oder ht sein.', flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                const [result] = await db.execute(
                    'UPDATE registrations SET character_name = ?, tier = ?, character_url = ?, notes = ?, updated_at = NOW() WHERE id = ? AND discord_id = ?',
                    [characterName, tier, parsedUrl.toString(), notes, id, interaction.user.id],
                );
                if (result.affectedRows === 0) {
                    await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content: 'Charakter aktualisiert.', flags: MessageFlags.Ephemeral });
                }
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Fehler beim Speichern.', flags: MessageFlags.Ephemeral });
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
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
