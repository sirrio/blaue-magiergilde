const { ownerIds: envOwnerIds } = require('./config');

let cachedOwnerIds = new Set((envOwnerIds || []).map(String));
let lastUpdatedAt = null;

function normalizeOwnerIds(list) {
    if (!Array.isArray(list)) return [];
    return list
        .map((id) => String(id || '').trim())
        .filter((id) => /^[0-9]{5,}$/.test(id));
}

function updateOwnerIds(list) {
    const normalized = normalizeOwnerIds(list);
    cachedOwnerIds = new Set(normalized);
    lastUpdatedAt = new Date();
}

async function refreshOwnerIds() {
    const appUrl = String(process.env.APP_URL || '').trim();
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();
    if (!appUrl || !token) return false;

    try {
        const response = await fetch(`${appUrl.replace(/\/$/, '')}/bot/discord-owners`, {
            headers: {
                Accept: 'application/json',
                'X-Bot-Token': token,
            },
        });

        if (!response.ok) return false;
        const payload = await response.json();
        if (Array.isArray(payload?.owner_ids)) {
            updateOwnerIds(payload.owner_ids);
            return true;
        }
    } catch (error) {
        return false;
    }

    return false;
}

function ownerIdSet() {
    return cachedOwnerIds;
}

function ownerIdsUpdatedAt() {
    return lastUpdatedAt;
}

module.exports = {
    ownerIdSet,
    ownerIdsUpdatedAt,
    refreshOwnerIds,
};
