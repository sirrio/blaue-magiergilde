function normalizeChannelId(value) {
    const normalized = String(value || '').trim();

    if (!/^[0-9]{5,}$/.test(normalized)) {
        return '';
    }

    return normalized;
}

function getChannelOverrideId() {
    return normalizeChannelId(process.env.DISCORD_CHANNEL_OVERRIDE_ID || '');
}

function resolveChannelId(channelId) {
    return getChannelOverrideId() || normalizeChannelId(channelId);
}

module.exports = {
    getChannelOverrideId,
    normalizeChannelId,
    resolveChannelId,
};
