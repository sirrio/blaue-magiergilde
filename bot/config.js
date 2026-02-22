require('./env');

function parseList(value) {
    if (!value) return [];
    const raw = String(value).trim();
    if (!raw) return [];
    if (raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map(String).map(s => s.trim()).filter(Boolean);
        } catch {
            // fall back to csv
        }
    }
    return raw.split(',').map(s => s.trim()).filter(Boolean);
}

const token = (process.env.DISCORD_BOT_TOKEN || '').trim();
const clientId = (process.env.DISCORD_CLIENT_ID || '').trim();
const guildIds = parseList(process.env.DISCORD_GUILD_IDS);
const commandPrefix = String(process.env.DISCORD_COMMAND_PREFIX || 'mg').trim();
const ownerIds = parseList(process.env.DISCORD_OWNER_IDS);
const supportStaffRoleIds = parseList(process.env.DISCORD_SUPPORT_STAFF_ROLE_IDS);

module.exports = {
    token,
    clientId,
    guildIds,
    commandPrefix,
    ownerIds,
    supportStaffRoleIds,
};
