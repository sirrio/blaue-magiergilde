const db = require('./db');
const { parseAnnouncement } = require('./discordGameScanner');
const { fetchSummarySettings, requestSummaryRepost } = require('./gamesSummaryPoster');

function toSqlDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function nowSql() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

async function upsertAnnouncement(parsed) {
    const timestamp = nowSql();
    await db.execute(
        `INSERT INTO game_announcements (
            discord_channel_id,
            discord_guild_id,
            discord_message_id,
            discord_author_id,
            discord_author_name,
            discord_author_avatar_url,
            title,
            content,
            tier,
            starts_at,
            posted_at,
            confidence,
            cancelled,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            discord_channel_id = VALUES(discord_channel_id),
            discord_guild_id = VALUES(discord_guild_id),
            discord_author_id = VALUES(discord_author_id),
            discord_author_name = VALUES(discord_author_name),
            discord_author_avatar_url = VALUES(discord_author_avatar_url),
            title = VALUES(title),
            content = VALUES(content),
            tier = VALUES(tier),
            starts_at = VALUES(starts_at),
            posted_at = VALUES(posted_at),
            confidence = VALUES(confidence),
            cancelled = VALUES(cancelled),
            updated_at = VALUES(updated_at)`,
        [
            String(parsed.discord_channel_id),
            parsed.discord_guild_id || null,
            String(parsed.discord_message_id),
            parsed.discord_author_id || null,
            parsed.discord_author_name || null,
            parsed.discord_author_avatar_url || null,
            parsed.title || null,
            parsed.content || null,
            parsed.tier || null,
            parsed.starts_at || null,
            toSqlDateTime(parsed.posted_at),
            Number(parsed.confidence || 0),
            parsed.cancelled ? 1 : 0,
            timestamp,
            timestamp,
        ],
    );
}

async function handleGamesChannelMessage(message) {
    if (!message || !message.channelId) return false;
    // Ignore the bot's own posts to avoid loops.
    if (message.author?.bot || message.author?.id === message.client?.user?.id) return false;

    const { channelId } = await fetchSummarySettings();
    if (!channelId || String(message.channelId) !== String(channelId)) return false;

    const parsed = parseAnnouncement(message);
    if (parsed) {
        try {
            await upsertAnnouncement(parsed);
        } catch (error) {
            console.warn('[bot] Games channel listener: failed to upsert announcement:', error?.message || error);
        }
    }

    if (message.client) {
        requestSummaryRepost(message.client);
    }
    return Boolean(parsed);
}

module.exports = {
    handleGamesChannelMessage,
};
