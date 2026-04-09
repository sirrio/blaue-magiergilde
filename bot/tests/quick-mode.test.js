const assert = require('node:assert/strict');
const { setLevelProgressionTotals } = require('../utils/levelProgression');
const {
    calculateMinAllowedLevel,
    calculateRequiredAdventureBubbles,
} = require('../utils/quickMode');

setLevelProgressionTotals({
    1: 0, 2: 1, 3: 3, 4: 6, 5: 10,
    6: 15, 7: 21, 8: 28, 9: 36, 10: 45,
    11: 55, 12: 66, 13: 78, 14: 91, 15: 105,
    16: 120, 17: 136, 18: 153, 19: 171, 20: 190,
});

const minAllowed = calculateMinAllowedLevel({
    immutableAdventureBubbles: 15,
    dmBubbles: 0,
    additionalBubbles: 0,
    bubbleSpend: 0,
});

assert.equal(minAllowed, 6);

const required = calculateRequiredAdventureBubbles({
    level: 6,
    dmBubbles: 0,
    additionalBubbles: 0,
    bubbleSpend: 0,
});

assert.equal(required, 15);

const requirement = calculateRequiredAdventureBubbles({
    level: 12,
    dmBubbles: 0,
    additionalBubbles: 0,
    bubbleSpend: 0,
});

assert.equal(requirement, 66);

console.log('quick-mode.test.js passed');
