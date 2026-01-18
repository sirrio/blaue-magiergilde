const assert = require('node:assert/strict');
const { calculateLevel, calculateTierFromLevel } = require('../utils/characterTier');

const level = calculateLevel({
    start_tier: 'bt',
    adventure_bubbles: 10,
    dm_bubbles: 0,
    bubble_shop_spend: 0,
    is_filler: 0,
});

assert.equal(level, 5);
assert.equal(calculateTierFromLevel(level), 'LT');

const simplifiedLevel = calculateLevel({
    start_tier: 'bt',
    adventure_bubbles: 10,
    dm_bubbles: 0,
    bubble_shop_spend: 0,
    is_filler: 0,
    simplified_tracking: true,
    manual_level: 12,
});

assert.equal(simplifiedLevel, 5);
assert.equal(calculateTierFromLevel(simplifiedLevel), 'LT');

console.log('character-tier.test.js passed');
