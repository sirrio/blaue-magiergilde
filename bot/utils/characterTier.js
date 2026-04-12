function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

const { levelFromAvailableBubbles } = require('./levelProgression');

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
    return !Boolean(character.simplified_tracking) && !Boolean(safeInt(character.has_pseudo_adventure));
}

function calculateLevel(character) {
    const isFiller = Boolean(character.is_filler);
    if (isFiller) return 3;

    const bubbleAdjustmentsCount = countsBubbleAdjustmentsForProgression(character);
    const bubbles = safeInt(character.adventure_bubbles) + (bubbleAdjustmentsCount ? safeInt(character.dm_bubbles) : 0);
    const additional = additionalBubblesForStartTier(character.start_tier);
    const spend = bubbleAdjustmentsCount ? safeInt(character.bubble_shop_spend) : 0;

    const effective = Math.max(0, bubbles + additional - spend);
    return levelFromAvailableBubbles(effective);
}

function calculateTierFromLevel(level) {
    if (level >= 17) return 'ET';
    if (level >= 11) return 'HT';
    if (level >= 5) return 'LT';
    return 'BT';
}

module.exports = {
    additionalBubblesForStartTier,
    calculateLevel,
    calculateTierFromLevel,
    countsBubbleAdjustmentsForProgression,
};
