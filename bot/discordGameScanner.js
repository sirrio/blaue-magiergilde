function extractTier(rawContent) {
    const content = String(rawContent || '');
    const emojiMatch = content.match(/:MG_?(BT|LT|HT|ET)(?:~?\d+)?/i);
    if (emojiMatch) {
        return emojiMatch[1].toLowerCase();
    }

    const textMatch = content.match(/\b(BT|LT|HT|ET)\b/i);
    if (textMatch) {
        return textMatch[1].toLowerCase();
    }

    return null;
}

function extractTitle(rawContent) {
    const content = String(rawContent || '');
    const quoteMatch = content.match(/[\"„“”']([^\"„“”']{2,})[\"„“”']/);
    if (quoteMatch) {
        return quoteMatch[1].trim();
    }
    return null;
}

function parseRelativeDate(content, fallbackDate) {
    if (!fallbackDate) {
        return null;
    }

    const lower = String(content || '').toLowerCase();
    const base = new Date(fallbackDate.getTime());
    if (lower.includes('gestern')) {
        base.setDate(base.getDate() - 1);
        return base;
    }
    if (lower.includes('morgen')) {
        base.setDate(base.getDate() + 1);
        return base;
    }
    if (lower.includes('heute')) {
        return base;
    }
    return null;
}

function extractDate(content, fallbackDate) {
    const isoMatch = String(content || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
        return {
            year: Number(isoMatch[1]),
            month: Number(isoMatch[2]),
            day: Number(isoMatch[3]),
            explicit: true,
        };
    }

    const dateMatch = String(content || '').match(/(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{2,4}))?/);
    if (dateMatch) {
        const day = Number(dateMatch[1]);
        const month = Number(dateMatch[2]);
        let year = dateMatch[3] ? Number(dateMatch[3]) : fallbackDate?.getFullYear();
        if (!Number.isFinite(year)) {
            return null;
        }
        if (year < 100) {
            year += 2000;
        }
        return { year, month, day, explicit: true };
    }

    const relative = parseRelativeDate(content, fallbackDate);
    if (relative) {
        return {
            year: relative.getFullYear(),
            month: relative.getMonth() + 1,
            day: relative.getDate(),
            explicit: false,
        };
    }

    if (fallbackDate) {
        return {
            year: fallbackDate.getFullYear(),
            month: fallbackDate.getMonth() + 1,
            day: fallbackDate.getDate(),
            explicit: false,
        };
    }

    return null;
}

function extractTime(content, fallbackDate) {
    const source = String(content || '');
    const sanitized = source
        .replace(/<:MG_[A-Z]+:\d+>/gi, ' ')
        .replace(/:MG_[A-Z]+~?\d*:/gi, ' ');

    const colonMatch = sanitized.match(/\b(\d{1,2})\s*:\s*(\d{2})\b/);
    if (colonMatch) {
        return { hour: Number(colonMatch[1]), minute: Number(colonMatch[2]), explicit: true };
    }

    const dotMatch = sanitized.match(/\b(\d{1,2})\s*[.]\s*(\d{2})\s*(?:uhr|Uhr)\b/);
    if (dotMatch) {
        return { hour: Number(dotMatch[1]), minute: Number(dotMatch[2]), explicit: true };
    }

    const rangeMatch = sanitized.match(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:uhr|Uhr)\b/);
    if (rangeMatch) {
        return { hour: Number(rangeMatch[1]), minute: 0, explicit: true };
    }

    const hourMatch = sanitized.match(/\b(\d{1,2})\s*(?:uhr|Uhr)\b/);
    if (hourMatch) {
        return { hour: Number(hourMatch[1]), minute: 0, explicit: true };
    }

    if (fallbackDate) {
        return { hour: fallbackDate.getHours(), minute: fallbackDate.getMinutes(), explicit: false };
    }

    return null;
}

function formatDateTime(dateParts, timeParts) {
    if (!dateParts || !timeParts) {
        return null;
    }
    const { year, month, day } = dateParts;
    const { hour, minute } = timeParts;
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return null;
    }
    const normalized = new Date(year, month - 1, day, hour, minute);
    if (Number.isNaN(normalized.getTime())) {
        return null;
    }
    const padded = (value) => String(value).padStart(2, '0');
    return `${normalized.getFullYear()}-${padded(normalized.getMonth() + 1)}-${padded(normalized.getDate())} ${padded(normalized.getHours())}:${padded(normalized.getMinutes())}:00`;
}

function calculateConfidence({ hasTier, dateExplicit, timeExplicit }) {
    let confidence = 0;
    if (hasTier) confidence += 0.2;
    if (dateExplicit) confidence += 0.45;
    if (timeExplicit) confidence += 0.35;
    return Math.min(1, Number(confidence.toFixed(2)));
}

function parseAnnouncement(message) {
    const content = message?.content ?? '';
    const tier = extractTier(content);
    const fallbackDate = message?.createdAt ?? null;
    const dateParts = extractDate(content, fallbackDate);
    const timeParts = extractTime(content, fallbackDate);
    const startsAt = formatDateTime(dateParts, timeParts);
    const memberAvatar =
        typeof message?.member?.displayAvatarURL === 'function'
            ? message.member.displayAvatarURL({ extension: 'png', size: 128 })
            : null;
    const authorAvatar =
        typeof message?.author?.displayAvatarURL === 'function'
            ? message.author.displayAvatarURL({ extension: 'png', size: 128 })
            : null;

    if (!tier || !startsAt) {
        return null;
    }

    return {
        discord_channel_id: String(message.channelId),
        discord_guild_id: message.guildId ? String(message.guildId) : null,
        discord_message_id: String(message.id),
        discord_author_id: message.author?.id ? String(message.author.id) : null,
        discord_author_name: message.member?.displayName || message.author?.username || null,
        discord_author_avatar_url: memberAvatar || authorAvatar,
        title: extractTitle(content),
        content,
        tier,
        starts_at: startsAt,
        posted_at: message.createdAt ? message.createdAt.toISOString() : null,
        confidence: calculateConfidence({
            hasTier: true,
            dateExplicit: Boolean(dateParts?.explicit),
            timeExplicit: Boolean(timeParts?.explicit),
        }),
    };
}

async function scanGameAnnouncements(client, { channelId, since }) {
    const channel = await client.channels.fetch(channelId);
    const cutoff = since ? new Date(since) : null;
    const games = [];

    if (channel && typeof channel.isTextBased === 'function' && channel.isTextBased()) {
        let before;

        while (true) {
            const batch = await channel.messages.fetch({ limit: 100, before });
            if (!batch.size) break;

            const messages = [...batch.values()];
            for (const message of messages) {
                if (cutoff && message.createdAt < cutoff) {
                    continue;
                }
                const parsed = parseAnnouncement(message);
                if (parsed) {
                    games.push(parsed);
                }
            }

            const last = messages[messages.length - 1];
            if (!last) break;
            if (cutoff && last.createdAt < cutoff) {
                break;
            }
            before = last.id;
        }

        return { ok: true, games };
    }

    if (channel?.threads?.fetchActive) {
        const activeThreads = await channel.threads.fetchActive();
        const archivedThreads = await channel.threads.fetchArchived({ type: 'public' });
        const threads = [
            ...activeThreads.threads.values(),
            ...archivedThreads.threads.values(),
        ];

        for (const thread of threads) {
            if (cutoff && thread.createdAt && thread.createdAt < cutoff) {
                continue;
            }

            let starterMessage = null;
            if (typeof thread.fetchStarterMessage === 'function') {
                try {
                    starterMessage = await thread.fetchStarterMessage();
                } catch {
                    starterMessage = null;
                }
            }

            if (starterMessage) {
                const parsed = parseAnnouncement(starterMessage);
                if (parsed) {
                    games.push(parsed);
                }
            }
        }

        return { ok: true, games };
    }

    return { ok: false, status: 422, error: 'Channel is not text-based.' };
}

module.exports = {
    parseAnnouncement,
    scanGameAnnouncements,
};
