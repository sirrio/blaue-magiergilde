const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { supportStaffRoleIds } = require('./config');

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
        return 'Unknown User';
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

function buildTicketThreadName(user) {
    const label = normalizeWhitespace(formatUserLabel(user)).replace(/[^a-zA-Z0-9 _-]/g, '');
    const base = label !== '' ? label : `user-${String(user?.id || 'unknown')}`;
    return `ticket-${base}`.slice(0, 90);
}

function buildUserRelayContent(message) {
    const userName = formatUserLabel(message?.author);
    const body = normalizeMessageText(message?.content);
    const attachmentUrls = attachmentUrlsFromMessage(message);
    const sections = [`👤 ${userName}: ${body !== '' ? truncateText(body) : '_No text_'}`];

    if (attachmentUrls.length > 0) {
        sections.push(`📎 ${attachmentUrls.length} attachment${attachmentUrls.length === 1 ? '' : 's'}`);
        sections.push(buildAttachmentLinks(attachmentUrls));
    }

    return truncateText(sections.join('\n\n'));
}

function buildStaffRelayContent(message) {
    const supportName = formatUserLabel(message?.author);
    const body = normalizeMessageText(message?.content);
    const attachmentUrls = attachmentUrlsFromMessage(message);
    const sections = [`🛠 ${supportName}: ${body !== '' ? truncateText(body) : '_No text_'}`];

    if (attachmentUrls.length > 0) {
        sections.push(`📎 ${attachmentUrls.length} attachment${attachmentUrls.length === 1 ? '' : 's'}`);
        sections.push(buildAttachmentLinks(attachmentUrls));
    }

    return truncateText(sections.join('\n\n'));
}

function buildTicketHeaderEmbed(ticket) {
    const assigned = ticket.assigned_to_discord_id ? `<@${ticket.assigned_to_discord_id}>` : 'Unassigned';
    const status = String(ticket.status || 'open');

    return new EmbedBuilder()
        .setColor(statusColor(status))
        .setTitle(`Support Ticket #${ticket.id}`)
        .setDescription([
            `User: <@${ticket.user_discord_id}>`,
            `Status: ${statusBadge(status)}`,
            `Assignee: ${assigned}`,
            `Updated: ${toRelativeTimestamp(ticket.updated_at)}`,
        ].join('\n'))
        .setTimestamp(new Date());
}

function buildTicketSummaryContent(ticket, userLabel) {
    const cleanLabel = normalizeWhitespace(userLabel) || `user-${String(ticket?.user_discord_id || 'unknown')}`;
    const assigned = ticket?.assigned_to_discord_id ? `<@${ticket.assigned_to_discord_id}>` : 'Unassigned';
    const status = String(ticket?.status || 'open');
    return [
        `🎫 Support ticket #${ticket.id} from <@${ticket.user_discord_id}> (${cleanLabel})`,
        `Status: ${statusBadge(status)}`,
        `Assignee: ${assigned}`,
        `Updated: ${toRelativeTimestamp(ticket.updated_at)}`,
    ].join('\n');
}

function buildTicketHeaderComponents(ticket) {
    const status = String(ticket?.status || 'open');
    const isClosed = status === 'closed';
    const hasAssignee = String(ticket?.assigned_to_discord_id || '').trim() !== '';

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`support-ticket:claim:${ticket.id}`)
            .setLabel('Claim')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isClosed || hasAssignee),
        new ButtonBuilder()
            .setCustomId(`support-ticket:unclaim:${ticket.id}`)
            .setLabel('Unclaim')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isClosed || !hasAssignee),
        new ButtonBuilder()
            .setCustomId(`support-ticket:close:${ticket.id}`)
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(isClosed),
        new ButtonBuilder()
            .setCustomId(`support-ticket:reopen:${ticket.id}`)
            .setLabel('Reopen')
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
    const cleanTitle = normalizeWhitespace(title) || 'Support Ticket';
    if (cleanTitle.startsWith('⚠') || cleanTitle.startsWith('❌') || cleanTitle.startsWith('⛔')) {
        return cleanTitle;
    }

    return `⚠️ ${cleanTitle}`;
}

function supportDmNotice(title, details = '', kind = null) {
    const cleanDetails = String(details || '').trim();
    const noticeKind = kind || detectNoticeKind(cleanDetails);
    const baseTitle = normalizeWhitespace(title) || 'Support Ticket';
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

async function sendThreadAck(channel, content) {
    await channel.send({
        embeds: [supportDmNotice('Ticket action', content, detectNoticeKind(content))],
    }).catch(() => null);
}

async function sendTemporaryMessage(channel, content) {
    let payload;
    if (content instanceof EmbedBuilder) {
        payload = { embeds: [content] };
    } else if (content && typeof content === 'object' && !Array.isArray(content)) {
        payload = content;
    } else {
        const text = String(content || '');
        payload = { embeds: [supportDmNotice('Support Ticket', text, detectNoticeKind(text))] };
    }

    return channel.send(payload).catch(() => null);
}

async function sendTemporaryDm(user, content) {
    return sendTemporaryMessage(user, content);
}

async function deleteCommandMessage(message) {
    await message.delete().catch(() => undefined);
}

async function loadSupportTicketChannelId() {
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
    const embedPayload = {
        embeds: [buildTicketHeaderEmbed(ticket)],
        components: buildTicketHeaderComponents(ticket),
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
    const content = buildTicketSummaryContent(ticket, userLabel);
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
        content: `🎫 New support ticket from <@${message.author.id}> (${userLabel})`,
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
    };

    await syncTicketHeader(ticket, message.client, thread, userLabel);

    await sendTemporaryDm(
        message.author,
        supportDmNotice('Support Ticket Opened', `✅ Ticket #${ticket.id} is now open.`)
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

    const content = buildUserRelayContent(message);
    await thread.send({ content });
    return { ok: true, thread };
}

async function relayStaffMessageToUser(ticket, message) {
    const user = await message.client.users.fetch(String(ticket.user_discord_id)).catch(() => null);
    if (!user) {
        return false;
    }

    const content = buildStaffRelayContent(message);
    await user.send({ content }).catch(() => undefined);
    return true;
}

async function closeTicketByUserDm(ticket, message) {
    const closed = await closeActiveTicket(ticket.id, message.author.id);
    if (!closed) {
        await sendTemporaryDm(message.author, supportDmNotice('Support Ticket', 'ℹ️ No open ticket to close.'));
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

    await sendTemporaryDm(message.author, supportDmNotice('Support Ticket Closed', '🔒 Your ticket has been closed.'));
    return true;
}

async function handleSupportTicketDirectMessage(message) {
    const supportTicketChannelId = await loadSupportTicketChannelId();
    if (!supportTicketChannelId) {
        if (hasRelayPayload(message)) {
            await sendTemporaryDm(
                message.author,
                supportDmNotice('Support Unavailable', '⚠️ Support ticket system is not configured yet.')
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
            await sendTemporaryDm(message.author, supportDmNotice('Support Ticket', 'ℹ️ Your ticket is already open.'));
            return true;
        }

        const latestTicket = await findLatestTicketByUserId(message.author.id);
        if (!latestTicket || String(latestTicket.status) !== 'closed') {
            await sendTemporaryDm(message.author, supportDmNotice('Support Ticket', 'ℹ️ No closed ticket found to reopen.'));
            return true;
        }

        const reopened = await reopenClosedTicket(latestTicket.id, 'pending_staff');
        if (!reopened) {
            await sendTemporaryDm(
                message.author,
                supportDmNotice('Support Ticket', '❌ Could not reopen your ticket right now. Please try again.')
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
            supportDmNotice('Support Ticket Reopened', `↩️ Ticket #${latestTicket.id} has been reopened.`)
        );
        return true;
    }

    if (isTicketCloseCommand(message.content)) {
        if (!existingTicket) {
            await sendTemporaryDm(message.author, supportDmNotice('Support Ticket', 'ℹ️ No open ticket found.'));
            return true;
        }

        await closeTicketByUserDm(existingTicket, message);
        return true;
    }

    let ticket = existingTicket;
    let thread = null;
    if (!ticket) {
        const created = await createTicketForUser(message);
        if (!created.ok) {
            await sendTemporaryDm(
                message.author,
                supportDmNotice('Support Ticket', '❌ Could not start a support ticket right now. Please try again later.')
            );
            return true;
        }

        ticket = created.ticket;
        thread = created.thread;
    }

    const relayed = await relayUserMessageToThread(ticket, message, thread);
    if (!relayed.ok) {
        await sendTemporaryDm(
            message.author,
            supportDmNotice('Support Ticket', '⚠️ Your ticket is currently unavailable. Please send your message again in a moment.')
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
            await sendThreadAck(message.channel, '⛔ Only support staff can reopen tickets.');
            return true;
        }

        if (String(ticket.status) !== 'closed') {
            await sendThreadAck(message.channel, 'ℹ️ Ticket is already open.');
            return true;
        }

        const reopened = await reopenClosedTicket(ticket.id, 'pending_user');
        if (!reopened) {
            await sendThreadAck(message.channel, '❌ Could not reopen ticket.');
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
            await sendTemporaryDm(
                user,
                supportDmNotice('Support Ticket Reopened', `↩️ Ticket #${ticket.id} was reopened by the support team.`)
            );
        }
        return true;
    }

    if (!isActiveTicketStatus(ticket.status)) {
        await sendThreadAck(message.channel, 'ℹ️ Ticket is closed. Use the Reopen button.');
        return true;
    }

    if (isTicketClaimCommand(command)) {
        if (!isStaffTicketMessage(message)) {
            await sendThreadAck(message.channel, '⛔ Only support staff can claim tickets.');
            return true;
        }

        if (isClaimedByOther(ticket, message.author.id)) {
            await sendThreadAck(message.channel, `⛔ Already claimed by <@${ticket.assigned_to_discord_id}>.`);
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
            await sendThreadAck(message.channel, '⛔ Only support staff can unclaim tickets.');
            return true;
        }

        if (!ticket.assigned_to_discord_id) {
            await sendThreadAck(message.channel, 'ℹ️ Ticket is not claimed.');
            return true;
        }

        if (isClaimedByOther(ticket, message.author.id)) {
            await sendThreadAck(message.channel, `⛔ Only <@${ticket.assigned_to_discord_id}> can unclaim.`);
            return true;
        }

        await setTicketAssignee(ticket.id, null);
        ticket.assigned_to_discord_id = null;
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, message.client, message.channel);
        return true;
    }

    if (isClaimedByOther(ticket, message.author.id)) {
        await sendThreadAck(message.channel, `⛔ Ticket is claimed by <@${ticket.assigned_to_discord_id}>.`);
        return true;
    }

    if (isTicketCloseCommand(command)) {
        if (!isStaffTicketMessage(message)) {
            await sendThreadAck(message.channel, '⛔ Only support staff can close tickets.');
            return true;
        }

        const closed = await closeActiveTicket(ticket.id, message.author.id);
        if (!closed) {
            await sendThreadAck(message.channel, '❌ Could not close ticket.');
            return true;
        }

        ticket.status = 'closed';
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, message.client, message.channel);

        const user = await message.client.users.fetch(String(ticket.user_discord_id)).catch(() => null);
        if (user) {
            await sendTemporaryDm(
                user,
                supportDmNotice('Support Ticket Closed', `🔒 Ticket #${ticket.id} was closed by the support team.`)
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

async function replyInteractionNotice(interaction, content) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate().catch(() => undefined);
    }

    if (interaction.channel?.isTextBased?.() && typeof interaction.channel.send === 'function') {
        await sendThreadAck(interaction.channel, content);
        return;
    }

    const payload = {
        embeds: [supportDmNotice('Ticket action', content, detectNoticeKind(content))],
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

    const parsed = parseTicketControlCustomId(interaction.customId);
    if (!parsed) {
        return false;
    }

    if (!interaction.channel?.isThread?.()) {
        await replyInteractionNotice(interaction, '⛔ Ticket controls only work inside ticket threads.');
        return true;
    }

    const ticket = await findTicketById(parsed.ticketId);
    if (!ticket) {
        await replyInteractionNotice(interaction, '❌ Ticket not found.');
        return true;
    }

    if (String(ticket.thread_id) !== String(interaction.channel.id)) {
        await replyInteractionNotice(interaction, '⛔ This control does not belong to this thread.');
        return true;
    }

    if (!isStaffTicketActor(interaction.guildId, interaction.member)) {
        await replyInteractionNotice(interaction, '⛔ Only support staff can use these controls.');
        return true;
    }

    if (parsed.action === 'reopen') {
        if (String(ticket.status) !== 'closed') {
            await replyInteractionNotice(interaction, 'ℹ️ Ticket is already open.');
            return true;
        }

        const reopened = await reopenClosedTicket(ticket.id, 'pending_user');
        if (!reopened) {
            await replyInteractionNotice(interaction, '❌ Could not reopen ticket.');
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
            await sendTemporaryDm(
                user,
                supportDmNotice('Support Ticket Reopened', `↩️ Ticket #${ticket.id} was reopened by the support team.`)
            );
        }

        await replyInteractionNotice(interaction, '↩️ Ticket reopened.');
        return true;
    }

    if (!isActiveTicketStatus(ticket.status)) {
        await replyInteractionNotice(interaction, 'ℹ️ Ticket is closed. Use Reopen.');
        return true;
    }

    if (parsed.action === 'claim') {
        if (isClaimedByOther(ticket, interaction.user.id)) {
            await replyInteractionNotice(interaction, `⛔ Already claimed by <@${ticket.assigned_to_discord_id}>.`);
            return true;
        }

        if (String(ticket.assigned_to_discord_id || '') === String(interaction.user.id)) {
            await replyInteractionNotice(interaction, 'ℹ️ Ticket is already claimed by you.');
            return true;
        }

        await setTicketAssignee(ticket.id, interaction.user.id);
        ticket.assigned_to_discord_id = String(interaction.user.id);
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, interaction.client, interaction.channel);
        await replyInteractionNotice(interaction, '✅ Ticket claimed.');
        return true;
    }

    if (parsed.action === 'unclaim') {
        if (!ticket.assigned_to_discord_id) {
            await replyInteractionNotice(interaction, 'ℹ️ Ticket is not claimed.');
            return true;
        }

        if (isClaimedByOther(ticket, interaction.user.id)) {
            await replyInteractionNotice(interaction, `⛔ Only <@${ticket.assigned_to_discord_id}> can unclaim.`);
            return true;
        }

        await setTicketAssignee(ticket.id, null);
        ticket.assigned_to_discord_id = null;
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, interaction.client, interaction.channel);
        await replyInteractionNotice(interaction, '✅ Ticket unclaimed.');
        return true;
    }

    if (parsed.action === 'close') {
        if (isClaimedByOther(ticket, interaction.user.id)) {
            await replyInteractionNotice(interaction, `⛔ Ticket is claimed by <@${ticket.assigned_to_discord_id}>.`);
            return true;
        }

        const closed = await closeActiveTicket(ticket.id, interaction.user.id);
        if (!closed) {
            await replyInteractionNotice(interaction, '❌ Could not close ticket.');
            return true;
        }

        ticket.status = 'closed';
        markTicketUpdated(ticket);
        await syncTicketHeader(ticket, interaction.client, interaction.channel);

        const user = await interaction.client.users.fetch(String(ticket.user_discord_id)).catch(() => null);
        if (user) {
            await sendTemporaryDm(
                user,
                supportDmNotice('Support Ticket Closed', `🔒 Ticket #${ticket.id} was closed by the support team.`)
            );
        }

        await replyInteractionNotice(interaction, '🔒 Ticket closed.');
        await interaction.channel.setLocked(true).catch(() => undefined);
        await interaction.channel.setArchived(true).catch(() => undefined);
        return true;
    }

    await replyInteractionNotice(interaction, '❌ Unknown ticket action.');
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
