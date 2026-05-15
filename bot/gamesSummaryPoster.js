const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const db = require('./db');
const { resolveChannelId } = require('./channelOverride');
const { fetchUpcomingGames } = require('./commands/game/games');

const DEBOUNCE_MS = 5_000;
const SUMMARY_BUTTON_ID = 'gamesSummaryShow';

let debounceTimer = null;
let pendingClient = null;

async function fetchSummarySettings() {
    try {
        const [rows] = await db.execute(
            'SELECT games_channel_id, games_summary_message_id FROM discord_bot_settings ORDER BY id LIMIT 1',
        );
        const row = rows?.[0] ?? {};
        return {
            channelId: resolveChannelId(row.games_channel_id),
            summaryMessageId: row.games_summary_message_id || null,
        };
    } catch {
        return { channelId: '', summaryMessageId: null };
    }
}

async function persistSummaryMessageId(messageId) {
    try {
        await db.execute(
            'UPDATE discord_bot_settings SET games_summary_message_id = ?, updated_at = NOW() WHERE id = (SELECT id FROM (SELECT id FROM discord_bot_settings ORDER BY id LIMIT 1) AS s)',
            [messageId ? String(messageId) : null],
        );
    } catch (error) {
        console.warn('[bot] Failed to persist games summary message id:', error?.message || error);
    }
}

async function deleteSummaryMessage(channel, messageId) {
    if (!messageId) return;
    try {
        const message = await channel.messages.fetch(messageId);
        if (message && message.deletable) {
            await message.delete();
        }
    } catch (error) {
        // Discord error code 10008 = Unknown Message; expected when the
        // previous summary was already deleted by a user/admin. Ignore those.
        if (error?.code !== 10008) {
            console.warn('[bot] Could not delete previous games summary:', error?.message || error);
        }
    }
}

function buildSummaryContent(gameCount) {
    if (gameCount <= 0) {
        return '📅 Aktuell sind keine anstehenden Spiele angekündigt.';
    }
    const noun = gameCount === 1 ? 'anstehendes Spiel' : 'anstehende Spiele';
    return `📅 **${gameCount} ${noun}** – klick unten für die Liste.`;
}

function buildSummaryComponents() {
    const button = new ButtonBuilder()
        .setCustomId(SUMMARY_BUTTON_ID)
        .setLabel('Spiele anzeigen')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📋');
    return [new ActionRowBuilder().addComponents(button)];
}

async function isSummaryStillAtBottom(channel, summaryMessageId) {
    if (!summaryMessageId) return false;
    try {
        const latest = await channel.messages.fetch({ limit: 1 });
        const latestMessage = latest?.first?.();
        return Boolean(latestMessage && String(latestMessage.id) === String(summaryMessageId));
    } catch (error) {
        console.warn('[bot] Games summary: could not check channel tail:', error?.message || error);
        return false;
    }
}

async function repostSummary(client) {
    const { channelId, summaryMessageId } = await fetchSummarySettings();
    if (!channelId) return;

    let channel;
    try {
        channel = await client.channels.fetch(channelId);
    } catch (error) {
        console.warn('[bot] Games summary: failed to fetch channel:', error?.message || error);
        return;
    }
    if (!channel || typeof channel.send !== 'function') return;

    let games = [];
    try {
        games = await fetchUpcomingGames(20);
    } catch (error) {
        console.warn('[bot] Games summary: failed to load games:', error?.message || error);
        return;
    }

    const content = buildSummaryContent(games.length);
    const components = buildSummaryComponents();

    // If the previous summary is still the latest message in the channel, just edit
    // it in place. Saves an API round-trip and avoids the brief gap from delete+post.
    if (await isSummaryStillAtBottom(channel, summaryMessageId)) {
        try {
            const existing = await channel.messages.fetch(summaryMessageId);
            await existing.edit({ content, components });
            return;
        } catch (error) {
            if (error?.code !== 10008) {
                console.warn('[bot] Games summary: edit failed, falling back to repost:', error?.message || error);
            }
        }
    }

    await deleteSummaryMessage(channel, summaryMessageId);

    try {
        const message = await channel.send({ content, components });
        await persistSummaryMessageId(message.id);
    } catch (error) {
        console.warn('[bot] Games summary: failed to post:', error?.message || error);
    }
}

function requestSummaryRepost(client) {
    pendingClient = client;
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        const target = pendingClient;
        pendingClient = null;
        if (target) {
            void repostSummary(target);
        }
    }, DEBOUNCE_MS);
    debounceTimer.unref?.();
}

module.exports = {
    repostSummary,
    requestSummaryRepost,
    fetchSummarySettings,
    SUMMARY_BUTTON_ID,
};
