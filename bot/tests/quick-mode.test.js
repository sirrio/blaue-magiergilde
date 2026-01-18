const assert = require('node:assert/strict');
const {
    calculateMinAllowedLevel,
    calculateRequiredAdventureBubbles,
} = require('../utils/quickMode');

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

console.log('quick-mode.test.js passed');
