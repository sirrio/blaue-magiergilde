const db = require('../db');

const cacheTtlMs = 60 * 1000;
let cachedTotals = null;
let cachedAt = 0;

function clampLevel(value) {
    return Math.min(20, Math.max(1, Math.round(Number(value) || 0)));
}

function setLevelProgressionTotals(totals) {
    if (!totals || typeof totals !== 'object') {
        throw new Error('Missing level progression totals.');
    }

    const normalizedTotals = {};

    for (const [level, requiredBubbles] of Object.entries(totals)) {
        const normalizedLevel = Number(level);
        const normalizedRequiredBubbles = Number(requiredBubbles);

        if (
            Number.isInteger(normalizedLevel)
            && normalizedLevel >= 1
            && normalizedLevel <= 20
            && Number.isFinite(normalizedRequiredBubbles)
        ) {
            normalizedTotals[normalizedLevel] = Math.max(0, Math.floor(normalizedRequiredBubbles));
        }
    }

    if (Object.keys(normalizedTotals).length !== 20) {
        throw new Error('Level progression totals must contain exactly 20 levels.');
    }

    cachedTotals = normalizedTotals;
    cachedAt = Date.now();
}

function currentTotals() {
    if (!cachedTotals) {
        throw new Error('Level progression totals have not been loaded.');
    }

    return cachedTotals;
}

async function ensureLevelProgressionLoaded(force = false) {
    if (!force && cachedTotals && (Date.now() - cachedAt) < cacheTtlMs) {
        return cachedTotals;
    }

    const [rows] = await db.execute(
        'SELECT level, required_bubbles FROM level_progressions ORDER BY level ASC',
    );

    const totals = {};
    for (const row of rows || []) {
        totals[Number(row.level)] = Number(row.required_bubbles);
    }

    setLevelProgressionTotals(totals);

    return cachedTotals;
}

function bubblesRequiredForLevel(level) {
    const normalizedLevel = clampLevel(level);
    return currentTotals()[normalizedLevel];
}

function bubblesRequiredForNextLevel(level) {
    const normalizedLevel = clampLevel(level);
    if (normalizedLevel >= 20) {
        return 0;
    }

    return bubblesRequiredForLevel(normalizedLevel + 1) - bubblesRequiredForLevel(normalizedLevel);
}

function levelFromAvailableBubbles(availableBubbles) {
    let remainingBubbles = Math.max(0, Number(availableBubbles) || 0);
    let level = 1;

    while (level < 20) {
        const requiredForNextLevel = bubblesRequiredForNextLevel(level);

        if (remainingBubbles < requiredForNextLevel) {
            break;
        }

        remainingBubbles -= requiredForNextLevel;
        level += 1;
    }

    return level;
}

module.exports = {
    bubblesRequiredForLevel,
    bubblesRequiredForNextLevel,
    clampLevel,
    ensureLevelProgressionLoaded,
    levelFromAvailableBubbles,
    setLevelProgressionTotals,
};
