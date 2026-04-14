function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

const {
    bubblesRequiredForLevel,
    levelFromAvailableBubbles,
} = require('./levelProgression');

function calculateLevelFromBubbles(availableBubbles) {
    return levelFromAvailableBubbles(Math.max(0, safeInt(availableBubbles)));
}

function calculateMinAllowedLevel({
    immutableAdventureBubbles,
    dmBubbles,
    additionalBubbles,
    bubbleSpend,
}) {
    const available = safeInt(immutableAdventureBubbles)
        + safeInt(dmBubbles)
        + safeInt(additionalBubbles)
        - safeInt(bubbleSpend);
    return calculateLevelFromBubbles(available);
}

function calculateRequiredAdventureBubbles({
    level,
    dmBubbles,
    additionalBubbles,
    bubbleSpend,
}) {
    const normalizedLevel = Math.min(20, Math.max(1, safeInt(level, 1)));
    const targetAvailableBubbles = bubblesRequiredForLevel(normalizedLevel);
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
