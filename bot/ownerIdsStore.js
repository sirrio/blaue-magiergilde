const { ownerIds: envOwnerIds } = require('./config');
const { resolveApiBaseUrl } = require('./appUrls');
const { withInsecureDispatcher } = require('./httpClient');

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
    const appUrl = resolveApiBaseUrl();
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();
    if (!appUrl || !token) return false;

    try {
        const endpoint = `${appUrl.replace(/\/$/, '')}/bot/discord-owners`;
        const response = await fetch(endpoint, withInsecureDispatcher(endpoint, {
            headers: {
                Accept: 'application/json',
                'X-Bot-Token': token,
            },
        }));

        if (!response.ok) return false;
        const payload = await response.json();
        if (Array.isArray(payload?.owner_ids)) {
            updateOwnerIds(payload.owner_ids);
            return true;
        }
    } catch {
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

function ownerIdsList() {
    return Array.from(cachedOwnerIds);
}

module.exports = {
    ownerIdSet,
    ownerIdsUpdatedAt,
    ownerIdsList,
    refreshOwnerIds,
};
