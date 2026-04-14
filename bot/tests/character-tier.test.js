const assert = require('node:assert/strict');
const { setLevelProgressionTotals } = require('../utils/levelProgression');
const { calculateLevel, calculateTierFromLevel } = require('../utils/characterTier');

setLevelProgressionTotals({
    1: 0, 2: 1, 3: 3, 4: 6, 5: 10,
    6: 15, 7: 21, 8: 28, 9: 36, 10: 45,
    11: 55, 12: 66, 13: 78, 14: 91, 15: 105,
    16: 120, 17: 136, 18: 153, 19: 171, 20: 190,
});

const level = calculateLevel({
    start_tier: 'bt',
    adventure_bubbles: 10,
    dm_bubbles: 0,
    bubble_shop_spend: 0,
    is_filler: 0,
});

assert.equal(level, 5);
assert.equal(calculateTierFromLevel(level), 'LT');

assert.equal(calculateLevel({
    start_tier: 'bt',
    adventure_bubbles: 54,
    dm_bubbles: 0,
    bubble_shop_spend: 0,
    is_filler: 0,
}), 10);

assert.equal(calculateLevel({
    start_tier: 'bt',
    adventure_bubbles: 55,
    dm_bubbles: 0,
    bubble_shop_spend: 0,
    is_filler: 0,
}), 11);

assert.equal(calculateLevel({
    start_tier: 'bt',
    adventure_bubbles: 6,
    dm_bubbles: 5,
    bubble_shop_spend: 4,
    simplified_tracking: 1,
    has_pseudo_adventure: 0,
    is_filler: 0,
}), 4);

assert.equal(calculateLevel({
    start_tier: 'bt',
    adventure_bubbles: 6,
    dm_bubbles: 5,
    bubble_shop_spend: 4,
    simplified_tracking: 0,
    has_pseudo_adventure: 1,
    is_filler: 0,
}), 4);

console.log('character-tier.test.js passed');
