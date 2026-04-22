function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

const {
    bubblesRequiredForLevel,
    levelFromAvailableBubbles,
} = require('./levelProgression');

function calculateLevelFromBubbles(availableBubbles, versionId = null) {
    return levelFromAvailableBubbles(Math.max(0, safeInt(availableBubbles)), versionId);
}

function calculateMinAllowedLevel({
    immutableAdventureBubbles,
    dmBubbles,
    additionalBubbles,
    bubbleSpend,
    progressionVersionId = null,
}) {
    const available = safeInt(immutableAdventureBubbles)
        + safeInt(dmBubbles)
        + safeInt(additionalBubbles)
        - safeInt(bubbleSpend);
    return calculateLevelFromBubbles(available, progressionVersionId);
}

function calculateRequiredAdventureBubbles({
    level,
    dmBubbles,
    additionalBubbles,
    bubbleSpend,
    progressionVersionId = null,
}) {
    const normalizedLevel = Math.min(20, Math.max(1, safeInt(level, 1)));
    const targetAvailableBubbles = bubblesRequiredForLevel(normalizedLevel, progressionVersionId);
    const required = targetAvailableBubbles
        - safeInt(dmBubbles)
        - safeInt(additionalBubbles)
        + safeInt(bubbleSpend);
    return Math.max(0, required);
}

module.exports = {
    calculateMinAllowedLevel,
    calculateRequiredAdventureBubbles,
};
