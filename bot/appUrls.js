function normalizeUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';

    const trimmed = value.replace(/\/$/, '');
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

    try {
        return new URL(withScheme).toString().replace(/\/$/, '');
    } catch {
        return withScheme.replace(/\/$/, '');
    }
}

function resolveApiBaseUrl() {
    return normalizeUrl(process.env.BOT_APP_URL || '');
}

function resolveApiBaseUrls() {
    return [
        process.env.BOT_APP_URL || '',
        process.env.BOT_PUBLIC_APP_URL || '',
        process.env.APP_URL || '',
    ]
        .map(normalizeUrl)
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index);
}

function resolvePublicBaseUrl() {
    return normalizeUrl(process.env.BOT_PUBLIC_APP_URL || process.env.APP_URL || '');
}

module.exports = {
    resolveApiBaseUrl,
    resolveApiBaseUrls,
    resolvePublicBaseUrl,
};
