const assert = require('node:assert/strict');
const { calculateLevel, calculateTierFromLevel } = require('../utils/characterTier');

const level = calculateLevel({
    start_tier: 'bt',
    adventure_bubbles: 10,
    dm_bubbles: 0,
    bubble_shop_spend: 0,
    bubble_shop_total_spend: 2,
    is_filler: 0,
});

assert.equal(level, 4);
assert.equal(calculateTierFromLevel(level), 'BT');

console.log('character-tier.test.js passed');
