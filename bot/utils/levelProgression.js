const db = require('../db');

let cachedTotalsByVersion = null;
let cachedVersionId = null;
let cachedFromTestInjection = false;

function clampLevel(value) {
    return Math.min(20, Math.max(1, Math.round(Number(value) || 0)));
}

function normalizeTotals(totals) {
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

    return normalizedTotals;
}

function setLevelProgressionTotals(totals) {
    cachedTotalsByVersion = { 1: normalizeTotals(totals) };
    cachedVersionId = 1;
    cachedFromTestInjection = true;
}

function currentTotals(versionId = null) {
    if (!cachedTotalsByVersion) {
        throw new Error('Level progression totals have not been loaded.');
    }

    const resolvedVersionId = Number.isInteger(Number(versionId)) && Number(versionId) > 0
        ? Number(versionId)
        : cachedVersionId;

    const totals = cachedTotalsByVersion[resolvedVersionId];

    if (!totals) {
        throw new Error(`Level progression totals for version ${resolvedVersionId} have not been loaded.`);
    }

    return totals;
}

async function ensureLevelProgressionLoaded(force = false) {
    if (!force && cachedTotalsByVersion && cachedFromTestInjection) {
        return cachedTotalsByVersion;
    }

    const [rows] = await db.execute(
        `
            SELECT lp.level, lp.required_bubbles, lp.version_id, lpv.is_active
            FROM level_progressions lp
            INNER JOIN level_progression_versions lpv ON lpv.id = lp.version_id
            ORDER BY lp.version_id ASC, lp.level ASC
        `,
    );

    const totalsByVersion = {};
    let activeVersionId = null;

    for (const row of rows || []) {
        const versionId = Number(row.version_id);
        const level = Number(row.level);
        const requiredBubbles = Number(row.required_bubbles);

        if (!totalsByVersion[versionId]) {
            totalsByVersion[versionId] = {};
        }

        totalsByVersion[versionId][level] = requiredBubbles;

        if (Number(row.is_active) === 1) {
            activeVersionId = versionId;
        }
    }

    for (const [versionId, totals] of Object.entries(totalsByVersion)) {
        totalsByVersion[Number(versionId)] = normalizeTotals(totals);
    }

    cachedTotalsByVersion = totalsByVersion;
    cachedVersionId = Number.isInteger(activeVersionId) && activeVersionId > 0 ? activeVersionId : null;
    cachedFromTestInjection = false;

    return cachedTotalsByVersion;
}

function activeLevelProgressionVersionId() {
    if (!Number.isInteger(cachedVersionId) || cachedVersionId <= 0) {
        throw new Error('Active level progression version has not been loaded.');
    }

    return cachedVersionId;
}

function bubblesRequiredForLevel(level, versionId = null) {
    const normalizedLevel = clampLevel(level);
    return currentTotals(versionId)[normalizedLevel];
}

function bubblesRequiredForNextLevel(level, versionId = null) {
    const normalizedLevel = clampLevel(level);
    if (normalizedLevel >= 20) {
        return 0;
    }

    return bubblesRequiredForLevel(normalizedLevel + 1, versionId) - bubblesRequiredForLevel(normalizedLevel, versionId);
}

function levelFromAvailableBubbles(availableBubbles, versionId = null) {
    let remainingBubbles = Math.max(0, Number(availableBubbles) || 0);
    let level = 1;

    while (level < 20) {
        const requiredForNextLevel = bubblesRequiredForNextLevel(level, versionId);

        if (remainingBubbles < requiredForNextLevel) {
            break;
        }

        remainingBubbles -= requiredForNextLevel;
        level += 1;
    }

    return level;
}

module.exports = {
    activeLevelProgressionVersionId,
    bubblesRequiredForLevel,
    bubblesRequiredForNextLevel,
    clampLevel,
    ensureLevelProgressionLoaded,
    levelFromAvailableBubbles,
    setLevelProgressionTotals,
};
