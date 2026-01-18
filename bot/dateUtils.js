function formatLocalIsoDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatIsoDate(value, fallback = '-') {
    if (value instanceof Date) {
        return formatLocalIsoDate(value);
    }

    const text = String(value || '').trim();
    if (!text) return fallback;

    const match = text.match(/\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];

    const timestamp = Date.parse(text);
    if (Number.isNaN(timestamp)) return fallback;
    return formatLocalIsoDate(new Date(timestamp));
}

function formatTimeHHMM(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '00:00';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

module.exports = { formatIsoDate, formatLocalIsoDate, formatTimeHHMM };
