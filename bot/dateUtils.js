function formatLocalIsoDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateOnly(value) {
    if (!value) return '';
    if (value instanceof Date) return formatLocalIsoDate(value);
    const text = String(value).trim();
    if (!text) return '';
    return text.slice(0, 10);
}

module.exports = { formatLocalIsoDate, formatDateOnly };
