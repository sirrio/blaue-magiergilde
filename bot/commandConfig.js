function normalizePrefix(input) {
    const prefix = String(input || '').trim().toLowerCase();
    if (!prefix) return 'wwt';
    if (!/^[a-z0-9-]{1,32}$/.test(prefix)) {
        throw new Error('COMMAND_PREFIX must match /^[a-z0-9-]{1,32}$/');
    }
    return prefix;
}

function readConfigJson() {
    try {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        return require('./config.json');
    } catch {
        return {};
    }
}

function commandName(suffix) {
    const cfg = readConfigJson();
    const prefix = normalizePrefix(process.env.COMMAND_PREFIX || cfg.commandPrefix || 'wwt');
    const cleanedSuffix = String(suffix || '').trim().toLowerCase();
    if (!/^[a-z0-9-]{1,32}$/.test(cleanedSuffix)) {
        throw new Error('Command suffix must match /^[a-z0-9-]{1,32}$/');
    }
    const name = `${prefix}-${cleanedSuffix}`;
    if (name.length > 32) {
        throw new Error(`Slash command name too long (${name.length}/32): ${name}`);
    }
    return name;
}

function parseOwnerIdsFromEnv() {
    const raw = (process.env.OWNER_DISCORD_IDS || process.env.OWNER_DISCORD_ID || '').trim();
    if (!raw) return [];
    return raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

function parseOwnerIdsFromConfigJson() {
    const cfg = readConfigJson();
    const ids = [];
    if (cfg && typeof cfg.ownerId === 'string' && cfg.ownerId.trim()) ids.push(cfg.ownerId.trim());
    if (cfg && Array.isArray(cfg.ownerIds)) {
        for (const id of cfg.ownerIds) {
            if (typeof id === 'string' && id.trim()) ids.push(id.trim());
        }
    }
    return ids;
}

function ownerIdSet() {
    const ids = [
        ...parseOwnerIdsFromEnv(),
        ...parseOwnerIdsFromConfigJson(),
    ];
    return new Set(ids.map(String));
}

function isOwner(userId) {
    const owners = ownerIdSet();
    if (owners.size === 0) return true;
    return owners.has(String(userId));
}

module.exports = {
    commandName,
    isOwner,
};
