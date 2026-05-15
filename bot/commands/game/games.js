const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
} = require('discord.js');
const db = require('../../db');
const { commandName } = require('../../commandConfig');

const TIER_FALLBACK = {
    bt: '🟫',
    lt: '⬜',
    ht: '🟨',
    et: '🟪',
};

const TIER_EMOJI_NAMES = {
    bt: 'MG_BT',
    lt: 'MG_LT',
    ht: 'MG_HT',
    et: 'MG_ET',
};

function resolveTierEmojis(client) {
    const cache = client?.emojis?.cache;
    const map = {};
    for (const [tier, fallback] of Object.entries(TIER_FALLBACK)) {
        const name = TIER_EMOJI_NAMES[tier];
        const emoji = cache && typeof cache.find === 'function'
            ? cache.find((entry) => entry?.name === name && entry?.available !== false)
            : null;
        map[tier] = emoji ? emoji.toString() : fallback;
    }
    return map;
}

function parseTierList(tier) {
    return String(tier || '')
        .toLowerCase()
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function tierLabel(tierEmojis, tier) {
    const keys = parseTierList(tier);
    if (!keys.length) return '·';
    const parts = keys.map((key) => {
        const emoji = tierEmojis[key] || '·';
        return `${emoji} ${key.toUpperCase()}`;
    });
    return parts.join(' ');
}

const WEEKDAY_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTH_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDayHeading(date, todayKey) {
    const key = dayKey(date);
    const label = `${WEEKDAY_DE[date.getDay()]}, ${date.getDate()}. ${MONTH_DE[date.getMonth()]}`;
    return key === todayKey ? `**Heute** · ${label}` : `**${label}**`;
}

function unixSeconds(date) {
    return Math.floor(date.getTime() / 1000);
}

function truncate(value, max) {
    const str = String(value || '').trim();
    if (str.length <= max) return str;
    return `${str.slice(0, max - 1)}…`;
}

function cleanContentForDisplay(content) {
    let str = String(content || '');
    if (!str) return '';

    str = str
        .replace(/<a?:[A-Za-z0-9_]+:\d+>/g, ' ')         // custom emojis <:NAME:ID>
        .replace(/:MG_[A-Z0-9_]+~?\d*:/gi, ' ')          // shortcode tier emojis
        .replace(/<t:\d{9,12}(?::[tTdDfFR])?>/g, ' ')    // discord timestamps
        .replace(/<@[!&]?\d+>/g, ' ')                    // user/role mentions
        .replace(/<#\d+>/g, ' ')                         // channel mentions
        .replace(/~~([^~]+)~~/g, '$1')                   // unwrap strikethrough
        .replace(/\*\*([^*]+)\*\*/g, '$1')               // unwrap bold
        .replace(/__([^_]+)__/g, '$1')                   // unwrap bold (alt)
        .replace(/(?<!\*)\*(?!\*)/g, ' ')                // strip stray asterisks
        .replace(/(?<![_a-zA-Z0-9])_(?![_a-zA-Z0-9])/g, ' ') // strip stray underscores
        .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, ' ')      // ISO dates
        .replace(/\b\d{1,2}[.\-/]\d{1,2}(?:[.\-/]\d{2,4})?\b/g, ' ') // dd.mm[.yyyy]
        .replace(/\b\d{1,2}\s*[.:h]\s*\d{2}\s*(?:uhr|Uhr)?\b/g, ' ') // 18:00, 18.00, 18h00
        .replace(/\b\d{1,2}\s*(?:uhr|Uhr)\b/g, ' ')      // 18 Uhr
        .replace(/\b(?:mo|di|mi|do|fr|sa|so)\b\.?,?/gi, ' ') // weekday short
        .replace(/\b(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b,?/gi, ' ')
        .replace(/\b(?:heute|morgen|gestern|übermorgen|uebermorgen)\b/gi, ' ')
        .replace(/\b(?:ca\.?|circa|etwa|gegen|ungefähr|ungefaehr|approx\.?)\b/gi, ' ')
        .replace(/\(\s*[+\-±~]+\s*\)/g, ' ')             // (+-), (~), (±)
        .replace(/[\r\n]+/g, ' ')
        .replace(/[\s|·•–—-]{2,}/g, ' ')                 // collapse separators
        .replace(/\s{2,}/g, ' ')
        .trim();

    // Drop orphan opening/closing quote that has no pair (truncated content).
    const quoteChars = ['"', '“', '”', '„', '‟'];
    for (const q of quoteChars) {
        const count = (str.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (count === 1) {
            str = str.split(q).join('').trim();
        }
    }
    // Final trim: strip leading/trailing separators & punctuation noise.
    str = str.replace(/^[\s·•|–—\-,.:;*_/\\]+|[\s·•|–—\-,.:;*_/\\]+$/g, '').trim();

    return str;
}

function isLabelMeaningful(label) {
    if (!label) return false;
    if (label.length < 4) return false;
    // Strip emoji/punctuation/whitespace and require at least 3 alphanumerics left.
    const alnum = label.replace(/[^\p{L}\p{N}]+/gu, '');
    if (alnum.length < 3) return false;
    // Skip if entire content is a single stop-word (e.g. "Ich", "um", "noch").
    const STOP_WORDS = new Set([
        'ich', 'du', 'wir', 'ihr', 'sie', 'er', 'es',
        'um', 'am', 'im', 'an', 'auf', 'bei', 'zu', 'zur', 'zum',
        'und', 'oder', 'aber', 'denn', 'doch',
        'der', 'die', 'das', 'den', 'dem', 'des',
        'ein', 'eine', 'einen', 'einem', 'einer',
        'mit', 'für', 'fur', 'von', 'vom', 'bis', 'so',
        'noch', 'jetzt', 'mal', 'mehr',
    ]);
    if (STOP_WORDS.has(label.toLowerCase())) return false;
    return true;
}

function resolveGameLabel(game, maxLength = 60) {
    const title = String(game.title || '').trim();
    if (title) return truncate(title, maxLength);

    const cleaned = cleanContentForDisplay(game.content);
    if (isLabelMeaningful(cleaned)) return truncate(cleaned, maxLength);

    return 'Untitled game';
}

function publicGamesUrl() {
    const base = String(process.env.BOT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
    if (!base) return null;
    return `${base.replace(/\/$/, '')}/games`;
}

async function fetchUpcomingGames(limit = 20) {
    const safeLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 20));
    const [rows] = await db.execute(
        `SELECT discord_channel_id, discord_guild_id, discord_message_id,
                discord_author_name, title, content, tier, starts_at
         FROM game_announcements
         WHERE starts_at IS NOT NULL
           AND starts_at >= NOW()
           AND (cancelled = 0 OR cancelled IS NULL)
         ORDER BY starts_at ASC
         LIMIT ${safeLimit}`,
    );
    return rows;
}

function buildMessageUrl(game) {
    if (!game.discord_guild_id || !game.discord_channel_id || !game.discord_message_id) {
        return null;
    }
    return `https://discord.com/channels/${game.discord_guild_id}/${game.discord_channel_id}/${game.discord_message_id}`;
}

function buildGameLine(game, tierEmojis) {
    const startsAt = toDate(game.starts_at);
    if (!startsAt) return null;
    const tier = tierLabel(tierEmojis, game.tier);
    const title = resolveGameLabel(game, 60);
    const author = truncate(game.discord_author_name || 'Unknown', 24);
    const unix = unixSeconds(startsAt);
    const url = buildMessageUrl(game);
    const titlePart = url ? `[**${title}**](${url})` : `**${title}**`;
    return `${tier} <t:${unix}:t> · <t:${unix}:R> — ${titlePart} · ${author}`;
}

function buildGamesEmbed(games, { tierEmojis } = {}) {
    const resolvedTiers = tierEmojis || { ...TIER_FALLBACK };
    const embed = new EmbedBuilder()
        .setColor(0x4f46e5)
        .setTitle('Kommende Spiele');

    if (!games.length) {
        embed.setDescription('Aktuell sind keine kommenden Spiele angekündigt.');
        const url = publicGamesUrl();
        if (url) embed.setURL(url);
        return embed;
    }

    const now = new Date();
    const todayKey = dayKey(now);
    const groups = new Map();
    for (const game of games) {
        const startsAt = toDate(game.starts_at);
        if (!startsAt) continue;
        const key = dayKey(startsAt);
        if (!groups.has(key)) {
            groups.set(key, { date: startsAt, lines: [] });
        }
        const line = buildGameLine(game, resolvedTiers);
        if (line) groups.get(key).lines.push(line);
    }

    let fieldsBudget = 25;
    for (const { date, lines } of groups.values()) {
        if (fieldsBudget <= 0) break;
        if (!lines.length) continue;
        // Discord limits field values to 1024 chars; chunk if needed.
        const heading = formatDayHeading(date, todayKey);
        const chunks = [];
        let current = '';
        for (const line of lines) {
            const candidate = current ? `${current}\n${line}` : line;
            if (candidate.length > 1000) {
                if (current) chunks.push(current);
                current = line;
            } else {
                current = candidate;
            }
        }
        if (current) chunks.push(current);
        for (let i = 0; i < chunks.length && fieldsBudget > 0; i += 1) {
            embed.addFields({
                name: i === 0 ? heading : `${heading} (Forts.)`,
                value: chunks[i],
                inline: false,
            });
            fieldsBudget -= 1;
        }
    }

    const url = publicGamesUrl();
    if (url) {
        embed.setURL(url);
        embed.setFooter({ text: `Vollständige Liste: ${url}` });
    }

    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('games'))
        .setDescription('Zeigt die nächsten angekündigten Spiele.')
        .setContexts(0, 1),
    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        let games = [];
        try {
            games = await fetchUpcomingGames(20);
        } catch (error) {
            console.warn('[bot] /games command failed:', error);
            await interaction.editReply({
                content: 'Konnte die Spieleliste gerade nicht laden. Bitte später erneut versuchen.',
                embeds: [],
                components: [],
            });
            return;
        }

        const tierEmojis = resolveTierEmojis(interaction.client);
        const embed = buildGamesEmbed(games, { tierEmojis });
        await interaction.editReply({
            content: '',
            embeds: [embed],
            components: [],
        });
    },
    fetchUpcomingGames,
    buildGamesEmbed,
    resolveTierEmojis,
    cleanContentForDisplay,
    resolveGameLabel,
};
