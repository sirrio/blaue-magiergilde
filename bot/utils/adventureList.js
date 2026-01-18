const { formatIsoDate } = require('../dateUtils');

function truncateText(value, max = 200) {
    const text = String(value || '').trim();
    if (!text) return '-';
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}...`;
}

function formatAdventureListDescription(adventure) {
    const date = formatIsoDate(adventure.start_date);
    const gameMaster = String(adventure.game_master || '').trim() || '-';
    const notes = String(adventure.notes || '').trim() || '-';
    const prefix = `${date} \u007f DM: ${gameMaster} \u007f `;
    const maxNotes = Math.max(1, 100 - prefix.length);
    return `${prefix}${truncateText(notes, maxNotes)}`.slice(0, 100);
}

module.exports = { formatAdventureListDescription };
