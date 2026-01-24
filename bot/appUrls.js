function normalizeUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';

    try {
        return new URL(value).toString().replace(/\/$/, '');
    } catch {
        return value.replace(/\/$/, '');
    }
}

function resolveApiBaseUrl() {
    return normalizeUrl(process.env.BOT_APP_URL || '');
}

function resolvePublicBaseUrl() {
    return normalizeUrl(process.env.BOT_PUBLIC_APP_URL || process.env.APP_URL || '');
}

module.exports = {
    resolveApiBaseUrl,
    resolvePublicBaseUrl,
};
