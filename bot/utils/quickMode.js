function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function calculateLevelFromBubbles(availableBubbles) {
    const effective = Math.max(0, safeInt(availableBubbles));
    const level = Math.floor(1 + (Math.sqrt(8 * effective + 1) - 1) / 2);
    return Math.min(20, Math.max(1, level));
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
    const targetAvailableBubbles = (normalizedLevel - 1) * normalizedLevel / 2;
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
