const {
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
} = require('discord.js');

const {
    DiscordNotLinkedError,
    createCharacterForDiscord,
    findCharacterForDiscord,
    updateCharacterForDiscord,
    softDeleteCharacterForDiscord,
    listAdventuresForDiscord,
    findAdventureForDiscord,
    createAdventureForDiscord,
    updateAdventureForDiscord,
    softDeleteAdventureForDiscord,
    listDowntimesForDiscord,
    findDowntimeForDiscord,
    createDowntimeForDiscord,
    updateDowntimeForDiscord,
    softDeleteDowntimeForDiscord,
} = require('../appDb');

const { replyNotLinked, notLinkedContent } = require('../linkingUi');

function isOwnerOfInteraction(interaction, ownerDiscordId) {
    return String(interaction.user.id) === String(ownerDiscordId);
}

function isHttpUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function safeModalValue(value, max = 4000) {
    const text = String(value ?? '');
    if (text.length <= max) return text;
    return text.slice(0, max);
}

function parseIsoDate(value) {
    const raw = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    return raw;
}

function formatDuration(seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseDurationToSeconds(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;

    const matchHhMm = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (matchHhMm) {
        const hours = Number(matchHhMm[1]);
        const minutes = Number(matchHhMm[2]);
        if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes > 59 || hours < 0) return null;
        return hours * 3600 + minutes * 60;
    }

    const minutes = Number(raw);
    if (Number.isFinite(minutes) && minutes >= 0) return Math.floor(minutes) * 60;
    return null;
}

function buildDeleteConfirmRow({ characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteCharacterConfirm_${characterId}_${ownerDiscordId}`)
            .setLabel('L\u00f6schen')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteCharacterCancel_${characterId}_${ownerDiscordId}`)
            .setLabel('Abbrechen')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildAdventureDeleteConfirmRow({ adventureId, characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteAdventureConfirm_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('L\u00f6schen')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteAdventureCancel_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Abbrechen')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildDowntimeDeleteConfirmRow({ downtimeId, characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteDowntimeConfirm_${downtimeId}_${characterId}_${ownerDiscordId}`)
            .setLabel('L\u00f6schen')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteDowntimeCancel_${downtimeId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Abbrechen')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildCharacterCardRow({ characterId, ownerDiscordId, isFiller }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`characterCard_adv_${characterId}_${ownerDiscordId}`)
            .setLabel('Abenteuer')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`characterCard_dt_${characterId}_${ownerDiscordId}`)
            .setLabel('Downtime')
            .setStyle(ButtonStyle.Success)
            .setDisabled(Boolean(isFiller)),
        new ButtonBuilder()
            .setCustomId(`characterCard_edit_${characterId}_${ownerDiscordId}`)
            .setLabel('Bearbeiten')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`characterCard_del_${characterId}_${ownerDiscordId}`)
            .setLabel('L\u00f6schen')
            .setStyle(ButtonStyle.Danger),
    );
}

function buildAdventureListRow({ characterId, ownerDiscordId, adventures }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`advSelect_${characterId}_${ownerDiscordId}`)
        .setPlaceholder('Abenteuer ausw\u00e4hlen\u2026')
        .addOptions(
            adventures.slice(0, 25).map(a => {
                const title = String(a.title || '').trim() || '(ohne Titel)';
                const extra = a.has_additional_bubble ? ' +1' : '';
                return new StringSelectMenuOptionBuilder()
                    .setLabel(`${a.start_date} \u00b7 ${title}`.slice(0, 100))
                    .setDescription(`${formatDuration(a.duration)}${extra}`)
                    .setValue(String(a.id));
            }),
        );
    return new ActionRowBuilder().addComponents(select);
}

function buildDowntimeListRow({ characterId, ownerDiscordId, downtimes }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`dtSelect_${characterId}_${ownerDiscordId}`)
        .setPlaceholder('Downtime ausw\u00e4hlen\u2026')
        .addOptions(
            downtimes.slice(0, 25).map(d =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${d.start_date} \u00b7 ${String(d.type || 'other')}`.slice(0, 100))
                    .setDescription(formatDuration(d.duration))
                    .setValue(String(d.id)),
            ),
        );
    return new ActionRowBuilder().addComponents(select);
}

function buildAdventureEmbed(adventure, title) {
    const extra = adventure.has_additional_bubble ? ' +1' : '';
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .addFields(
            { name: 'Datum', value: String(adventure.start_date), inline: true },
            { name: 'Dauer', value: `${formatDuration(adventure.duration)}${extra}`, inline: true },
            { name: 'ID', value: String(adventure.id), inline: true },
        );

    if (adventure.title) embed.addFields({ name: 'Titel', value: String(adventure.title).slice(0, 1024), inline: false });
    if (adventure.game_master) embed.addFields({ name: 'GM', value: String(adventure.game_master).slice(0, 1024), inline: false });
    if (adventure.notes) embed.addFields({ name: 'Notizen', value: String(adventure.notes).slice(0, 1024), inline: false });
    return embed;
}

function buildDowntimeEmbed(downtime, title) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .addFields(
            { name: 'Datum', value: String(downtime.start_date), inline: true },
            { name: 'Dauer', value: formatDuration(downtime.duration), inline: true },
            { name: 'Typ', value: String(downtime.type || 'other'), inline: true },
            { name: 'ID', value: String(downtime.id), inline: true },
        );

    if (downtime.notes) embed.addFields({ name: 'Notizen', value: String(downtime.notes).slice(0, 1024), inline: false });
    return embed;
}

async function handle(interaction) {
    if (interaction.isButton() && interaction.customId.startsWith('charactersAction_new_')) {
        const ownerDiscordId = interaction.customId.replace('charactersAction_new_', '');

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'Bitte nutze diesen Befehl in einem Server (nicht in DMs).', flags: MessageFlags.Ephemeral });
            return true;
        }

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

        const notesInput = new TextInputBuilder()
            .setCustomId('regNotes')
            .setLabel('Notizen')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(tierInput),
            new ActionRowBuilder().addComponents(urlInput),
            new ActionRowBuilder().addComponents(notesInput),
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'registerCharacterModal') {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'Bitte nutze diesen Befehl in einem Server (nicht in DMs).', flags: MessageFlags.Ephemeral });
            return true;
        }

        const url = interaction.fields.getTextInputValue('regUrl');
        const tier = interaction.fields.getTextInputValue('regTier').toLowerCase();
        const characterName = interaction.fields.getTextInputValue('regName');
        const notes = interaction.fields.getTextInputValue('regNotes') || '';

        const allowedTiers = ['bt', 'lt', 'ht'];
        if (!allowedTiers.includes(tier)) {
            await interaction.reply({ content: 'Tier muss bt, lt oder ht sein.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!isHttpUrl(url)) {
            await interaction.reply({ content: 'Ung\u00fcltige URL (nur http/https).', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            await createCharacterForDiscord(interaction.user, {
                name: characterName,
                startTier: tier,
                externalLink: url,
                notes,
            });

            await interaction.reply({
                content: 'Charakter erstellt. Tipp: `/mg-characters` erneut ausf\u00fchren, um die Karte zu sehen.',
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Fehler beim Speichern des Charakters.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('updateCharacterModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const url = interaction.fields.getTextInputValue('updUrl');
        const characterName = interaction.fields.getTextInputValue('updName');
        const notes = interaction.fields.getTextInputValue('updNotes') || '';

        if (!isHttpUrl(url)) {
            await interaction.reply({ content: 'Ung\u00fcltige URL (nur http/https).', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const result = await updateCharacterForDiscord(interaction.user, characterId, {
                name: characterName,
                externalLink: url,
                notes,
            });

            if (!result.ok) {
                await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            await interaction.reply({
                content: 'Charakter aktualisiert. Tipp: `/mg-characters` erneut ausf\u00fchren.',
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Fehler beim Speichern des Charakters.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('characterCard_')) {
        const [, action, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            await interaction.reply({ content: 'Ung\u00fcltige Charakter-ID.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        let character;
        try {
            character = await findCharacterForDiscord(interaction.user, characterId);
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            throw error;
        }
        if (!character) {
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'edit') {
            const modal = new ModalBuilder()
                .setCustomId(`updateCharacterModal_${character.id}_${ownerDiscordId}`)
                .setTitle('Charakter bearbeiten');

            const nameInput = new TextInputBuilder()
                .setCustomId('updName')
                .setLabel('Charaktername')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(safeModalValue(character.name));

            const urlInput = new TextInputBuilder()
                .setCustomId('updUrl')
                .setLabel('External Link (URL)')
                .setPlaceholder('https://...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(safeModalValue(character.external_link));

            const notesInput = new TextInputBuilder()
                .setCustomId('updNotes')
                .setLabel('Notizen')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setValue(safeModalValue(character.notes));

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(urlInput),
                new ActionRowBuilder().addComponents(notesInput),
            );

            await interaction.showModal(modal);
            return true;
        }

        if (action === 'del') {
            await interaction.update({
                content: 'Charakter wirklich l\u00f6schen?',
                components: [buildDeleteConfirmRow({ characterId: character.id, ownerDiscordId })],
            });
            return true;
        }

        if (action === 'adv') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`advAdd_${character.id}_${ownerDiscordId}`)
                    .setLabel('Neues Abenteuer')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`advList_${character.id}_${ownerDiscordId}`)
                    .setLabel('Liste')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`characterCard_back_${character.id}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.update({ components: [row], content: '' });
            return true;
        }

        if (action === 'dt') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtAdd_${character.id}_${ownerDiscordId}`)
                    .setLabel('Downtime hinzuf\u00fcgen')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(Boolean(character.is_filler)),
                new ButtonBuilder()
                    .setCustomId(`dtList_${character.id}_${ownerDiscordId}`)
                    .setLabel('Liste')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(Boolean(character.is_filler)),
                new ButtonBuilder()
                    .setCustomId(`characterCard_back_${character.id}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.update({ components: [row], content: '' });
            return true;
        }

        if (action === 'back') {
            await interaction.update({
                components: [buildCharacterCardRow({ characterId: character.id, ownerDiscordId, isFiller: character.is_filler })],
                content: '',
            });
            return true;
        }

        await interaction.reply({ content: 'Unbekannte Aktion.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('deleteCharacter')) {
        const [action, idRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(idRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            await interaction.reply({ content: 'Ung\u00fcltige Charakter-ID.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (action === 'deleteCharacterCancel') {
            await interaction.update({ content: 'Abgebrochen.', components: [] });
            return true;
        }
        if (action !== 'deleteCharacterConfirm') return false;

        try {
            const result = await softDeleteCharacterForDiscord(interaction.user, characterId);
            if (!result.ok) {
                await interaction.update({ content: 'Charakter nicht gefunden oder bereits gel\u00f6scht.', components: [] });
                return true;
            }
            await interaction.update({ content: 'Charakter wurde gel\u00f6scht.', components: [] });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await interaction.update({ content: notLinkedContent(), components: [] });
                return true;
            }
            await interaction.update({ content: `Fehler beim L\u00f6schen: ${error.message}`, components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advAdd_')) {
        const match = interaction.customId.match(/^advAdd_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const modal = new ModalBuilder()
            .setCustomId(`advCreateModal_${characterId}_${ownerDiscordId}`)
            .setTitle('Abenteuer hinzuf\u00fcgen');

        const durationInput = new TextInputBuilder()
            .setCustomId('advDuration')
            .setLabel('Dauer (HH:MM oder Minuten)')
            .setPlaceholder('03:00')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const dateInput = new TextInputBuilder()
            .setCustomId('advDate')
            .setLabel('Datum (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(new Date().toISOString().slice(0, 10));

        const titleInput = new TextInputBuilder()
            .setCustomId('advTitle')
            .setLabel('Titel (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const gmInput = new TextInputBuilder()
            .setCustomId('advGm')
            .setLabel('Game Master (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const bonusInput = new TextInputBuilder()
            .setCustomId('advBonus')
            .setLabel('Bonus Bubble (+1)?')
            .setPlaceholder('nein | ja')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue('nein');

        modal.addComponents(
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(gmInput),
            new ActionRowBuilder().addComponents(bonusInput),
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advCreateModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('advDuration'));
        const startDate = parseIsoDate(interaction.fields.getTextInputValue('advDate'));
        const title = (interaction.fields.getTextInputValue('advTitle') || '').trim();
        const gameMaster = (interaction.fields.getTextInputValue('advGm') || '').trim();
        const bonusRaw = String(interaction.fields.getTextInputValue('advBonus') || '').trim().toLowerCase();

        const hasAdditionalBubble = ['1', 'true', 'ja', 'j', 'yes', 'y', '+1'].includes(bonusRaw);

        if (duration === null) {
            await interaction.reply({ content: 'Ung\u00fcltige Dauer. Nutze HH:MM (z.B. 03:00) oder Minuten.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!startDate) {
            await interaction.reply({ content: 'Ung\u00fcltiges Datum. Nutze YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const result = await createAdventureForDiscord(interaction.user, {
                characterId,
                duration,
                startDate,
                hasAdditionalBubble,
                notes: '',
                title,
                gameMaster,
            });

            if (!result.ok) {
                await interaction.reply({ content: 'Abenteuer konnte nicht gespeichert werden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const adventure = await findAdventureForDiscord(interaction.user, result.id);
            if (!adventure) {
                await interaction.reply({ content: 'Abenteuer gespeichert.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`advEdit_${adventure.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Bearbeiten')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`advDelete_${adventure.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('L\u00f6schen')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.reply({
                embeds: [buildAdventureEmbed(adventure, 'Abenteuer gespeichert')],
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Fehler beim Speichern des Abenteuers.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advList_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const adventures = await listAdventuresForDiscord(interaction.user, characterId, 25);
            if (adventures.length === 0) {
                await interaction.reply({ content: 'Keine Abenteuer gefunden.', flags: MessageFlags.Ephemeral });
                return true;
            }
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Abenteuer').setDescription('W\u00e4hle ein Abenteuer.')],
                components: [buildAdventureListRow({ characterId, ownerDiscordId, adventures })],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Fehler beim Laden der Abenteuer.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtAdd_')) {
        const match = interaction.customId.match(/^dtAdd_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const modal = new ModalBuilder()
            .setCustomId(`dtCreateModal_${characterId}_${ownerDiscordId}`)
            .setTitle('Downtime hinzuf\u00fcgen');

        const typeInput = new TextInputBuilder()
            .setCustomId('dtType')
            .setLabel('Typ')
            .setPlaceholder('faction | other')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue('other');

        const durationInput = new TextInputBuilder()
            .setCustomId('dtDuration')
            .setLabel('Dauer (HH:MM oder Minuten)')
            .setPlaceholder('03:00')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const dateInput = new TextInputBuilder()
            .setCustomId('dtDate')
            .setLabel('Datum (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(new Date().toISOString().slice(0, 10));

        const notesInput = new TextInputBuilder()
            .setCustomId('dtNotes')
            .setLabel('Notizen (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(typeInput),
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(notesInput),
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('dtCreateModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const typeRaw = String(interaction.fields.getTextInputValue('dtType') || '').trim().toLowerCase();
        const normalizedType = (() => {
            if (['faction', 'f', '1'].includes(typeRaw)) return 'faction';
            if (['other', 'o', '2'].includes(typeRaw)) return 'other';
            return null;
        })();
        if (!normalizedType) {
            await interaction.reply({ content: 'Ung\u00fcltiger Typ. Nutze `faction` oder `other`.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('dtDuration'));
        const startDate = parseIsoDate(interaction.fields.getTextInputValue('dtDate'));
        const notes = (interaction.fields.getTextInputValue('dtNotes') || '').trim();

        if (duration === null) {
            await interaction.reply({ content: 'Ung\u00fcltige Dauer. Nutze HH:MM (z.B. 03:00) oder Minuten.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!startDate) {
            await interaction.reply({ content: 'Ung\u00fcltiges Datum. Nutze YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const result = await createDowntimeForDiscord(interaction.user, {
                characterId,
                duration,
                startDate,
                type: normalizedType,
                notes,
            });

            if (!result.ok) {
                await interaction.reply({ content: 'Downtime konnte nicht gespeichert werden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const downtime = await findDowntimeForDiscord(interaction.user, result.id);
            if (!downtime) {
                await interaction.reply({ content: 'Downtime gespeichert.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtEdit_${downtime.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Bearbeiten')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`dtDelete_${downtime.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('L\u00f6schen')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.reply({
                embeds: [buildDowntimeEmbed(downtime, 'Downtime gespeichert')],
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Fehler beim Speichern der Downtime.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtList_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const downtimes = await listDowntimesForDiscord(interaction.user, characterId, 25);
            if (downtimes.length === 0) {
                await interaction.reply({ content: 'Keine Downtimes gefunden.', flags: MessageFlags.Ephemeral });
                return true;
            }
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Downtime').setDescription('W\u00e4hle eine Downtime.')],
                components: [buildDowntimeListRow({ characterId, ownerDiscordId, downtimes })],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Fehler beim Laden der Downtimes.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('advSelect_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        const adventureId = Number(interaction.values?.[0]);
        if (!Number.isFinite(characterId) || characterId < 1 || !Number.isFinite(adventureId) || adventureId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await findAdventureForDiscord(interaction.user, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.update({ content: 'Abenteuer nicht gefunden.', embeds: [], components: [] });
            return true;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advEdit_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Bearbeiten')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`advDelete_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel('L\u00f6schen')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
                .setLabel('Zur\u00fcck')
                .setStyle(ButtonStyle.Secondary),
        );

        await interaction.update({ embeds: [buildAdventureEmbed(adventure, 'Abenteuer')], components: [row], content: '' });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('dtSelect_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        const downtimeId = Number(interaction.values?.[0]);
        if (!Number.isFinite(characterId) || characterId < 1 || !Number.isFinite(downtimeId) || downtimeId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await interaction.update({ content: 'Downtime nicht gefunden.', embeds: [], components: [] });
            return true;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtEdit_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Bearbeiten')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtDelete_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('L\u00f6schen')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                .setLabel('Zur\u00fcck')
                .setStyle(ButtonStyle.Secondary),
        );

        await interaction.update({ embeds: [buildDowntimeEmbed(downtime, 'Downtime')], components: [row], content: '' });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advEdit_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await findAdventureForDiscord(interaction.user, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.reply({ content: 'Abenteuer nicht gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const modal = new ModalBuilder()
            .setCustomId(`advUpdateModal_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setTitle('Abenteuer bearbeiten');

        const durationInput = new TextInputBuilder()
            .setCustomId('advDuration')
            .setLabel('Dauer (HH:MM oder Minuten)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(formatDuration(adventure.duration));

        const dateInput = new TextInputBuilder()
            .setCustomId('advDate')
            .setLabel('Datum (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(safeModalValue(adventure.start_date, 10));

        const titleInput = new TextInputBuilder()
            .setCustomId('advTitle')
            .setLabel('Titel (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(safeModalValue(adventure.title));

        const gmInput = new TextInputBuilder()
            .setCustomId('advGm')
            .setLabel('Game Master (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(safeModalValue(adventure.game_master));

        modal.addComponents(
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(gmInput),
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advUpdateModal_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('advDuration'));
        const startDate = parseIsoDate(interaction.fields.getTextInputValue('advDate'));
        const title = (interaction.fields.getTextInputValue('advTitle') || '').trim();
        const gameMaster = (interaction.fields.getTextInputValue('advGm') || '').trim();

        if (duration === null) {
            await interaction.reply({ content: 'Ung\u00fcltige Dauer. Nutze HH:MM (z.B. 03:00) oder Minuten.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!startDate) {
            await interaction.reply({ content: 'Ung\u00fcltiges Datum. Nutze YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const result = await updateAdventureForDiscord(interaction.user, adventureId, {
                duration,
                startDate,
                notes: '',
                title,
                gameMaster,
            });

            if (!result.ok) {
                await interaction.reply({ content: 'Abenteuer nicht gefunden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const adventure = await findAdventureForDiscord(interaction.user, adventureId);
            if (!adventure) {
                await interaction.reply({ content: 'Abenteuer aktualisiert.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`advEdit_${adventureId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Bearbeiten')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`advDelete_${adventureId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('L\u00f6schen')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.reply({
                embeds: [buildAdventureEmbed(adventure, 'Abenteuer aktualisiert')],
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Fehler beim Speichern des Abenteuers.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advDelete_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.update({
            content: 'Abenteuer wirklich l\u00f6schen?',
            components: [buildAdventureDeleteConfirmRow({ adventureId, characterId, ownerDiscordId })],
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('deleteAdventure')) {
        const [action, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'deleteAdventureCancel') {
            const adventure = await findAdventureForDiscord(interaction.user, adventureId);
            if (!adventure || Number(adventure.character_id) !== characterId) {
                await interaction.update({ content: 'Abenteuer nicht gefunden.', embeds: [], components: [] });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`advEdit_${adventureId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Bearbeiten')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`advDelete_${adventureId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('L\u00f6schen')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.update({ content: '', embeds: [buildAdventureEmbed(adventure, 'Abenteuer')], components: [row] });
            return true;
        }

        if (action !== 'deleteAdventureConfirm') return false;

        try {
            const result = await softDeleteAdventureForDiscord(interaction.user, adventureId);
            if (!result.ok) {
                await interaction.update({ content: 'Abenteuer nicht gefunden oder bereits gel\u00f6scht.', embeds: [], components: [] });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck zur Liste')
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.update({ content: 'Abenteuer wurde gel\u00f6scht.', embeds: [], components: [row] });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await interaction.update({ content: notLinkedContent(), embeds: [], components: [] });
                return true;
            }
            await interaction.update({ content: `Fehler beim L\u00f6schen: ${error.message}`, embeds: [], components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advBack_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventures = await listAdventuresForDiscord(interaction.user, characterId, 25);
        if (adventures.length === 0) {
            await interaction.update({ content: 'Keine Abenteuer gefunden.', embeds: [], components: [] });
            return true;
        }

        await interaction.update({
            embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Abenteuer').setDescription('W\u00e4hle ein Abenteuer.')],
            components: [buildAdventureListRow({ characterId, ownerDiscordId, adventures })],
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtEdit_')) {
        const [, downtimeIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const downtimeId = Number(downtimeIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(downtimeId) || downtimeId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await interaction.reply({ content: 'Downtime nicht gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const modal = new ModalBuilder()
            .setCustomId(`dtUpdateModal_${downtimeId}_${characterId}_${ownerDiscordId}`)
            .setTitle('Downtime bearbeiten');

        const typeInput = new TextInputBuilder()
            .setCustomId('dtType')
            .setLabel('Typ')
            .setPlaceholder('faction | other')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(String(downtime.type || 'other'));

        const durationInput = new TextInputBuilder()
            .setCustomId('dtDuration')
            .setLabel('Dauer (HH:MM oder Minuten)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(formatDuration(downtime.duration));

        const dateInput = new TextInputBuilder()
            .setCustomId('dtDate')
            .setLabel('Datum (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(safeModalValue(downtime.start_date, 10));

        const notesInput = new TextInputBuilder()
            .setCustomId('dtNotes')
            .setLabel('Notizen (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setValue(safeModalValue(downtime.notes));

        modal.addComponents(
            new ActionRowBuilder().addComponents(typeInput),
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(notesInput),
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('dtUpdateModal_')) {
        const [, downtimeIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const downtimeId = Number(downtimeIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(downtimeId) || downtimeId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('dtDuration'));
        const typeRaw = String(interaction.fields.getTextInputValue('dtType') || '').trim().toLowerCase();
        const normalizedType = (() => {
            if (['faction', 'f', '1'].includes(typeRaw)) return 'faction';
            if (['other', 'o', '2'].includes(typeRaw)) return 'other';
            return null;
        })();
        const startDate = parseIsoDate(interaction.fields.getTextInputValue('dtDate'));
        const notes = (interaction.fields.getTextInputValue('dtNotes') || '').trim();

        if (!normalizedType) {
            await interaction.reply({ content: 'Ung\u00fcltiger Typ. Nutze `faction` oder `other`.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (duration === null) {
            await interaction.reply({ content: 'Ung\u00fcltige Dauer. Nutze HH:MM (z.B. 03:00) oder Minuten.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!startDate) {
            await interaction.reply({ content: 'Ung\u00fcltiges Datum. Nutze YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const result = await updateDowntimeForDiscord(interaction.user, downtimeId, {
                duration,
                startDate,
                type: normalizedType,
                notes,
            });
            if (!result.ok) {
                await interaction.reply({ content: 'Downtime nicht gefunden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
            if (!downtime) {
                await interaction.reply({ content: 'Downtime aktualisiert.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtEdit_${downtimeId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Bearbeiten')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`dtDelete_${downtimeId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('L\u00f6schen')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.reply({
                embeds: [buildDowntimeEmbed(downtime, 'Downtime aktualisiert')],
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Fehler beim Speichern der Downtime.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtDelete_')) {
        const [, downtimeIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const downtimeId = Number(downtimeIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(downtimeId) || downtimeId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.update({
            content: 'Downtime wirklich l\u00f6schen?',
            components: [buildDowntimeDeleteConfirmRow({ downtimeId, characterId, ownerDiscordId })],
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('deleteDowntime')) {
        const [action, downtimeIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const downtimeId = Number(downtimeIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(downtimeId) || downtimeId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'deleteDowntimeCancel') {
            const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
            if (!downtime || Number(downtime.character_id) !== characterId) {
                await interaction.update({ content: 'Downtime nicht gefunden.', embeds: [], components: [] });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtEdit_${downtimeId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Bearbeiten')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`dtDelete_${downtimeId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('L\u00f6schen')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.update({ content: '', embeds: [buildDowntimeEmbed(downtime, 'Downtime')], components: [row] });
            return true;
        }

        if (action !== 'deleteDowntimeConfirm') return false;

        try {
            const result = await softDeleteDowntimeForDiscord(interaction.user, downtimeId);
            if (!result.ok) {
                await interaction.update({ content: 'Downtime nicht gefunden oder bereits gel\u00f6scht.', embeds: [], components: [] });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck zur Liste')
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.update({ content: 'Downtime wurde gel\u00f6scht.', embeds: [], components: [row] });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await interaction.update({ content: notLinkedContent(), embeds: [], components: [] });
                return true;
            }
            await interaction.update({ content: `Fehler beim L\u00f6schen: ${error.message}`, embeds: [], components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtBack_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtimes = await listDowntimesForDiscord(interaction.user, characterId, 25);
        if (downtimes.length === 0) {
            await interaction.update({ content: 'Keine Downtimes gefunden.', embeds: [], components: [] });
            return true;
        }

        await interaction.update({
            embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Downtime').setDescription('W\u00e4hle eine Downtime.')],
            components: [buildDowntimeListRow({ characterId, ownerDiscordId, downtimes })],
            content: '',
        });
        return true;
    }

    return false;
}

module.exports = { handle };
