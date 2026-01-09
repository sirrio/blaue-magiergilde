const { attachRateLimitListener, waitForDiscordRateLimit } = require('./discordRateLimit');
const snapshots = new Map();
const lastFetch = new Map();
const FETCH_COOLDOWN_MS = 60000;

function buildCandidate(member) {
    const name = String(member.displayName || member.user?.username || '').trim();
    if (!name) return null;
    if (member.user?.bot) return null;

    const avatar = typeof member.displayAvatarURL === 'function'
        ? member.displayAvatarURL({ extension: 'png', size: 128 })
        : null;

    return {
        id: String(member.id),
        name,
        avatar: avatar || null,
    };
}

function buildSnapshot(channel) {
    const members = Array.from(channel.members?.values() || [])
        .map(buildCandidate)
        .filter(Boolean);

    return {
        channel_id: String(channel.id),
        members,
        updated_at: new Date().toISOString(),
    };
}

function updateChannel(channel) {
    if (!channel || typeof channel.isVoiceBased !== 'function' || !channel.isVoiceBased()) return null;
    const snapshot = buildSnapshot(channel);
    snapshots.set(String(channel.id), snapshot);
    return snapshot;
}

function handleVoiceStateUpdate(oldState, newState) {
    if (oldState?.channel) {
        updateChannel(oldState.channel);
    }
    if (newState?.channel) {
        updateChannel(newState.channel);
    }
}

async function getSnapshot(channelId, client) {
    attachRateLimitListener(client);
    const cached = snapshots.get(String(channelId));
    if (cached) return { snapshot: cached };

    const cachedChannel = client.channels.cache.get(String(channelId));
    if (cachedChannel) {
        const snapshot = updateChannel(cachedChannel);
        if (snapshot) return { snapshot };
    }

    const now = Date.now();
    const last = lastFetch.get(String(channelId)) ?? 0;
    if (now - last < FETCH_COOLDOWN_MS) {
        return { error: 'Channel is not cached yet.' };
    }

    lastFetch.set(String(channelId), now);

    try {
        await waitForDiscordRateLimit(client);
        const fetched = await client.channels.fetch(String(channelId));
        if (!fetched || typeof fetched.isVoiceBased !== 'function' || !fetched.isVoiceBased()) {
            return { error: 'Channel is not voice-based.' };
        }
        const snapshot = updateChannel(fetched);
        return snapshot ? { snapshot } : { error: 'Channel snapshot unavailable.' };
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = {
    getSnapshot,
    handleVoiceStateUpdate,
    updateChannel,
};
