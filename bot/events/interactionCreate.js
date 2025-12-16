const {
    Events,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
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
    findCharacterForDiscord,
    listCharactersForDiscord,
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

function resolvePublicUrl(urlOrPath) {
    const value = String(urlOrPath || '').trim();
    if (!value) return null;
    if (isHttpUrl(value)) return value;

    const appUrl = String(process.env.BOT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
    if (!appUrl) return null;
    const baseUrl = appUrl.replace(/\/$/, '');

    if (value.startsWith('/')) return `${baseUrl}${value}`;
    if (value.startsWith('storage/')) return `${baseUrl}/${value}`;

    return `${baseUrl}/storage/${value}`;
}

function safeModalValue(value, max = 4000) {
    const text = String(value ?? '');
    if (text.length <= max) return text;
    return text.slice(0, max);
}

function normalizeOptionalAvatarInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (isHttpUrl(raw)) return raw;
    if (raw.startsWith('/')) return raw;
    if (raw.startsWith('storage/')) return raw;
    if (/^[a-z0-9][a-z0-9/_-]*\.(png|jpg|jpeg|webp|gif)$/i.test(raw)) return raw;
    return null;
}

function buildCharacterEmbed(character, title) {
    const tier = String(character.start_tier || '').toUpperCase() || '—';
    const name = String(character.name || '').trim() || `Charakter ${character.id}`;
    const link = String(character.external_link || '').trim();
    const notes = String(character.notes || '').trim();
    const avatarUrl = resolvePublicUrl(character.avatar);

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .addFields(
            { name: 'Name', value: name.slice(0, 1024) || '—', inline: true },
            { name: 'Tier', value: tier.slice(0, 1024) || '—', inline: true },
            { name: 'ID', value: String(character.id), inline: true },
        );

    if (isHttpUrl(link)) {
        embed.setURL(link);
        embed.addFields({ name: 'Link', value: `[Sheet öffnen](${link})`, inline: false });
    } else if (link) {
        embed.addFields({ name: 'Link', value: link, inline: false });
    }

    if (avatarUrl) {
        embed.setThumbnail(avatarUrl);
        embed.addFields({ name: 'Avatar', value: avatarUrl.slice(0, 1024), inline: false });
    }

    if (notes) {
        embed.addFields({ name: 'Notizen', value: notes.slice(0, 1024), inline: false });
    }

    return embed;
}

function buildCharacterSelect({ ownerDiscordId, characters, purpose }) {
    const customId = `${purpose === 'update' ? 'characterUpdateSelect' : 'characterDeleteSelect'}_${ownerDiscordId}`;
    const placeholder = 'Charakter auswählen…';

    const select = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addOptions(
            characters.slice(0, 25).map(c =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(String(c.name).slice(0, 100) || `Charakter ${c.id}`)
                    .setDescription(`ID ${c.id} · ${(String(c.start_tier || '').toUpperCase() || '—')}`)
                    .setValue(String(c.id)),
            ),
        );

    return new ActionRowBuilder().addComponents(select);
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

        if (interaction.isButton() && interaction.customId.startsWith('charactersAction_')) {
            const [, action, ownerDiscordId] = interaction.customId.split('_');

            if (String(interaction.user.id) !== String(ownerDiscordId)) {
                await interaction.reply({ content: 'Du kannst diese Aktion nicht ausführen.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (!interaction.inGuild()) {
                await interaction.reply({ content: 'Bitte nutze diesen Befehl in einem Server (nicht in DMs).', flags: MessageFlags.Ephemeral });
                return;
            }

            if (action === 'new') {
                const modal = new ModalBuilder()
                    .setCustomId('registerCharacterModal')
                    .setTitle('Charakter erstellen');

                const nameInput = new TextInputBuilder()
                    .setCustomId('regName')
                    .setLabel('Charaktername')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const tierInput = new TextInputBuilder()
                    .setCustomId('regTier')
                    .setLabel('Start-Tier')
                    .setPlaceholder('bt | lt | ht')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const urlInput = new TextInputBuilder()
                    .setCustomId('regUrl')
                    .setLabel('External Link (URL)')
                    .setPlaceholder('https://...')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const avatarInput = new TextInputBuilder()
                    .setCustomId('regAvatar')
                    .setLabel('Avatar (optional, URL)')
                    .setPlaceholder('https://... oder /storage/... (öffentlich)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                const notesInput = new TextInputBuilder()
                    .setCustomId('regNotes')
                    .setLabel('Notizen')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(nameInput),
                    new ActionRowBuilder().addComponents(tierInput),
                    new ActionRowBuilder().addComponents(urlInput),
                    new ActionRowBuilder().addComponents(avatarInput),
                    new ActionRowBuilder().addComponents(notesInput),
                );

                await interaction.showModal(modal);
                return;
            }

            if (action !== 'update' && action !== 'delete') {
                await interaction.reply({ content: 'Unbekannte Aktion.', flags: MessageFlags.Ephemeral });
                return;
            }

            let characters;
            try {
                characters = await listCharactersForDiscord(interaction.user);
            } catch (error) {
                if (error instanceof DiscordNotLinkedError) {
                    await interaction.reply({ content: notLinkedContent(), flags: MessageFlags.Ephemeral });
                    return;
                }
                throw error;
            }

            if (characters.length === 0) {
                await interaction.reply({ content: 'Keine Charaktere gefunden.', flags: MessageFlags.Ephemeral });
                return;
            }

            const row = buildCharacterSelect({
                ownerDiscordId: interaction.user.id,
                characters,
                purpose: action,
            });

            await interaction.reply({
                content: action === 'update' ? 'Welchen Charakter möchtest du bearbeiten?' : 'Welchen Charakter möchtest du löschen?',
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('characterUpdateSelect_')) {
            const [, ownerDiscordId] = interaction.customId.split('_');

            if (String(interaction.user.id) !== String(ownerDiscordId)) {
                await interaction.reply({ content: 'Du kannst diese Aktion nicht ausführen.', flags: MessageFlags.Ephemeral });
                return;
            }

            const selectedId = Number(interaction.values?.[0]);
            if (!Number.isFinite(selectedId) || selectedId < 1) {
                await interaction.reply({ content: 'Ungültige Charakter-ID.', flags: MessageFlags.Ephemeral });
                return;
            }

            let character;
            try {
                character = await findCharacterForDiscord(interaction.user, selectedId);
            } catch (error) {
                if (error instanceof DiscordNotLinkedError) {
                    await interaction.update({ content: notLinkedContent(), components: [], embeds: [] });
                    return;
                }
                throw error;
            }

            if (!character) {
                await interaction.update({ content: 'Charakter nicht gefunden.', components: [], embeds: [] });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId(`updateCharacterModal_${character.id}`)
                .setTitle('Charakter aktualisieren');

            const nameInput = new TextInputBuilder()
                .setCustomId('updName')
                .setLabel('Charaktername')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(safeModalValue(character.name));

            const tierInput = new TextInputBuilder()
                .setCustomId('updTier')
                .setLabel('Start-Tier')
                .setPlaceholder('bt | lt | ht')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(safeModalValue(String(character.start_tier || '').toLowerCase()));

            const urlInput = new TextInputBuilder()
                .setCustomId('updUrl')
                .setLabel('External Link (URL)')
                .setPlaceholder('https://...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(safeModalValue(character.external_link));

            const avatarInput = new TextInputBuilder()
                .setCustomId('updAvatar')
                .setLabel('Avatar (optional, URL)')
                .setPlaceholder('https://... oder /storage/... (öffentlich)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(safeModalValue(character.avatar));

            const notesInput = new TextInputBuilder()
                .setCustomId('updNotes')
                .setLabel('Notizen')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setValue(safeModalValue(character.notes));

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(tierInput),
                new ActionRowBuilder().addComponents(urlInput),
                new ActionRowBuilder().addComponents(avatarInput),
                new ActionRowBuilder().addComponents(notesInput),
            );

            await interaction.showModal(modal);
            return;
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('characterDeleteSelect_')) {
            const [, ownerDiscordId] = interaction.customId.split('_');

            if (String(interaction.user.id) !== String(ownerDiscordId)) {
                await interaction.reply({ content: 'Du kannst diese Aktion nicht ausführen.', flags: MessageFlags.Ephemeral });
                return;
            }

            const selectedId = Number(interaction.values?.[0]);
            if (!Number.isFinite(selectedId) || selectedId < 1) {
                await interaction.reply({ content: 'Ungültige Charakter-ID.', flags: MessageFlags.Ephemeral });
                return;
            }

            let character;
            try {
                character = await findCharacterForDiscord(interaction.user, selectedId);
            } catch (error) {
                if (error instanceof DiscordNotLinkedError) {
                    await interaction.update({ content: notLinkedContent(), components: [], embeds: [] });
                    return;
                }
                throw error;
            }

            if (!character) {
                await interaction.update({ content: 'Charakter nicht gefunden.', components: [], embeds: [] });
                return;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`deleteCharacterConfirm_${character.id}_${interaction.user.id}`)
                    .setLabel('Löschen')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`deleteCharacterCancel_${character.id}_${interaction.user.id}`)
                    .setLabel('Abbrechen')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.update({
                content: 'Charakter wirklich löschen?',
                embeds: [buildCharacterEmbed(character, 'Charakter löschen')],
                components: [row],
            });
            return;
        }

        if (interaction.isButton() && interaction.customId.startsWith('deleteCharacter')) {
            const [action, idRaw, ownerDiscordId] = interaction.customId.split('_');
            const characterId = Number(idRaw);

            if (!Number.isFinite(characterId) || characterId < 1) {
                await interaction.reply({ content: 'Ungültige Charakter-ID.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (String(interaction.user.id) !== String(ownerDiscordId)) {
                await interaction.reply({ content: 'Du kannst diese Aktion nicht ausführen.', flags: MessageFlags.Ephemeral });
                return;
            }

            if (action === 'deleteCharacterCancel') {
                await interaction.update({ content: 'Abgebrochen.', components: [], embeds: [] });
                return;
            }

            if (action !== 'deleteCharacterConfirm') {
                await interaction.reply({ content: 'Unbekannte Aktion.', flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                let snapshot = null;
                try {
                    snapshot = await findCharacterForDiscord(interaction.user, characterId);
                } catch {
                    snapshot = null;
                }

                const result = await softDeleteCharacterForDiscord(interaction.user, characterId);
                if (!result.ok) {
                    await interaction.update({ content: 'Charakter nicht gefunden oder bereits gelöscht.', components: [], embeds: [] });
                    return;
                }

                await interaction.update({
                    content: 'Charakter wurde gelöscht.',
                    components: [],
                    embeds: snapshot ? [buildCharacterEmbed(snapshot, 'Charakter gelöscht')] : [],
                });
            } catch (error) {
                console.error(error);
                if (error instanceof DiscordNotLinkedError) {
                    await interaction.update({
                        content: notLinkedContent(),
                        components: [],
                        embeds: [],
                    });
                    return;
                }
                await interaction.update({ content: `Fehler beim Löschen: ${error.message}`, components: [], embeds: [] });
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
            const formattedDate = `${date.toLocaleString('de-DE', { day: '2-digit' })}. ${date.toLocaleString('de-DE', { month: 'long' })} ${date.toLocaleString('de-DE', { year: 'numeric' })} ${date.toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

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
            const avatarRaw = interaction.fields.getTextInputValue('regAvatar') || '';
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

            const avatar = normalizeOptionalAvatarInput(avatarRaw);
            if (avatarRaw.trim() && !avatar) {
                await interaction.reply({ content: 'Ungültiger Avatar (nur http/https oder ein Pfad wie /storage/... ).', flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                const characterId = await createCharacterForDiscord(interaction.user, {
                    name: characterName,
                    startTier: tier,
                    externalLink: url,
                    avatar,
                    notes,
                });

                let character = null;
                try {
                    character = await findCharacterForDiscord(interaction.user, characterId);
                } catch {
                    character = null;
                }

                await interaction.reply({
                    content: character ? 'Charakter erstellt.' : `Charakter erstellt! ID: ${characterId}`,
                    embeds: character ? [buildCharacterEmbed(character, 'Charakter erstellt')] : [],
                    flags: MessageFlags.Ephemeral,
                });
            } catch (error) {
                console.error(error);
                if (error instanceof DiscordNotLinkedError) {
                    await interaction.reply({
                        content: notLinkedContent(),
                        embeds: [],
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
            const avatarRaw = interaction.fields.getTextInputValue('updAvatar') || '';
            const notes = interaction.fields.getTextInputValue('updNotes') || '';

            if (!Number.isFinite(id) || id < 1) {
                await interaction.reply({ content: 'Ungültige Charakter-ID.', flags: MessageFlags.Ephemeral });
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

            const avatar = normalizeOptionalAvatarInput(avatarRaw);
            if (avatarRaw.trim() && !avatar) {
                await interaction.reply({ content: 'Ungültiger Avatar (nur http/https oder ein Pfad wie /storage/... ).', flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                const result = await updateCharacterForDiscord(interaction.user, id, {
                    name: characterName,
                    startTier: tier,
                    externalLink: url,
                    avatar,
                    notes,
                });

                if (!result.ok) {
                    await interaction.reply({
                        content: 'Charakter nicht gefunden.',
                        embeds: [],
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                let character = null;
                try {
                    character = await findCharacterForDiscord(interaction.user, id);
                } catch {
                    character = null;
                }

                await interaction.reply({
                    content: 'Charakter aktualisiert.',
                    embeds: character ? [buildCharacterEmbed(character, 'Charakter aktualisiert')] : [],
                    flags: MessageFlags.Ephemeral,
                });
            } catch (error) {
                console.error(error);
                if (error instanceof DiscordNotLinkedError) {
                    await interaction.reply({
                        content: notLinkedContent(),
                        embeds: [],
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
