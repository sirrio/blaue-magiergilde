function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

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

function calculateLevel(character) {
    const isFiller = Boolean(character.is_filler);
    if (isFiller) return 3;

    const bubbles = safeInt(character.adventure_bubbles) + safeInt(character.dm_bubbles);
    const additional = additionalBubblesForStartTier(character.start_tier);
    const spend = safeInt(character.bubble_shop_total_spend ?? character.bubble_shop_spend);

    const effective = Math.max(0, bubbles + additional - spend);
    const level = Math.floor(1 + (Math.sqrt(8 * effective + 1) - 1) / 2);
    return Math.min(20, Math.max(1, level));
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
};
