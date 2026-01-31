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
    const quoteMatch = content.match(/["„“”']([^"„“”']{2,})["„“”']/);
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

function sanitizeDateInput(content) {
    return String(content || '')
        .replace(/https?:\/\/\S+/gi, ' ')
        .replace(/<:MG_[A-Z0-9_]+:\d+>/gi, ' ')
        .replace(/:MG_[A-Z0-9_]+~?\d*:/gi, ' ')
        .replace(/<t:\d{9,12}(?::[tTdDfFR])?>/g, ' ')
        .replace(/<@&\d+>/g, ' ')
        .replace(/<@\d+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function resolveInferredYear({ day, month, year, hasYear }, fallbackDate) {
    if (!Number.isFinite(day) || !Number.isFinite(month)) {
        return null;
    }
    if (day < 1 || day > 31 || month < 1 || month > 12) {
        return null;
    }

    if (hasYear && Number.isFinite(year) && year >= 100 && year <= 999 && fallbackDate) {
        hasYear = false;
        year = undefined;
    }

    let resolvedYear = hasYear ? year : fallbackDate?.getFullYear();
    if (!Number.isFinite(resolvedYear)) {
        return null;
    }
    if (resolvedYear < 100) {
        resolvedYear += 2000;
    }
    if (resolvedYear > 9999) {
        const trimmed = Number(String(resolvedYear).slice(-4));
        if (Number.isFinite(trimmed)) {
            resolvedYear = trimmed;
        }
    }

    if (fallbackDate) {
        const candidate = new Date(resolvedYear, month - 1, day);
        const deltaDays = Math.round((candidate - fallbackDate) / (1000 * 60 * 60 * 24));
        const futureLimitDays = 31;

        if (deltaDays > futureLimitDays) {
            resolvedYear -= 1;
        } else if (deltaDays < -futureLimitDays) {
            resolvedYear += 1;
        }

        if (hasYear) {
            let adjustedCandidate = new Date(resolvedYear, month - 1, day);
            let adjustedDelta = Math.round((adjustedCandidate - fallbackDate) / (1000 * 60 * 60 * 24));
            const alternateYear = resolvedYear + (adjustedDelta > 0 ? -1 : 1);
            const alternateCandidate = new Date(alternateYear, month - 1, day);
            const alternateDelta = Math.round((alternateCandidate - fallbackDate) / (1000 * 60 * 60 * 24));

            if (Math.abs(adjustedDelta) > futureLimitDays && Math.abs(alternateDelta) < Math.abs(adjustedDelta)) {
                resolvedYear = alternateYear;
                adjustedCandidate = alternateCandidate;
                adjustedDelta = alternateDelta;
            }

            const fallbackYear = fallbackDate.getFullYear();
            if (resolvedYear > fallbackYear + 1 || resolvedYear < fallbackYear - 1 || Math.abs(adjustedDelta) > 366) {
                const guardYears = [fallbackYear - 1, fallbackYear, fallbackYear + 1];
                let bestYear = resolvedYear;
                let bestDelta = Number.POSITIVE_INFINITY;
                for (const guardYear of guardYears) {
                    const guardCandidate = new Date(guardYear, month - 1, day);
                    const guardDelta = Math.abs(Math.round((guardCandidate - fallbackDate) / (1000 * 60 * 60 * 24)));
                    if (guardDelta < bestDelta) {
                        bestDelta = guardDelta;
                        bestYear = guardYear;
                    }
                }
                resolvedYear = bestYear;
            }
        }
    }

    return {
        year: resolvedYear,
        month,
        day,
        explicit: Boolean(hasYear),
    };
}

function extractDate(content, fallbackDate) {
    const sanitized = sanitizeDateInput(content);
    const candidates = [];
    const isoMatches = sanitized.matchAll(/(\d{4})-(\d{1,2})-(\d{1,2})/g);
    for (const isoMatch of isoMatches) {
        const resolved = resolveInferredYear(
            {
                day: Number(isoMatch[3]),
                month: Number(isoMatch[2]),
                year: Number(isoMatch[1]),
                hasYear: true,
            },
            fallbackDate
        );
        if (resolved) {
            candidates.push(resolved);
        }
    }

    const monthNameMatch = sanitized.match(
        /(\d{1,2})\s*[.\-/]?\s*(januar|jänner|jan|februar|feb|märz|maerz|marz|april|mai|juni|juli|august|september|sept|oktober|okt|november|nov|dezember|dez)(?:\s*(\d{2,4}))?/i
    );
    if (monthNameMatch) {
        const monthMap = {
            januar: 1,
            jänner: 1,
            jan: 1,
            februar: 2,
            feb: 2,
            märz: 3,
            maerz: 3,
            marz: 3,
            april: 4,
            mai: 5,
            juni: 6,
            juli: 7,
            august: 8,
            september: 9,
            sept: 9,
            oktober: 10,
            okt: 10,
            november: 11,
            nov: 11,
            dezember: 12,
            dez: 12,
        };
        const day = Number(monthNameMatch[1]);
        const monthKey = monthNameMatch[2].toLowerCase();
        const month = monthMap[monthKey];
        const year = monthNameMatch[3] ? Number(monthNameMatch[3]) : undefined;
        const resolved = resolveInferredYear(
            {
                day,
                month,
                year,
                hasYear: Boolean(monthNameMatch[3]),
            },
            fallbackDate
        );
        if (resolved) {
            candidates.push(resolved);
        }
    }

    const dateMatches = sanitized.matchAll(/(\d{1,2})\s*[.-]\s*(\d{1,2})(?:\s*[.-]\s*(\d{2,4}))?/g);
    for (const dateMatch of dateMatches) {
        const day = Number(dateMatch[1]);
        const month = Number(dateMatch[2]);
        let hasYear = Boolean(dateMatch[3]);
        let year = dateMatch[3] ? Number(dateMatch[3]) : undefined;
        if (hasYear && dateMatch.index != null) {
            const tail = sanitized.slice(dateMatch.index + dateMatch[0].length).trimStart();
            if (Number.isFinite(year) && year <= 24 && /^(:|uhr\b|Uhr\b)/.test(tail)) {
                hasYear = false;
                year = undefined;
            }
        }
        const resolved = resolveInferredYear(
            { day, month, year, hasYear },
            fallbackDate
        );
        if (resolved) {
            candidates.push(resolved);
        }
    }

    const relative = parseRelativeDate(sanitized, fallbackDate);
    if (relative) {
        candidates.push({
            year: relative.getFullYear(),
            month: relative.getMonth() + 1,
            day: relative.getDate(),
            explicit: false,
        });
    }

    if (!candidates.length && fallbackDate) {
        return {
            year: fallbackDate.getFullYear(),
            month: fallbackDate.getMonth() + 1,
            day: fallbackDate.getDate(),
            explicit: false,
        };
    }

    if (!candidates.length) {
        return null;
    }

    if (!fallbackDate) {
        return candidates[0];
    }

    const scored = candidates.map(candidate => {
        const date = new Date(candidate.year, candidate.month - 1, candidate.day);
        const deltaDays = Math.round((date - fallbackDate) / (1000 * 60 * 60 * 24));
        return { ...candidate, deltaDays };
    });
    const windowed = scored.filter(candidate => Math.abs(candidate.deltaDays) <= 31);
    const pool = windowed.length ? windowed : scored;
    pool.sort((a, b) => {
        const delta = Math.abs(a.deltaDays) - Math.abs(b.deltaDays);
        if (delta !== 0) {
            return delta;
        }
        if (a.explicit === b.explicit) {
            return 0;
        }
        return a.explicit ? -1 : 1;
    });

    const { deltaDays, ...best } = pool[0];
    return best;
}

function extractTime(content, fallbackDate) {
    const source = sanitizeDateInput(content);
    const sanitized = source
        .replace(/<:MG_[A-Z]+:\d+>/gi, ' ')
        .replace(/:MG_[A-Z]+~?\d*:/gi, ' ');
    const timeSource = sanitized
        .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, ' ')
        .replace(/\b\d{1,2}\s*[.-]\s*\d{1,2}(?:\s*[.-]\s*\d{2,4})?\b/g, ' ');

    const slashRangeMatch = timeSource.match(/\b(\d{1,2})(?::(\d{2}))?\s*\/\s*(\d{1,2})(?::(\d{2}))?\s*(?:uhr|Uhr)?\b/);
    if (slashRangeMatch) {
        const hour = Number(slashRangeMatch[1]);
        const minute = Number(slashRangeMatch[2] || 0);
        const hasMinutes = slashRangeMatch[2] || slashRangeMatch[4];
        const hasUhr = /uhr/i.test(slashRangeMatch[0]);
        if (hasMinutes || hasUhr || hour >= 5) {
            return { hour, minute, explicit: true };
        }
    }

    const colonMatch = timeSource.match(/\b(\d{1,2})\s*:\s*(\d{2})\b/);
    if (colonMatch) {
        return { hour: Number(colonMatch[1]), minute: Number(colonMatch[2]), explicit: true };
    }

    const dotMatch = timeSource.match(/\b(\d{1,2})\s*[.]\s*(\d{2})\s*(?:uhr|Uhr)?\b/);
    if (dotMatch) {
        return { hour: Number(dotMatch[1]), minute: Number(dotMatch[2]), explicit: true };
    }

    const looseDotMatch = timeSource.match(/(?:\/\/|\s\/\s|\s-\s|\s\|\s)\s*(\d{1,2})\.(\d{2})\b/);
    if (looseDotMatch) {
        return { hour: Number(looseDotMatch[1]), minute: Number(looseDotMatch[2]), explicit: true };
    }

    const rangeMatch = timeSource.match(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:uhr|Uhr)\b/);
    if (rangeMatch) {
        return { hour: Number(rangeMatch[1]), minute: 0, explicit: true };
    }

    const quarterMatch = timeSource.match(/\b(1\/4|3\/4)\s*(nach|vor)\s*(\d{1,2})\b/i);
    if (quarterMatch) {
        const fraction = quarterMatch[1];
        const direction = quarterMatch[2].toLowerCase();
        const baseHour = Number(quarterMatch[3]);
        const minutes = fraction === '1/4' ? 15 : 45;
        if (direction === 'nach') {
            return { hour: baseHour, minute: minutes, explicit: true };
        }
        const hour = baseHour === 0 ? 23 : baseHour - 1;
        return { hour, minute: minutes === 15 ? 45 : 15, explicit: true };
    }

    const halfMatch = timeSource.match(/\bhalb\s*(\d{1,2})\b/i);
    if (halfMatch) {
        const baseHour = Number(halfMatch[1]);
        const hour = baseHour === 0 ? 23 : baseHour - 1;
        return { hour, minute: 30, explicit: true };
    }

    const hMatch = timeSource.match(/\b(\d{1,2})\s*h\s*(\d{2})?\b/i);
    if (hMatch) {
        return { hour: Number(hMatch[1]), minute: Number(hMatch[2] || 0), explicit: true };
    }

    const hourMatch = timeSource.match(/\b(\d{1,2})\s*(?:uhr|Uhr)\b/);
    if (hourMatch) {
        return { hour: Number(hourMatch[1]), minute: 0, explicit: true };
    }

    const umMatch = timeSource.match(/\bum\s*(\d{1,2})(?![:.\d])\b/i);
    if (umMatch) {
        return { hour: Number(umMatch[1]), minute: 0, explicit: true };
    }

    if (fallbackDate) {
        return { hour: fallbackDate.getHours(), minute: fallbackDate.getMinutes(), explicit: false };
    }

    return null;
}

function extractDiscordTimestamp(content) {
    const match = String(content || '').match(/<t:(\d{9,12})(?::[tTdDfFR])?>/);
    if (!match) {
        return null;
    }

    const epoch = Number(match[1]);
    if (!Number.isFinite(epoch)) {
        return null;
    }
    const date = new Date(epoch * 1000);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return {
        dateParts: {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            explicit: true,
        },
        timeParts: {
            hour: date.getHours(),
            minute: date.getMinutes(),
            explicit: true,
        },
    };
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
    const timestampParts = extractDiscordTimestamp(content);
    const dateParts = timestampParts?.dateParts || extractDate(content, fallbackDate);
    const timeParts = timestampParts?.timeParts || extractTime(content, fallbackDate);
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
