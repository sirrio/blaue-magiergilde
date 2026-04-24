function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

const { bubblesRequiredForLevel, levelFromAvailableBubbles } = require('./levelProgression');

function additionalBubblesForStartTier(startTier) {
    switch (String(startTier || '').toLowerCase()) {
        case 'lt':
            return 10;
        case 'ht':
            return 55;
        case 'bt':
        default:
            return 0;
    }
}

function countsBubbleAdjustmentsForProgression(character) {
    return !character.is_filler;
}

function snapshotNumber(character, key) {
    const value = character?.progression_state?.[key];
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function requireSnapshotNumber(character, key) {
    const value = snapshotNumber(character, key);
    if (value === null) {
        throw new Error(`Missing character progression snapshot value: ${key}`);
    }

    return value;
}

function calculateRawAvailableBubbles(character) {
    return Math.max(0, requireSnapshotNumber(character, 'tracked_available_bubbles'));
}

function calculateAvailableBubbles(character) {
    return Math.max(0, requireSnapshotNumber(character, 'available_bubbles'));
}

function calculateRawBubblesInCurrentLevel(character, level) {
    const currentTotal = bubblesRequiredForLevel(level, character.progression_version_id);
    return Math.max(0, calculateRawAvailableBubbles(character) - currentTotal);
}

function calculateBubblesInCurrentLevel(character) {
    return Math.max(0, requireSnapshotNumber(character, 'bubbles_in_level'));
}

function calculateRawLevel(character) {
    return levelFromAvailableBubbles(calculateRawAvailableBubbles(character), character.progression_version_id);
}

function calculateLevel(character) {
    return Math.max(1, Math.min(20, Math.floor(requireSnapshotNumber(character, 'level'))));
}

function calculateTierFromLevel(level) {
    if (level >= 17) return 'ET';
    if (level >= 11) return 'HT';
    if (level >= 5) return 'LT';
    return 'BT';
}

module.exports = {
    additionalBubblesForStartTier,
    calculateAvailableBubbles,
    calculateBubblesInCurrentLevel,
    calculateLevel,
    calculateRawAvailableBubbles,
    calculateRawBubblesInCurrentLevel,
    calculateRawLevel,
    calculateTierFromLevel,
    countsBubbleAdjustmentsForProgression,
};
