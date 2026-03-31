const crypto = require('node:crypto');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
} = require('discord.js');
const { getLinkedUserLocaleForDiscord } = require('../appDb');
const { t } = require('../i18n');
const { buildErrorEmbed, buildInfoEmbed, buildSuccessEmbed, buildWarningEmbed } = require('../utils/noticeEmbeds');
const { isThreadChannel } = require('./newGameHelpers');

const DRAW_SESSION_TTL_MS = 15 * 60 * 1000;
const drawSessions = new Map();

function cleanupExpiredSessions() {
    const now = Date.now();

    for (const [sessionId, session] of drawSessions.entries()) {
        if ((session?.createdAt ?? 0) + DRAW_SESSION_TTL_MS < now) {
            drawSessions.delete(sessionId);
        }
    }
}

function parseEmojiInput(input) {
    const raw = String(input || '').trim();
    const customMatch = raw.match(/^<a?:([^:>]+):(\d+)>$/);
    const shortcodeMatch = raw.match(/^:([^:]+):$/);

    if (customMatch) {
        return {
            raw,
            display: raw,
            id: customMatch[2],
            name: customMatch[1],
        };
    }

    if (shortcodeMatch) {
        return {
            raw,
            display: raw,
            id: null,
            name: shortcodeMatch[1],
        };
    }

    return {
        raw,
        display: raw,
        id: null,
        name: raw,
    };
}

function reactionMatchesInput(reaction, emojiInput) {
    if (!reaction?.emoji || !emojiInput?.raw) {
        return false;
    }

    const emoji = reaction.emoji;
    const normalizedCandidates = new Set([
        String(emojiInput.raw || ''),
        String(emojiInput.id || ''),
        String(emojiInput.name || ''),
        String(emojiInput.raw || '').replaceAll(':', ''),
        String(emojiInput.name || '').toLowerCase(),
        String(emojiInput.raw || '').replaceAll(':', '').toLowerCase(),
    ].filter(Boolean));
    const candidates = new Set([
        String(emojiInput.raw || ''),
        String(emojiInput.id || ''),
        String(emojiInput.name || ''),
    ].filter(Boolean));

    if (emoji.id && candidates.has(String(emoji.id))) {
        return true;
    }

    if (emoji.name && candidates.has(String(emoji.name))) {
        return true;
    }

    if (emoji.name && normalizedCandidates.has(String(emoji.name).toLowerCase())) {
        return true;
    }

    if (typeof emoji.toString === 'function' && candidates.has(String(emoji.toString()))) {
        return true;
    }

    if (typeof emoji.toString === 'function') {
        const emojiString = String(emoji.toString());
        if (
            normalizedCandidates.has(emojiString)
            || normalizedCandidates.has(emojiString.replaceAll(':', ''))
            || normalizedCandidates.has(emojiString.toLowerCase())
            || normalizedCandidates.has(emojiString.replaceAll(':', '').toLowerCase())
        ) {
            return true;
        }
    }

    return false;
}

function drawParticipants(participants, winnerCount) {
    const pool = [...participants];

    for (let index = pool.length - 1; index > 0; index -= 1) {
        const randomIndex = crypto.randomInt(index + 1);
        [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
    }

    const winners = pool.slice(0, Math.max(0, winnerCount));

    return { winners };
}

function buildFixedCustomId(sessionId, ownerId) {
    return `reaction-draw:fixed:${sessionId}:${ownerId}`;
}

function buildConfirmCustomId(sessionId, ownerId) {
    return `reaction-draw:confirm:${sessionId}:${ownerId}`;
}

function buildRerollCustomId(sessionId, ownerId) {
    return `reaction-draw:reroll:${sessionId}:${ownerId}`;
}

function buildCancelCustomId(sessionId, ownerId) {
    return `reaction-draw:cancel:${sessionId}:${ownerId}`;
}

function parseActionCustomId(customId) {
    const parts = String(customId || '').split(':');
    if (parts.length !== 4 || parts[0] !== 'reaction-draw') {
        return null;
    }

    const [, action, sessionId, ownerId] = parts;
    if (!['confirm', 'reroll', 'cancel'].includes(action)) {
        return null;
    }

    return { action, sessionId, ownerId };
}

function parseFixedCustomId(customId) {
    const parts = String(customId || '').split(':');
    if (parts.length !== 4 || parts[0] !== 'reaction-draw' || parts[1] !== 'fixed') {
        return null;
    }

    const [, , sessionId, ownerId] = parts;

    return { action: 'fixed', sessionId, ownerId };
}

function formatPreviewUserLines(users, locale) {
    const visible = users.slice(0, 25).map((user, index) => `${index + 1}. ${user.label}`);

    if (users.length > 25) {
        visible.push(t('reactionDraw.previewMoreUsers', { count: users.length - 25 }, locale));
    }

    return visible.join('\n');
}

function formatMentionList(users, locale) {
    if (!users.length) {
        return t('reactionDraw.none', {}, locale);
    }

    return users.map((user, index) => `${index + 1}. <@${user.id}>`).join('\n');
}

function buildPublicMentionContent(users) {
    if (!users.length) {
        return '';
    }

    return users.map(user => `<@${user.id}>`).join(' ');
}

function recomputeSessionWinners(session) {
    const fixedIds = new Set(session.fixedParticipantIds || []);
    const fixedParticipants = session.participants.filter(user => fixedIds.has(user.id));
    const remainingParticipants = session.participants.filter(user => !fixedIds.has(user.id));
    const remainingSlots = Math.max(0, session.requestedWinnerCount - fixedParticipants.length);
    const { winners: drawnParticipants } = drawParticipants(remainingParticipants, remainingSlots);

    session.fixedParticipants = fixedParticipants;
    session.drawnParticipants = drawnParticipants;
    session.winners = [...fixedParticipants, ...drawnParticipants];

    return session;
}

function buildPublicResultEmbed(session) {
    return new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle(t('reactionDraw.publicTitle', {}, session.locale))
        .setDescription([
            t('reactionDraw.previewEmoji', { emoji: session.reactionDisplay }, session.locale),
            t('reactionDraw.previewParticipantCount', { count: session.participants.length }, session.locale),
            '',
            t('reactionDraw.publicSelectedIntro', {}, session.locale),
        ].join('\n'))
        .addFields(
            ...(session.fixedParticipants?.length
                ? [{
                    name: t('reactionDraw.fixedParticipants', {}, session.locale),
                    value: formatMentionList(session.fixedParticipants, session.locale),
                }]
                : []),
            ...((session.drawnParticipants?.length && session.fixedParticipants?.length) || (!session.fixedParticipants?.length)
                ? [{
                    name: t('reactionDraw.drawnParticipants', {}, session.locale),
                    value: formatMentionList(session.drawnParticipants?.length ? session.drawnParticipants : session.winners, session.locale),
                }]
                : []),
            {
                name: t('reactionDraw.publicSheetsField', {}, session.locale),
                value: t('reactionDraw.publicSheetsNotice', { creator: `<@${session.ownerId}>` }, session.locale),
            },
        )
        .setTimestamp(new Date());
}

function findEmojiByName(cache, name) {
    if (!cache?.find || !name) {
        return null;
    }

    return cache.find(emoji => String(emoji.name || '').toLowerCase() === String(name).toLowerCase()) ?? null;
}

async function resolveReactionDisplay(reaction, fallbackEmojiInput, guild = null, client = null) {
    if (fallbackEmojiInput?.id && client?.emojis?.cache?.get) {
        const resolvedById = client.emojis.cache.get(String(fallbackEmojiInput.id));
        if (resolvedById) {
            return resolvedById.toString();
        }
    }

    if (fallbackEmojiInput?.name && guild?.emojis?.fetch) {
        const guildEmojiCache = await guild.emojis.fetch().catch(() => guild.emojis.cache ?? null);
        const resolvedGuildEmoji = findEmojiByName(guildEmojiCache, fallbackEmojiInput.name);
        if (resolvedGuildEmoji) {
            return resolvedGuildEmoji.toString();
        }
    }

    if (fallbackEmojiInput?.name && client?.emojis?.cache) {
        const resolvedClientEmoji = findEmojiByName(client.emojis.cache, fallbackEmojiInput.name);
        if (resolvedClientEmoji) {
            return resolvedClientEmoji.toString();
        }
    }

    if (reaction?.emoji?.id && reaction?.emoji?.name) {
        const prefix = reaction.emoji.animated ? '<a:' : '<:';
        return `${prefix}${reaction.emoji.name}:${reaction.emoji.id}>`;
    }

    if (reaction?.emoji?.identifier && reaction.emoji.identifier.includes(':')) {
        const [name, id] = String(reaction.emoji.identifier).split(':');
        if (name && id) {
            const prefix = reaction.emoji.animated ? '<a:' : '<:';
            return `${prefix}${name}:${id}>`;
        }
    }

    if (reaction?.emoji?.name && client?.emojis?.cache) {
        const resolvedEmoji = client.emojis.cache.find(emoji => String(emoji.name || '').toLowerCase() === String(reaction.emoji.name).toLowerCase());
        if (resolvedEmoji) {
            return resolvedEmoji.toString();
        }
    }

    if (reaction?.emoji && typeof reaction.emoji.toString === 'function') {
        const rendered = String(reaction.emoji.toString()).trim();
        if (rendered && rendered !== `:${reaction?.emoji?.name || ''}:`) {
            return rendered;
        }
    }

    if (reaction?.emoji?.name) {
        return String(reaction.emoji.name);
    }

    return fallbackEmojiInput?.display || fallbackEmojiInput?.raw || '?';
}

function buildPreviewEmbed(session) {
    const embed = new EmbedBuilder()
        .setColor(0x4f46e5)
        .setTitle(t('reactionDraw.previewTitle', {}, session.locale))
        .setDescription([
            t('reactionDraw.previewIntro', {}, session.locale),
            t('reactionDraw.previewSource', { url: session.messageUrl }, session.locale),
            t('reactionDraw.previewEmoji', { emoji: session.reactionDisplay }, session.locale),
            t('reactionDraw.previewParticipantCount', { count: session.participants.length }, session.locale),
        ].join('\n'))
        .addFields(
            {
                name: t('reactionDraw.previewParticipants', {}, session.locale),
                value: formatPreviewUserLines(session.participants, session.locale),
            },
            ...(session.fixedParticipants?.length
                ? [{
                    name: t('reactionDraw.fixedParticipants', {}, session.locale),
                    value: formatMentionList(session.fixedParticipants, session.locale),
                    inline: true,
                }]
                : []),
            ...(session.drawnParticipants?.length && session.fixedParticipants?.length
                ? [{
                    name: t('reactionDraw.drawnParticipants', {}, session.locale),
                    value: formatMentionList(session.drawnParticipants, session.locale),
                    inline: true,
                }]
                : (!session.fixedParticipants?.length ? [{
                    name: t('reactionDraw.previewCurrentSelection', {}, session.locale),
                    value: formatMentionList(session.winners, session.locale),
                    inline: true,
                }] : [])),
        )
        .setTimestamp(new Date());

    if (session.participants.length < session.requestedWinnerCount) {
        embed.addFields({
            name: t('reactionDraw.previewNote', {}, session.locale),
            value: t(
                'reactionDraw.previewNotEnoughParticipants',
                {
                    requested: session.requestedWinnerCount,
                    actual: session.participants.length,
                },
                session.locale,
            ),
        });
    }

    return embed;
}

function buildPreviewComponents(session) {
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(buildConfirmCustomId(session.id, session.ownerId))
                .setLabel(t('reactionDraw.confirm', {}, session.locale))
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(buildRerollCustomId(session.id, session.ownerId))
                .setLabel(t('reactionDraw.reroll', {}, session.locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(buildCancelCustomId(session.id, session.ownerId))
                .setLabel(t('reactionDraw.cancel', {}, session.locale))
                .setStyle(ButtonStyle.Danger),
        ),
    ];

    const selectOptions = session.participants.slice(0, 25).map(user => ({
        label: user.label.slice(0, 100),
        value: user.id,
        default: (session.fixedParticipantIds || []).includes(user.id),
    }));

    if (selectOptions.length) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(buildFixedCustomId(session.id, session.ownerId))
                    .setPlaceholder(t('reactionDraw.fixedSelectPlaceholder', {}, session.locale))
                    .setMinValues(0)
                    .setMaxValues(Math.min(session.requestedWinnerCount, selectOptions.length))
                    .addOptions(selectOptions),
            ),
        );
    }

    return rows;
}

async function collectCandidateMessages(thread) {
    const candidates = [];
    const seenMessageIds = new Set();
    const addCandidate = (message) => {
        if (!message?.id || seenMessageIds.has(String(message.id))) {
            return;
        }

        seenMessageIds.add(String(message.id));
        candidates.push(message);
    };

    if (typeof thread.fetchStarterMessage === 'function') {
        addCandidate(await thread.fetchStarterMessage().catch(() => null));
    }

    if (thread.parent?.messages?.fetch) {
        addCandidate(await thread.parent.messages.fetch(String(thread.id)).catch(() => null));
    }

    const recentMessages = await thread.messages?.fetch?.({ limit: 50 }).catch(() => null);
    if (recentMessages?.values) {
        for (const message of recentMessages.values()) {
            addCandidate(message);
        }
    }

    return candidates;
}

async function resolveReactionTarget(thread, emojiInput, ownerId) {
    const candidates = await collectCandidateMessages(thread);
    const starter = candidates[0] ?? null;

    const matches = candidates
        .filter(message => String(message?.author?.id || '') === String(ownerId))
        .map(message => ({
            message,
            reaction: message.reactions?.cache?.find(candidate => reactionMatchesInput(candidate, emojiInput)) ?? null,
        }))
        .filter(entry => entry.reaction);

    if (matches.length === 0) {
        return { kind: 'missing_reaction', message: starter ?? candidates[0] ?? null };
    }

    if (matches.length > 1) {
        return {
            kind: 'ambiguous',
            matches: matches.map(entry => ({
                id: String(entry.message.id),
                url: entry.message.url,
                preview: String(entry.message.content || '').slice(0, 80) || '(no text)',
            })),
        };
    }

    return {
        kind: 'ok',
        message: matches[0].message,
        reaction: matches[0].reaction,
    };
}

async function buildSessionFromInteraction(interaction) {
    const locale = await getLinkedUserLocaleForDiscord(interaction.user).catch(() => null);

    if (!isThreadChannel(interaction.channel)) {
        return {
            ok: false,
            locale,
            embed: buildWarningEmbed(
                t('reactionDraw.threadOnlyTitle', {}, locale),
                t('reactionDraw.threadOnlyBody', {}, locale),
            ),
        };
    }

    const emoji = parseEmojiInput(interaction.options.getString('emoji', true));
    const requestedWinnerCount = interaction.options.getInteger('count', true);
    const target = await resolveReactionTarget(interaction.channel, emoji, interaction.user.id);

    if (target.kind === 'ambiguous') {
        return {
            ok: false,
            locale,
            embed: buildWarningEmbed(
                t('reactionDraw.ambiguousTitle', {}, locale),
                [
                    t('reactionDraw.ambiguousBody', {}, locale),
                    ...target.matches.slice(0, 5).map(match => `- ${match.id}: ${match.preview}`),
                ].join('\n'),
            ),
        };
    }

    if (target.kind === 'missing_reaction') {
        return {
            ok: false,
            locale,
            embed: buildWarningEmbed(
                t('reactionDraw.reactionNotFoundTitle', {}, locale),
                t('reactionDraw.reactionNotFoundBody', { emoji: emoji.display }, locale),
            ),
        };
    }

    const targetMessage = target.message;
    const reaction = target.reaction;
    const users = await reaction.users.fetch().catch(() => null);
    const participants = Array.from(users?.values?.() ?? [])
        .filter(user => user && !user.bot)
        .map(user => ({
            id: String(user.id),
            label: user.globalName || user.username || String(user.id),
        }));

    if (!participants.length) {
        return {
            ok: false,
            locale,
            embed: buildWarningEmbed(
                t('reactionDraw.noParticipantsTitle', {}, locale),
                t('reactionDraw.noParticipantsBody', { emoji: emoji.display }, locale),
            ),
        };
    }

    const winnerCount = Math.min(requestedWinnerCount, participants.length);
    const { winners } = drawParticipants(participants, winnerCount);

    return {
        ok: true,
        session: {
            id: interaction.id,
            ownerId: String(interaction.user.id),
            locale,
            createdAt: Date.now(),
            threadId: String(interaction.channel.id),
            messageId: String(targetMessage.id),
            messageUrl: targetMessage.url,
            emoji,
            reactionDisplay: await resolveReactionDisplay(reaction, emoji, interaction.guild, interaction.client),
            requestedWinnerCount,
            participants,
            fixedParticipantIds: [],
            fixedParticipants: [],
            drawnParticipants: winners,
            winners,
        },
    };
}

async function showPreview(interaction) {
    cleanupExpiredSessions();
    const result = await buildSessionFromInteraction(interaction);

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    if (!result.ok) {
        await interaction.editReply({
            content: '',
            embeds: [result.embed],
            components: [],
        });
        return;
    }

    drawSessions.set(result.session.id, result.session);

    await interaction.editReply({
        content: '',
        embeds: [buildPreviewEmbed(result.session)],
        components: buildPreviewComponents(result.session),
    });
}

async function postConfirmedResult(interaction, session) {
    const thread = interaction.client.channels?.cache?.get(session.threadId)
        || await interaction.client.channels.fetch(session.threadId).catch(() => null);

    if (!thread?.send) {
        return { ok: false };
    }

    const embed = buildPublicResultEmbed(session);

    await thread.send({
        content: buildPublicMentionContent(session.winners),
        allowedMentions: {
            users: session.winners.map(user => user.id),
        },
        embeds: [embed],
    });

    return { ok: true };
}

async function handle(interaction) {
    const isButton = typeof interaction.isButton === 'function' && interaction.isButton();
    const isStringSelectMenu = typeof interaction.isStringSelectMenu === 'function' && interaction.isStringSelectMenu();

    if (!isButton && !isStringSelectMenu) {
        return false;
    }

    const parsed = parseActionCustomId(interaction.customId) || parseFixedCustomId(interaction.customId);
    if (!parsed) {
        return false;
    }

    cleanupExpiredSessions();
    const session = drawSessions.get(parsed.sessionId);

    if (!session || session.ownerId !== parsed.ownerId || interaction.user.id !== parsed.ownerId) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
                embeds: [buildErrorEmbed(
                    t('reactionDraw.actionDeniedTitle', {}, null),
                    t('reactionDraw.actionDeniedBody', {}, null),
                )],
                flags: MessageFlags.Ephemeral,
            });
        }
        return true;
    }

    if (parsed.action === 'fixed') {
        session.fixedParticipantIds = (interaction.values || []).slice(0, session.requestedWinnerCount);
        recomputeSessionWinners(session);
        session.createdAt = Date.now();
        drawSessions.set(parsed.sessionId, session);

        await interaction.update({
            content: '',
            embeds: [buildPreviewEmbed(session)],
            components: buildPreviewComponents(session),
        });
        return true;
    }

    if (parsed.action === 'cancel') {
        drawSessions.delete(parsed.sessionId);
        await interaction.update({
            content: '',
            embeds: [buildInfoEmbed(
                t('reactionDraw.cancelledTitle', {}, session.locale),
                t('reactionDraw.cancelledBody', {}, session.locale),
            )],
            components: [],
        });
        return true;
    }

    if (parsed.action === 'reroll') {
        recomputeSessionWinners(session);
        session.createdAt = Date.now();
        drawSessions.set(parsed.sessionId, session);

        await interaction.update({
            content: '',
            embeds: [buildPreviewEmbed(session)],
            components: buildPreviewComponents(session),
        });
        return true;
    }

    if (parsed.action === 'confirm') {
        const posted = await postConfirmedResult(interaction, session);
        drawSessions.delete(parsed.sessionId);

        if (!posted.ok) {
            await interaction.update({
                content: '',
                embeds: [buildErrorEmbed(
                    t('reactionDraw.postFailedTitle', {}, session.locale),
                    t('reactionDraw.postFailedBody', {}, session.locale),
                )],
                components: [],
            });
            return true;
        }

        await interaction.update({
            content: '',
            embeds: [buildSuccessEmbed(
                t('reactionDraw.confirmedTitle', {}, session.locale),
                t('reactionDraw.confirmedBody', {}, session.locale),
            )],
            components: [],
        });
        return true;
    }

    return false;
}

module.exports = {
    showPreview,
    handle,
    parseEmojiInput,
    reactionMatchesInput,
    resolveReactionTarget,
    drawParticipants,
    resolveReactionDisplay,
    buildPublicMentionContent,
    buildPreviewEmbed,
    buildPreviewComponents,
    buildPublicResultEmbed,
    buildFixedCustomId,
    buildConfirmCustomId,
    buildRerollCustomId,
    buildCancelCustomId,
    parseActionCustomId,
    parseFixedCustomId,
};
