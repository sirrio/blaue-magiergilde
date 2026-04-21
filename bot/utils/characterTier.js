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
    return !character.simplified_tracking && !safeInt(character.has_pseudo_adventure);
}

function calculateAvailableBubbles(character) {
    if (character.is_filler) return 0;

    const bubbleAdjustmentsCount = countsBubbleAdjustmentsForProgression(character);
    const bubbles = safeInt(character.adventure_bubbles) + (bubbleAdjustmentsCount ? safeInt(character.dm_bubbles) : 0);
    // Pseudo-adventures encode the level directly via target_level — start_tier
    // is already accounted for in that stored value and must not be added again.
    const additional = safeInt(character.has_pseudo_adventure) ? 0 : additionalBubblesForStartTier(character.start_tier);
    const spend = bubbleAdjustmentsCount ? safeInt(character.bubble_shop_spend) : 0;

    return Math.max(0, bubbles + additional - spend);
}

function calculateBubblesInCurrentLevel(character, level) {
    const bubbleAdjustmentsCount = countsBubbleAdjustmentsForProgression(character);
    const bubbles = safeInt(character.adventure_bubbles) + (bubbleAdjustmentsCount ? safeInt(character.dm_bubbles) : 0);
    const additional = safeInt(character.has_pseudo_adventure) ? 0 : additionalBubblesForStartTier(character.start_tier);
    const spend = bubbleAdjustmentsCount ? safeInt(character.bubble_shop_spend) : 0;
    const currentTotal = bubblesRequiredForLevel(level, character.progression_version_id) - additional;
    return Math.max(0, bubbles - currentTotal - spend);
}

function calculateLevel(character) {
    if (character.is_filler) return 3;
    return levelFromAvailableBubbles(calculateAvailableBubbles(character), character.progression_version_id);
}

function calculateTierFromLevel(level) {
    if (level >= 17) return 'ET';
    if (level >= 11) return 'HT';
    if (level >= 5) return 'LT';
    return 'BT';
}

module.exports = {
    additionalBubblesForStartTier,
    calculateBubblesInCurrentLevel,
    calculateLevel,
    calculateTierFromLevel,
    countsBubbleAdjustmentsForProgression,
};
