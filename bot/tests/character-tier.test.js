const assert = require('node:assert/strict');
const { setLevelProgressionTotals } = require('../utils/levelProgression');
const { calculateLevel, calculateRawLevel, calculateTierFromLevel } = require('../utils/characterTier');

setLevelProgressionTotals({
    1: 0, 2: 1, 3: 3, 4: 6, 5: 10,
    6: 15, 7: 21, 8: 28, 9: 36, 10: 45,
    11: 55, 12: 66, 13: 78, 14: 91, 15: 105,
    16: 120, 17: 136, 18: 153, 19: 171, 20: 190,
});

const level = calculateLevel({
    is_filler: 0,
    progression_state: { level: 5 },
});

assert.equal(level, 5);
assert.equal(calculateTierFromLevel(level), 'LT');

assert.equal(calculateLevel({
    is_filler: 0,
    progression_state: { level: 10 },
}), 10);

assert.equal(calculateLevel({
    is_filler: 0,
    progression_state: { level: 11 },
}), 11);

assert.throws(() => calculateLevel({
    start_tier: 'bt',
    adventure_bubbles: 6,
    simplified_tracking: 1,
    is_filler: 0,
    progression_state: { has_level_anchor: false },
}), /Missing character progression snapshot value: level/);

assert.equal(calculateRawLevel({
    is_filler: 0,
    progression_version_id: 1,
    progression_state: { tracked_available_bubbles: 6 },
}), 4);

console.log('character-tier.test.js passed');
