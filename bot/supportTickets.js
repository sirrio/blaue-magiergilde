const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { supportStaffRoleIds } = require('./config');
const { getChannelOverrideId } = require('./channelOverride');
const { getUserLocaleByDiscordId } = require('./appDb');
const { t } = require('./i18n');

const CLOSE_COMMANDS = new Set(['close', '/close', '!close', 'ticket close', '!ticket close']);
const CLAIM_COMMANDS = new Set(['claim', '/claim', '!claim', 'ticket claim', '!ticket claim']);
const UNCLAIM_COMMANDS = new Set(['unclaim', '/unclaim', '!unclaim', 'ticket unclaim', '!ticket unclaim']);
const REOPEN_COMMANDS = new Set(['reopen', '/reopen', '!reopen', 'ticket reopen', '!ticket reopen']);

const MAX_RELAY_CONTENT_LENGTH = 1800;
const SETTINGS_CACHE_TTL_MS = 60 * 1000;
const ACTIVE_TICKET_STATUSES = ['open', 'pending_user', 'pending_staff'];

const STATUS_META = {
    open: { label: 'Open', emoji: '🟢', color: 0x22c55e },
    pending_staff: { label: 'Pending staff', emoji: '🟠', color: 0xf59e0b },
    pending_user: { label: 'Pending user', emoji: '🔵', color: 0x3b82f6 },
    closed: { label: 'Closed', emoji: '⚫', color: 0x6b7280 },
};
const NOTICE_COLORS = {
    info: 0x4f46e5,
    success: 0x22c55e,
    warning: 0xf59e0b,
    error: 0xef4444,
};

let cachedSupportTicketChannelId = '';
let settingsLoadedAt = 0;

const PENDING_CONFIRMATION_TTL_MS = 5 * 60 * 1000; // 5 minutes
const pendingConfirmations = new Map(); // userId -> { message, expiresAt }

function getDb() {
    return require('./db');
}

function normalizeWhitespace(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeMessageText(value) {
    return String(value || '').trim();
}

function truncateText(value, maxLength = MAX_RELAY_CONTENT_LENGTH) {
    const text = String(value || '');
    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function normalizeCommandText(content) {
    return normalizeWhitespace(content).toLowerCase();
}

function formatUserLabel(user) {
    if (!user) {
        return t('support.unknownUser');
    }

    if (user.tag) {
        return user.tag;
    }

    if (user.globalName) {
        return user.globalName;
    }

    if (user.username) {
        return user.username;
    }

    return String(user.id || 'unknown');
}

function attachmentUrlsFromMessage(message) {
    const attachments = message?.attachments;
    if (!attachments || typeof attachments.values !== 'function') {
        return [];
    }

    return [...attachments.values()]
        .map(attachment => String(attachment?.url || '').trim())
        .filter(Boolean);
}

function hasRelayPayload(message) {
    const content = normalizeMessageText(message?.content);
    if (content !== '') {
        return true;
    }

    return attachmentUrlsFromMessage(message).length > 0;
}

function isActiveTicketStatus(status) {
    return ACTIVE_TICKET_STATUSES.includes(String(status || '').trim());
}

function statusMeta(status) {
    return STATUS_META[String(status || '').trim()] || STATUS_META.open;
}

function statusBadge(status) {
    const meta = statusMeta(status);
    return `${meta.emoji} ${meta.label}`;
}

function statusColor(status) {
    return statusMeta(status).color;
}

async function resolveLocaleForDiscordId(discordUserId) {
    return await getUserLocaleByDiscordId(discordUserId);
}

function buildTicketStateLine(status, assignedToDiscordId) {
    const assignment = assignedToDiscordId ? ` | 👤 <@${assignedToDiscordId}>` : '';
    return `**State:** ${statusBadge(status)}${assignment}`;
}

function buildAttachmentLinks(attachmentUrls) {
    return attachmentUrls
        .map((url, index) => `- [Attachment ${index + 1}](${url})`)
        .join('\n');
}

function toRelativeTimestamp(value) {
    const parsed = value ? new Date(value) : new Date();
    const millis = Number.isFinite(parsed.getTime()) ? parsed.getTime() : Date.now();
    const seconds = Math.max(1, Math.floor(millis / 1000));
    return `<t:${seconds}:R>`;
}

function isTicketCloseCommand(content) {
    return CLOSE_COMMANDS.has(normalizeCommandText(content));
}

function isTicketClaimCommand(content) {
    return CLAIM_COMMANDS.has(normalizeCommandText(content));
}

function isTicketUnclaimCommand(content) {
    return UNCLAIM_COMMANDS.has(normalizeCommandText(content));
}

function isTicketReopenCommand(content) {
    return REOPEN_COMMANDS.has(normalizeCommandText(content));
}

function isTicketCommand(content) {
    return (
        isTicketCloseCommand(content) ||
        isTicketClaimCommand(content) ||
        isTicketUnclaimCommand(content) ||
        isTicketReopenCommand(content)
    );
}

function parseTicketControlCustomId(customId) {
    const parts = String(customId || '').split(':');
    if (parts.length !== 3 || parts[0] !== 'support-ticket') {
        return null;
    }

    const action = String(parts[1] || '').trim().toLowerCase();
    if (!['claim', 'unclaim', 'close', 'reopen'].includes(action)) {
        return null;
    }

    const ticketId = Number(parts[2]);
    if (!Number.isFinite(ticketId) || ticketId <= 0) {
        return null;
    }

    return {
        action,
        ticketId: Math.floor(ticketId),
    };
}

function parsePendingConfirmCustomId(customId) {
    const parts = String(customId || '').split(':');
    if (parts.length !== 3 || parts[0] !== 'support-pending') {
        return null;
    }

    const action = String(parts[1] || '').trim().toLowerCase();
    if (!['confirm', 'cancel'].includes(action)) {
        return null;
    }

    const userId = String(parts[2] || '').trim();
    if (!userId) {
        return null;
    }

    return { action, userId };
}

function buildPendingConfirmationMessage(userId, messagePreview, locale) {
    const previewText = truncateText(messagePreview, 200);
    const embed = new EmbedBuilder()
        .setColor(NOTICE_COLORS.info)
        .setTitle(t('support.confirmTitle', {}, locale))
        .setDescription(t('support.confirmBody', {}, locale))
        .addFields({ name: t('support.confirmPreviewLabel', {}, locale), value: previewText || t('support.relayNoText', {}, locale) });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`support-pending:confirm:${userId}`)
            .setLabel(t('support.confirmSend', {}, locale))
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`support-pending:cancel:${userId}`)
            .setLabel(t('support.confirmCancel', {}, locale))
            .setStyle(ButtonStyle.Secondary),
    );

    return { embeds: [embed], components: [row] };
}

function buildTicketThreadName(user) {
    const label = normalizeWhitespace(formatUserLabel(user)).replace(/[^a-zA-Z0-9 _-]/g, '');
    const base = label !== '' ? label : `user-${String(user?.id || 'unknown')}`;
    return `inbox-${base}`.slice(0, 90);
}

function buildUserRelayContent(message, locale = null) {
    const userName = formatUserLabel(message?.author);
    const body = normalizeMessageText(message?.content);
    const attachmentUrls = attachmentUrlsFromMessage(message);
    const sections = [`👤 ${userName}: ${body !== '' ? truncateText(body) : t('support.relayNoText', {}, locale)}`];

    if (attachmentUrls.length > 0) {
        sections.push(t(
            attachmentUrls.length === 1 ? 'support.relayAttachmentCountSingular' : 'support.relayAttachmentCountPlural',
            { count: attachmentUrls.length },
            locale,
        ));
        sections.push(buildAttachmentLinks(attachmentUrls));
    }

    return truncateText(sections.join('\n\n'));
}

function buildStaffRelayContent(message, locale = null) {
    const supportName = formatUserLabel(message?.author);
    const body = normalizeMessageText(message?.content);
    const attachmentUrls = attachmentUrlsFromMessage(message);
    const sections = [`🛠 ${supportName}: ${body !== '' ? truncateText(body) : t('support.relayNoText', {}, locale)}`];

    if (attachmentUrls.length > 0) {
        sections.push(t(
            attachmentUrls.length === 1 ? 'support.relayAttachmentCountSingular' : 'support.relayAttachmentCountPlural',
            { count: attachmentUrls.length },
            locale,
        ));
        sections.push(buildAttachmentLinks(attachmentUrls));
    }

    return truncateText(sections.join('\n\n'));
}

function buildTicketHeaderEmbed(ticket) {
    const status = String(ticket.status || 'open');
    const locale = ticket.locale || null;
    const assignee = ticket.assigned_to_discord_id ? `<@${ticket.assigned_to_discord_id}>` : t('support.unassigned', {}, locale);

    return new EmbedBuilder()
        .setColor(statusColor(status))
        .setTitle(t('support.headerTitle', { id: ticket.id }, locale))
        .setDescription([
            t('support.headerUser', { userId: ticket.user_discord_id }, locale),
            t('support.headerStatus', { status: statusBadge(status) }, locale),
            t('support.headerAssignee', { assignee }, locale),
            t('support.headerUpdated', { timestamp: toRelativeTimestamp(ticket.updated_at) }, locale),
        ].join('\n'))
        .setTimestamp(new Date());
}

function buildTicketSummaryContent(ticket, userLabel, locale = null) {
    const cleanLabel = normalizeWhitespace(userLabel) || `user-${String(ticket?.user_discord_id || 'unknown')}`;
    const assigned = ticket?.assigned_to_discord_id ? `<@${ticket.assigned_to_discord_id}>` : t('support.unassigned', {}, locale);
    const status = String(ticket?.status || 'open');
    return [
        t('support.summaryTitle', { id: ticket.id, userId: ticket.user_discord_id, label: cleanLabel }, locale),
        t('support.summaryStatus', { status: statusBadge(status) }, locale),
        t('support.summaryAssignee', { assignee: assigned }, locale),
        t('support.summaryUpdated', { timestamp: toRelativeTimestamp(ticket.updated_at) }, locale),
    ].join('\n');
}

function buildTicketHeaderComponents(ticket, locale = null) {
    const status = String(ticket?.status || 'open');
    const isClosed = status === 'closed';
    const hasAssignee = String(ticket?.assigned_to_discord_id || '').trim() !== '';

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`support-ticket:claim:${ticket.id}`)
            .setLabel(t('support.buttonClaim', {}, locale))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isClosed || hasAssignee),
        new ButtonBuilder()
            .setCustomId(`support-ticket:unclaim:${ticket.id}`)
            .setLabel(t('support.buttonUnclaim', {}, locale))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isClosed || !hasAssignee),
        new ButtonBuilder()
            .setCustomId(`support-ticket:close:${ticket.id}`)
            .setLabel(t('support.buttonClose', {}, locale))
            .setStyle(ButtonStyle.Danger)
            .setDisabled(isClosed),
        new ButtonBuilder()
            .setCustomId(`support-ticket:reopen:${ticket.id}`)
            .setLabel(t('support.buttonReopen', {}, locale))
            .setStyle(ButtonStyle.Success)
            .setDisabled(!isClosed)
    );

    return [row];
}

function isStaffTicketActor(guildId, member) {
    if (!guildId) {
        return false;
    }

    if (!member) {
        return false;
    }

    if (member.permissions?.has?.('ManageThreads')) {
        return true;
    }

    if (!Array.isArray(supportStaffRoleIds) || supportStaffRoleIds.length === 0) {
        return true;
    }

    return supportStaffRoleIds.some(roleId => member.roles?.cache?.has?.(String(roleId)));
}

function isStaffTicketMessage(message) {
    return isStaffTicketActor(message?.guildId, message?.member);
}

function isClaimedByOther(ticket, discordUserId) {
    const assignedTo = String(ticket?.assigned_to_discord_id || '').trim();
    if (!assignedTo) {
        return false;
    }

    return assignedTo !== String(discordUserId || '').trim();
}

function markTicketUpdated(ticket) {
    if (!ticket || typeof ticket !== 'object') {
        return;
    }

    ticket.updated_at = new Date().toISOString();
}

function detectNoticeKind(details) {
    const cleanDetails = String(details || '').trim();
    if (cleanDetails.startsWith('❌') || cleanDetails.startsWith('⛔')) {
        return 'error';
    }
    if (cleanDetails.startsWith('⚠')) {
        return 'warning';
    }
    if (cleanDetails.startsWith('✅')) {
        return 'success';
    }

    return 'info';
}

function withErrorPrefix(title) {
    const cleanTitle = normalizeWhitespace(title) || 'Inbox';
    if (cleanTitle.startsWith('⚠') || cleanTitle.startsWith('❌') || cleanTitle.startsWith('⛔')) {
        return cleanTitle;
    }

    return `⚠️ ${cleanTitle}`;
}

function supportDmNotice(title, details = '', kind = null) {
    const cleanDetails = String(details || '').trim();
    const noticeKind = kind || detectNoticeKind(cleanDetails);
    const baseTitle = normalizeWhitespace(title) || t('support.noticeTitle');
    const finalTitle = noticeKind === 'error' ? withErrorPrefix(baseTitle) : baseTitle;
    const embed = new EmbedBuilder()
        .setColor(NOTICE_COLORS[noticeKind] || NOTICE_COLORS.info)
        .setTitle(finalTitle)
        .setTimestamp(new Date());

    if (cleanDetails !== '') {
        embed.setDescription(cleanDetails);
    }

    return embed;
}

async function sendThreadAck(channel, content, locale = null) {
    await channel.send({
        embeds: [supportDmNotice(t('support.actionTitle', {}, locale), content, detectNoticeKind(content))],
    }).catch(() => null);
}

async function sendTemporaryMessage(channel, content, locale = null) {
    let payload;
    if (content instanceof EmbedBuilder) {
        payload = { embeds: [content] };
    } else if (content && typeof content === 'object' && !Array.isArray(content)) {
        payload = content;
    } else {
        const text = String(content || '');
        payload = { embeds: [supportDmNotice(t('support.noticeTitle', {}, locale), text, detectNoticeKind(text))] };
    }

    return channel.send(payload).catch(() => null);
}

async function sendTemporaryDm(user, content, locale = null) {
    return sendTemporaryMessage(user, content, locale);
}

async function deleteCommandMessage(message) {
    await message.delete().catch(() => undefined);
}

async function loadSupportTicketChannelId() {
    const overrideChannelId = getChannelOverrideId();
    if (overrideChannelId) {
        return overrideChannelId;
    }

    const now = Date.now();
    if (now - settingsLoadedAt < SETTINGS_CACHE_TTL_MS) {
        return cachedSupportTicketChannelId;
    }

    settingsLoadedAt = now;
    try {
        const db = getDb();
        const [rows] = await db.execute(
            `SELECT support_ticket_channel_id
             FROM discord_bot_settings
             ORDER BY id
             LIMIT 1`
        );
        cachedSupportTicketChannelId = String(rows?.[0]?.support_ticket_channel_id || '').trim();
    } catch {
        cachedSupportTicketChannelId = '';
    }

    return cachedSupportTicketChannelId;
}

async function findOpenTicketByUserId(userDiscordId) {
    const db = getDb();
    const [rows] = await db.execute(
        `SELECT id, user_discord_id, guild_id, support_channel_id, thread_id, status, assigned_to_discord_id, header_message_id, updated_at
         FROM discord_support_tickets
         WHERE user_discord_id = ? AND status IN ('open', 'pending_user', 'pending_staff')
         ORDER BY id DESC
         LIMIT 1`,
        [String(userDiscordId)]
    );

    return rows[0] || null;
}

async function findTicketByThreadId(threadId) {
    const db = getDb();
    const [rows] = await db.execute(
        `SELECT id, user_discord_id, guild_id, support_channel_id, thread_id, status, assigned_to_discord_id, header_message_id, updated_at
         FROM discord_support_tickets
         WHERE thread_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [String(threadId)]
    );

    return rows[0] || null;
}

async function findTicketById(ticketId) {
    const db = getDb();
    const [rows] = await db.execute(
        `SELECT id, user_discord_id, guild_id, support_channel_id, thread_id, status, assigned_to_discord_id, header_message_id, updated_at
         FROM discord_support_tickets
         WHERE id = ?
         LIMIT 1`,
        [Number(ticketId)]
    );

    return rows[0] || null;
}

async function findLatestTicketByUserId(userDiscordId) {
    const db = getDb();
    const [rows] = await db.execute(
        `SELECT id, user_discord_id, guild_id, support_channel_id, thread_id, status, assigned_to_discord_id, header_message_id, updated_at
         FROM discord_support_tickets
         WHERE user_discord_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [String(userDiscordId)]
    );

    return rows[0] || null;
}

async function insertOpenTicket({ userDiscordId, guildId, supportChannelId, threadId }) {
    const db = getDb();
    const [result] = await db.execute(
        `INSERT INTO discord_support_tickets (
            user_discord_id, guild_id, support_channel_id, thread_id, status, last_user_message_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, 'open', NOW(), NOW(), NOW())`,
        [String(userDiscordId), guildId ? String(guildId) : null, String(supportChannelId), String(threadId)]
    );

    return Number(result.insertId);
}

async function setTicketHeaderMessageId(ticketId, messageId) {
    const db = getDb();
    await db.execute(
        `UPDATE discord_support_tickets
         SET header_message_id = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [messageId ? String(messageId) : null, Number(ticketId)]
    );
}

async function markUserActivity(ticketId) {
    const db = getDb();
    await db.execute(
        `UPDATE discord_support_tickets
         SET last_user_message_at = NOW(),
             status = 'pending_staff',
             updated_at = NOW()
         WHERE id = ? AND status IN ('open', 'pending_user', 'pending_staff')`,
        [Number(ticketId)]
    );
}

async function markStaffActivity(ticketId) {
    const db = getDb();
    await db.execute(
        `UPDATE discord_support_tickets
         SET last_staff_message_at = NOW(),
             status = 'pending_user',
             updated_at = NOW()
         WHERE id = ? AND status IN ('open', 'pending_user', 'pending_staff')`,
        [Number(ticketId)]
    );
}

async function closeActiveTicket(ticketId, closedByDiscordId) {
    const db = getDb();
    const [result] = await db.execute(
        `UPDATE discord_support_tickets
         SET status = 'closed',
             closed_at = NOW(),
             closed_by_discord_id = ?,
             updated_at = NOW()
         WHERE id = ? AND status IN ('open', 'pending_user', 'pending_staff')`,
        [closedByDiscordId ? String(closedByDiscordId) : null, Number(ticketId)]
    );

    return Number(result.affectedRows) > 0;
}

async function reopenClosedTicket(ticketId, nextStatus) {
    const status = nextStatus === 'pending_user' ? 'pending_user' : 'pending_staff';
    const db = getDb();
    const [result] = await db.execute(
        `UPDATE discord_support_tickets
         SET status = ?,
             closed_at = NULL,
             closed_by_discord_id = NULL,
             updated_at = NOW()
         WHERE id = ? AND status = 'closed'`,
        [status, Number(ticketId)]
    );

    return Number(result.affectedRows) > 0;
}

async function setTicketAssignee(ticketId, assignedToDiscordId) {
    const db = getDb();
    await db.execute(
        `UPDATE discord_support_tickets
         SET assigned_to_discord_id = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [assignedToDiscordId ? String(assignedToDiscordId) : null, Number(ticketId)]
    );
}

async function fetchSupportChannel(client) {
    const channelId = await loadSupportTicketChannelId();
    if (!channelId) {
        return null;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
        return null;
    }

    if (!channel.isTextBased?.() || typeof channel.send !== 'function') {
        return null;
    }

    return channel;
}

async function fetchThread(client, threadId) {
    const channel = await client.channels.fetch(String(threadId)).catch(() => null);
    if (!channel || !channel.isThread?.()) {
        return null;
    }

    return channel;
}

async function ensureTicketHeaderMessage(thread, ticket) {
    const locale = ticket.locale || await getUserLocaleByDiscordId(ticket.user_discord_id);
    ticket.locale = locale;
    const embedPayload = {
        embeds: [buildTicketHeaderEmbed(ticket)],
        components: buildTicketHeaderComponents(ticket, locale),
    };
    const headerMessageId = String(ticket.header_message_id || '').trim();
    if (headerMessageId) {
        const existing = await thread.messages.fetch(headerMessageId).catch(() => null);
        if (existing) {
            await existing.edit(embedPayload).catch(() => undefined);
            return existing;
        }
    }

    const created = await thread.send(embedPayload).catch(() => null);
    if (!created) {
        return null;
    }

    await created.pin().catch(() => undefined);
    await setTicketHeaderMessageId(ticket.id, created.id);
    ticket.header_message_id = created.id;
    return created;
}

async function resolveTicketUserLabel(client, userDiscordId, knownUserLabel = '') {
    const cleanedKnownLabel = normalizeWhitespace(knownUserLabel);
    if (cleanedKnownLabel !== '') {
        return cleanedKnownLabel;
    }

    const user = await client.users.fetch(String(userDiscordId)).catch(() => null);
    return normalizeWhitespace(formatUserLabel(user));
}

async function syncTicketSummaryMessage(ticket, client, thread, knownUserLabel = '') {
    if (!thread?.parent?.messages?.fetch) {
        return false;
    }

    let starterMessage = null;
    if (typeof thread.fetchStarterMessage === 'function') {
        starterMessage = await thread.fetchStarterMessage().catch(() => null);
    }

    if (!starterMessage) {
        starterMessage = await thread.parent.messages.fetch(String(thread.id)).catch(() => null);
    }

    if (!starterMessage || typeof starterMessage.edit !== 'function') {
        return false;
    }

    const userLabel = await resolveTicketUserLabel(client, ticket.user_discord_id, knownUserLabel);
    const locale = ticket.locale || await getUserLocaleByDiscordId(ticket.user_discord_id);
    ticket.locale = locale;
    const content = buildTicketSummaryContent(ticket, userLabel, locale);
    if (starterMessage.content === content) {
        return true;
    }

    await starterMessage.edit({ content }).catch(() => undefined);
    return true;
}

async function syncTicketHeader(ticket, client, existingThread = null, knownUserLabel = '') {
    const thread = existingThread || await fetchThread(client, ticket.thread_id);
    if (!thread) {
        return false;
    }

    await ensureTicketHeaderMessage(thread, ticket);
    await syncTicketSummaryMessage(ticket, client, thread, knownUserLabel);
    return true;
}

async function createTicketForUser(message) {
    const supportChannel = await fetchSupportChannel(message.client);
    if (!supportChannel) {
        return { ok: false, reason: 'support_channel_missing' };
    }

    const userLabel = formatUserLabel(message.author);
    const createdMessage = await supportChannel.send({
        content: t('support.newTicketFrom', { userId: message.author.id, label: userLabel }),
    });

    const thread = await createdMessage.startThread({
        name: buildTicketThreadName(message.author),
        autoArchiveDuration: 1440,
        reason: `Support ticket for user ${message.author.id}`,
    });

    const ticketId = await insertOpenTicket({
        userDiscordId: message.author.id,
        guildId: supportChannel.guildId || null,
        supportChannelId: supportChannel.id,
        threadId: thread.id,
    });

    const ticket = {
        id: ticketId,
        user_discord_id: String(message.author.id),
        guild_id: supportChannel.guildId ? String(supportChannel.guildId) : null,
        support_channel_id: String(supportChannel.id),
        thread_id: String(thread.id),
        status: 'open',
        assigned_to_discord_id: null,
        header_message_id: null,
        updated_at: new Date().toISOString(),
        locale: await getUserLocaleByDiscordId(message.author.id),
    };

    await syncTicketHeader(ticket, message.client, thread, userLabel);

    await sendTemporaryDm(
        message.author,
        supportDmNotice(
            t('support.openedTitle', {}, ticket.locale),
            t('support.openedBody', { id: ticket.id }, ticket.locale),
        )
    );

    return { ok: true, ticket, thread };
}

async function relayUserMessageToThread(ticket, message, existingThread = null) {
    const thread = existingThread || await fetchThread(message.client, ticket.thread_id);
    if (!thread) {
        return { ok: false, thread: null };
    }

    if (thread.archived) {
        await thread.setArchived(false).catch(() => undefined);
    }

    const locale = ticket.locale || await resolveLocaleForDiscordId(ticket.user_discord_id);
    const content = buildUserRelayContent(message, locale);
    await thread.send({ content });
    return { ok: true, thread };
}

async function relayStaffMessageToUser(ticket, message) {
    const user = await message.client.users.fetch(String(ticket.user_discord_id)).catch(() => null);
    if (!user) {
        return false;
    }

    const locale = ticket.locale || await resolveLocaleForDiscordId(ticket.user_discord_id);
    const content = buildStaffRelayContent(message, locale);
    await user.send({ content }).catch(() => undefined);
    return true;
}

async function closeTicketByUserDm(ticket, message) {
    const closed = await closeActiveTicket(ticket.id, message.author.id);
    if (!closed) {
        const locale = ticket.locale || await getUserLocaleByDiscordId(message.author.id);
        await sendTemporaryDm(message.author, supportDmNotice(t('support.noticeTitle', {}, locale), t('support.noOpenTicket', {}, locale)));
        return true;
    }

    ticket.status = 'closed';
    markTicketUpdated(ticket);
    const thread = await fetchThread(message.client, ticket.thread_id);
    if (thread) {
        await syncTicketHeader(ticket, message.client, thread);
        await thread.setLocked(true).catch(() => undefined);
        await thread.setArchived(true).catch(() => undefined);
    }

    const locale = ticket.locale || await getUserLocaleByDiscordId(message.author.id);
    await sendTemporaryDm(message.author, supportDmNotice(t('support.closedTitle', {}, locale), t('support.closedBody', {}, locale)));
    return true;
}

async function handleSupportTicketDirectMessage(message) {
    const supportTicketChannelId = await loadSupportTicketChannelId();
    if (!supportTicketChannelId) {
        if (hasRelayPayload(message)) {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendTemporaryDm(
                message.author,
                supportDmNotice(t('support.unavailableTitle', {}, locale), t('support.unavailableBody', {}, locale), null),
                locale,
            );
            return true;
        }

        return false;
    }

    if (!hasRelayPayload(message)) {
        return false;
    }

    const existingTicket = await findOpenTicketByUserId(message.author.id);

    if (isTicketReopenCommand(message.content)) {
        if (existingTicket) {
            const locale = await getUserLocaleByDiscordId(message.author.id);
            await sendTemporaryDm(message.author, supportDmNotice(t('support.noticeTitle', {}, locale), t('support.alreadyOpen', {}, locale)));
            return true;
        }

        const latestTicket = await findLatestTicketByUserId(message.author.id);
        if (!latestTicket || String(latestTicket.status) !== 'closed') {
            const locale = await getUserLocaleByDiscordId(message.author.id);
            await sendTemporaryDm(message.author, supportDmNotice(t('support.noticeTitle', {}, locale), t('support.noClosedTicket', {}, locale)));
            return true;
        }

        const reopened = await reopenClosedTicket(latestTicket.id, 'pending_staff');
        if (!reopened) {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendTemporaryDm(
                message.author,
                supportDmNotice(t('support.noticeTitle', {}, locale), t('support.reopenFailed', {}, locale)),
                locale,
            );
            return true;
        }

        latestTicket.status = 'pending_staff';
        markTicketUpdated(latestTicket);
        const thread = await fetchThread(message.client, latestTicket.thread_id);
        if (thread) {
            if (thread.archived) {
                await thread.setArchived(false).catch(() => undefined);
            }
            if (thread.locked) {
                await thread.setLocked(false).catch(() => undefined);
            }
            await syncTicketHeader(latestTicket, message.client, thread);
        }

        await sendTemporaryDm(
            message.author,
            supportDmNotice(
                t('support.reopenedTitle', {}, latestTicket.locale),
                t('support.reopenedByStaff', { id: latestTicket.id }, latestTicket.locale),
            ),
            latestTicket.locale,
        );
        return true;
    }

    if (isTicketCloseCommand(message.content)) {
        if (!existingTicket) {
            const locale = await getUserLocaleByDiscordId(message.author.id);
            await sendTemporaryDm(message.author, supportDmNotice(t('support.noticeTitle', {}, locale), t('support.noOpenTicket', {}, locale)));
            return true;
        }

        await closeTicketByUserDm(existingTicket, message);
        return true;
    }

    let ticket = existingTicket;
    let thread = null;
    if (!ticket) {
        // No open ticket yet — ask for confirmation before creating one.
        const locale = await resolveLocaleForDiscordId(message.author.id);
        const preview = normalizeMessageText(message.content) || (attachmentUrlsFromMessage(message).length > 0 ? `[${attachmentUrlsFromMessage(message).length}x Anhang]` : '');
        pendingConfirmations.set(String(message.author.id), {
            message,
            expiresAt: Date.now() + PENDING_CONFIRMATION_TTL_MS,
        });
        await message.author.send(buildPendingConfirmationMessage(message.author.id, preview, locale)).catch(() => undefined);
        return true;
    }

    const relayed = await relayUserMessageToThread(ticket, message, thread);
    if (!relayed.ok) {
        await sendTemporaryDm(
            message.author,
            supportDmNotice(t('support.noticeTitle', {}, ticket.locale), t('support.threadUnavailable', {}, ticket.locale))
        );
        return true;
    }

    await markUserActivity(ticket.id);
    ticket.status = 'pending_staff';
    markTicketUpdated(ticket);
    await syncTicketHeader(ticket, message.client, relayed.thread);
    return true;
}

async function handleSupportTicketThreadMessage(message) {
    const ticket = await findTicketByThreadId(message.channel.id);
    if (!ticket) {
        return false;
    }

    const command = normalizeCommandText(message.content);
    const isCommand = isTicketCommand(command);
    if (isCommand) {
        await deleteCommandMessage(message);
    }

    if (isTicketReopenCommand(command)) {
        if (!isStaffTicketMessage(message)) {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendThreadAck(message.channel, t('support.onlyStaffReopen', {}, locale), locale);
            return true;
        }

        if (String(ticket.status) !== 'closed') {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendThreadAck(message.channel, t('support.ticketAlreadyOpen', {}, locale), locale);
            return true;
        }

        const reopened = await reopenClosedTicket(ticket.id, 'pending_user');
        if (!reopened) {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendThreadAck(message.channel, t('support.couldNotReopen', {}, locale), locale);
            return true;
        }

        ticket.status = 'pending_user';
        markTicketUpdated(ticket);
        if (message.channel.archived) {
            await message.channel.setArchived(false).catch(() => undefined);
        }
        if (message.channel.locked) {
            await message.channel.setLocked(false).catch(() => undefined);
        }
        await syncTicketHeader(ticket, message.client, message.channel);

        const user = await message.client.users.fetch(String(ticket.user_discord_id)).catch(() => null);
        if (user) {
            const locale = ticket.locale || await resolveLocaleForDiscordId(ticket.user_discord_id);
            await sendTemporaryDm(
                user,
                supportDmNotice(
                    t('support.reopenedTitle', {}, locale),
                    t('support.reopenedByStaff', { id: ticket.id }, locale),
                ),
                locale,
            );
        }
        return true;
    }

    if (!isActiveTicketStatus(ticket.status)) {
        const locale = await resolveLocaleForDiscordId(message.author.id);
        await sendThreadAck(message.channel, t('support.ticketClosedUseReopenButton', {}, locale), locale);
        return true;
    }

    if (isTicketClaimCommand(command)) {
        if (!isStaffTicketMessage(message)) {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendThreadAck(message.channel, t('support.onlyStaffClaim', {}, locale), locale);
            return true;
        }

        if (isClaimedByOther(ticket, message.author.id)) {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendThreadAck(message.channel, t('support.alreadyClaimedBy', { userId: ticket.assigned_to_discord_id }, locale), locale);
            return true;
        }

        await setTicketAssignee(ticket.id, message.author.id);
        ticket.assigned_to_discord_id = String(message.author.id);
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, message.client, message.channel);
        return true;
    }

    if (isTicketUnclaimCommand(command)) {
        if (!isStaffTicketMessage(message)) {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendThreadAck(message.channel, t('support.onlyStaffUnclaim', {}, locale), locale);
            return true;
        }

        if (!ticket.assigned_to_discord_id) {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendThreadAck(message.channel, t('support.ticketNotClaimed', {}, locale), locale);
            return true;
        }

        if (isClaimedByOther(ticket, message.author.id)) {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendThreadAck(message.channel, t('support.onlyAssigneeCanUnclaim', { userId: ticket.assigned_to_discord_id }, locale), locale);
            return true;
        }

        await setTicketAssignee(ticket.id, null);
        ticket.assigned_to_discord_id = null;
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, message.client, message.channel);
        return true;
    }

    if (isClaimedByOther(ticket, message.author.id)) {
        const locale = await resolveLocaleForDiscordId(message.author.id);
        await sendThreadAck(message.channel, t('support.claimedBy', { userId: ticket.assigned_to_discord_id }, locale), locale);
        return true;
    }

    if (isTicketCloseCommand(command)) {
        if (!isStaffTicketMessage(message)) {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendThreadAck(message.channel, t('support.onlyStaffClose', {}, locale), locale);
            return true;
        }

        const closed = await closeActiveTicket(ticket.id, message.author.id);
        if (!closed) {
            const locale = await resolveLocaleForDiscordId(message.author.id);
            await sendThreadAck(message.channel, t('support.couldNotClose', {}, locale), locale);
            return true;
        }

        ticket.status = 'closed';
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, message.client, message.channel);

        const user = await message.client.users.fetch(String(ticket.user_discord_id)).catch(() => null);
        if (user) {
            const locale = ticket.locale || await resolveLocaleForDiscordId(ticket.user_discord_id);
            await sendTemporaryDm(
                user,
                supportDmNotice(
                    t('support.closedTitle', {}, locale),
                    t('support.closedByStaff', { id: ticket.id }, locale),
                ),
                locale,
            );
        }

        await message.channel.setLocked(true).catch(() => undefined);
        await message.channel.setArchived(true).catch(() => undefined);
        return true;
    }

    if (!isStaffTicketMessage(message)) {
        return true;
    }

    if (!hasRelayPayload(message)) {
        return true;
    }

    const relayed = await relayStaffMessageToUser(ticket, message);
    if (relayed) {
        await markStaffActivity(ticket.id);
        ticket.status = 'pending_user';
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, message.client, message.channel);
    }
    return true;
}

async function replyInteractionNotice(interaction, content, locale = null) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate().catch(() => undefined);
    }

    if (interaction.channel?.isTextBased?.() && typeof interaction.channel.send === 'function') {
        await sendThreadAck(interaction.channel, content, locale);
        return;
    }

    const payload = {
        embeds: [supportDmNotice(t('support.actionTitle', {}, locale), content, detectNoticeKind(content))],
    };
    if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => undefined);
        return;
    }

    await interaction.reply(payload).catch(() => undefined);
}

async function handleSupportTicketInteraction(interaction) {
    if (!interaction?.isButton?.()) {
        return false;
    }

    // Handle pending confirmation buttons (triggered in DMs)
    const pendingParsed = parsePendingConfirmCustomId(interaction.customId);
    if (pendingParsed) {
        const { action, userId } = pendingParsed;
        const locale = await resolveLocaleForDiscordId(interaction.user.id);

        // Only the owner of the confirmation can act on it
        if (String(interaction.user.id) !== userId) {
            await interaction.reply({ content: t('support.noticeTitle', {}, locale), flags: 64 }).catch(() => undefined);
            return true;
        }

        const pending = pendingConfirmations.get(userId);
        pendingConfirmations.delete(userId);

        if (action === 'cancel' || !pending || Date.now() > pending.expiresAt) {
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(NOTICE_COLORS.warning)
                    .setTitle(t('support.confirmCancelledTitle', {}, locale))
                    .setDescription(t('support.confirmCancelledBody', {}, locale))],
                components: [],
            }).catch(() => undefined);
            return true;
        }

        // Confirm: create ticket and relay the stored message
        await interaction.deferUpdate().catch(() => undefined);

        const existingTicket = await findOpenTicketByUserId(userId);
        let ticket = existingTicket;
        let thread = null;

        if (!ticket) {
            const created = await createTicketForUser(pending.message);
            if (!created.ok) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(NOTICE_COLORS.error)
                        .setTitle(t('support.noticeTitle', {}, locale))
                        .setDescription(t('support.createFailed', {}, locale))],
                    components: [],
                }).catch(() => undefined);
                return true;
            }
            ticket = created.ticket;
            thread = created.thread;
        }

        const relayed = await relayUserMessageToThread(ticket, pending.message, thread);
        if (!relayed.ok) {
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(NOTICE_COLORS.error)
                    .setTitle(t('support.noticeTitle', {}, locale))
                    .setDescription(t('support.threadUnavailable', {}, ticket.locale || locale))],
                components: [],
            }).catch(() => undefined);
            return true;
        }

        await markUserActivity(ticket.id);
        ticket.status = 'pending_staff';
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, interaction.client, relayed.thread);

        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(NOTICE_COLORS.success)
                .setTitle(t('support.openedTitle', {}, ticket.locale || locale))
                .setDescription(t('support.openedBody', { id: ticket.id }, ticket.locale || locale))],
            components: [],
        }).catch(() => undefined);
        return true;
    }

    const parsed = parseTicketControlCustomId(interaction.customId);
    if (!parsed) {
        return false;
    }

    const locale = await resolveLocaleForDiscordId(interaction.user.id);

    if (!interaction.channel?.isThread?.()) {
        await replyInteractionNotice(interaction, t('support.controlsOnlyInThread', {}, locale), locale);
        return true;
    }

    const ticket = await findTicketById(parsed.ticketId);
    if (!ticket) {
        await replyInteractionNotice(interaction, t('support.ticketNotFound', {}, locale), locale);
        return true;
    }

    if (String(ticket.thread_id) !== String(interaction.channel.id)) {
        await replyInteractionNotice(interaction, t('support.controlWrongThread', {}, locale), locale);
        return true;
    }

    if (!isStaffTicketActor(interaction.guildId, interaction.member)) {
        await replyInteractionNotice(interaction, t('support.controlsOnlyStaff', {}, locale), locale);
        return true;
    }

    if (parsed.action === 'reopen') {
        if (String(ticket.status) !== 'closed') {
            await replyInteractionNotice(interaction, t('support.ticketAlreadyOpen', {}, locale), locale);
            return true;
        }

        const reopened = await reopenClosedTicket(ticket.id, 'pending_user');
        if (!reopened) {
            await replyInteractionNotice(interaction, t('support.couldNotReopen', {}, locale), locale);
            return true;
        }

        ticket.status = 'pending_user';
        markTicketUpdated(ticket);
        if (interaction.channel.archived) {
            await interaction.channel.setArchived(false).catch(() => undefined);
        }
        if (interaction.channel.locked) {
            await interaction.channel.setLocked(false).catch(() => undefined);
        }
        await syncTicketHeader(ticket, interaction.client, interaction.channel);

        const user = await interaction.client.users.fetch(String(ticket.user_discord_id)).catch(() => null);
        if (user) {
            const userLocale = ticket.locale || await resolveLocaleForDiscordId(ticket.user_discord_id);
            await sendTemporaryDm(
                user,
                supportDmNotice(
                    t('support.reopenedTitle', {}, userLocale),
                    t('support.reopenedByStaff', { id: ticket.id }, userLocale),
                ),
                userLocale,
            );
        }

        await replyInteractionNotice(interaction, t('support.ticketReopened', {}, locale), locale);
        return true;
    }

    if (!isActiveTicketStatus(ticket.status)) {
        await replyInteractionNotice(interaction, t('support.ticketClosedUseReopen', {}, locale), locale);
        return true;
    }

    if (parsed.action === 'claim') {
        if (isClaimedByOther(ticket, interaction.user.id)) {
            await replyInteractionNotice(interaction, t('support.alreadyClaimedBy', { userId: ticket.assigned_to_discord_id }, locale), locale);
            return true;
        }

        if (String(ticket.assigned_to_discord_id || '') === String(interaction.user.id)) {
            await replyInteractionNotice(interaction, t('support.ticketAlreadyClaimedByYou', {}, locale), locale);
            return true;
        }

        await setTicketAssignee(ticket.id, interaction.user.id);
        ticket.assigned_to_discord_id = String(interaction.user.id);
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, interaction.client, interaction.channel);
        await replyInteractionNotice(interaction, t('support.ticketClaimed', {}, locale), locale);
        return true;
    }

    if (parsed.action === 'unclaim') {
        if (!ticket.assigned_to_discord_id) {
            await replyInteractionNotice(interaction, t('support.ticketNotClaimed', {}, locale), locale);
            return true;
        }

        if (isClaimedByOther(ticket, interaction.user.id)) {
            await replyInteractionNotice(interaction, t('support.onlyAssigneeCanUnclaim', { userId: ticket.assigned_to_discord_id }, locale), locale);
            return true;
        }

        await setTicketAssignee(ticket.id, null);
        ticket.assigned_to_discord_id = null;
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, interaction.client, interaction.channel);
        await replyInteractionNotice(interaction, t('support.ticketUnclaimed', {}, locale), locale);
        return true;
    }

    if (parsed.action === 'close') {
        if (isClaimedByOther(ticket, interaction.user.id)) {
            await replyInteractionNotice(interaction, t('support.claimedBy', { userId: ticket.assigned_to_discord_id }, locale), locale);
            return true;
        }

        const closed = await closeActiveTicket(ticket.id, interaction.user.id);
        if (!closed) {
            await replyInteractionNotice(interaction, t('support.couldNotClose', {}, locale), locale);
            return true;
        }

        ticket.status = 'closed';
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, interaction.client, interaction.channel);

        const user = await interaction.client.users.fetch(String(ticket.user_discord_id)).catch(() => null);
        if (user) {
            const userLocale = ticket.locale || await resolveLocaleForDiscordId(ticket.user_discord_id);
            await sendTemporaryDm(
                user,
                supportDmNotice(
                    t('support.closedTitle', {}, userLocale),
                    t('support.closedByStaff', { id: ticket.id }, userLocale),
                ),
                userLocale,
            );
        }

        await replyInteractionNotice(interaction, t('support.ticketClosed', {}, locale), locale);
        await interaction.channel.setLocked(true).catch(() => undefined);
        await interaction.channel.setArchived(true).catch(() => undefined);
        return true;
    }

    await replyInteractionNotice(interaction, t('support.unknownTicketAction', {}, locale), locale);
    return true;
}

async function handleSupportTicketMessage(message) {
    if (!message || message.author?.bot) {
        return false;
    }

    if (!message.guildId) {
        return handleSupportTicketDirectMessage(message);
    }

    if (!message.channel?.isThread?.()) {
        return false;
    }

    return handleSupportTicketThreadMessage(message);
}

module.exports = {
    handleSupportTicketInteraction,
    handleSupportTicketMessage,
    isTicketCloseCommand,
    isTicketClaimCommand,
    isTicketUnclaimCommand,
    isTicketReopenCommand,
    buildTicketThreadName,
    buildTicketSummaryContent,
    buildTicketStateLine,
    buildUserRelayContent,
    buildStaffRelayContent,
};
