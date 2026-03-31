async function postLinesToChannel({ client, channelId, lines }) {
    const normalizedChannelId = String(channelId || '').trim();
    const preparedLines = Array.isArray(lines)
        ? lines
            .map(line => String(line || '').trim())
            .filter(Boolean)
        : [];

    if (!/^[0-9]{5,}$/.test(normalizedChannelId)) {
        return { ok: false, status: 422, error: 'Invalid channel_id.' };
    }

    if (!preparedLines.length) {
        return { ok: false, status: 422, error: 'No lines to post.' };
    }

    if (preparedLines.length > 100) {
        return { ok: false, status: 422, error: 'Too many lines. Maximum is 100.' };
    }

    if (preparedLines.some(line => line.length > 2000)) {
        return { ok: false, status: 422, error: 'A line exceeds Discord\'s 2000 character message limit.' };
    }

    const channel = client.channels?.cache?.get(normalizedChannelId)
        || await client.channels?.fetch?.(normalizedChannelId).catch(() => null);

    if (!channel?.isTextBased?.() || typeof channel.send !== 'function') {
        return { ok: false, status: 404, error: 'Discord channel not found or not writable.' };
    }

    if (channel.isThread?.() && channel.archived && typeof channel.setArchived === 'function') {
        await channel.setArchived(false).catch(() => null);
    }

    let postedLines = 0;

    try {
        for (const line of preparedLines) {
            await channel.send({ content: line });
            postedLines += 1;
        }
    } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown Discord error.';

        return {
            ok: false,
            status: 500,
            error: postedLines > 0
                ? `Posting stopped after ${postedLines} lines. ${detail}`
                : `Posting failed. ${detail}`,
            posted_lines: postedLines,
        };
    }

    return {
        ok: true,
        status: 200,
        posted_lines: postedLines,
    };
}

module.exports = {
    postLinesToChannel,
};
