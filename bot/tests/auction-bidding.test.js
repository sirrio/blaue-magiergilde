const assert = require('node:assert/strict');
const {
    getBidStepForItem,
    getStartingBidFromRepair,
    getMinimumBid,
} = require('../utils/auctionBidding');

assert.equal(getBidStepForItem({ rarity: 'common', type: 'item' }), 10);
assert.equal(getBidStepForItem({ rarity: 'uncommon', type: 'item' }), 50);
assert.equal(getBidStepForItem({ rarity: 'rare', type: 'item' }), 100);
assert.equal(getBidStepForItem({ rarity: 'very_rare', type: 'item' }), 500);
assert.equal(getBidStepForItem({ rarity: 'rare', type: 'consumable' }), 50);
assert.equal(getBidStepForItem({ rarity: 'very_rare', type: 'spellscroll' }), 250);

assert.equal(getStartingBidFromRepair({ repairCurrent: 0, step: 50 }), 0);
assert.equal(getStartingBidFromRepair({ repairCurrent: 999, step: 50 }), 500);
assert.equal(getStartingBidFromRepair({ repairCurrent: 1001, step: 50 }), 550);

assert.equal(getMinimumBid({ startingBid: 500, highestBid: 0, step: 50 }), 500);
assert.equal(getMinimumBid({ startingBid: 500, highestBid: 650, step: 50 }), 700);
assert.equal(getMinimumBid({ startingBid: 500, highestBid: 300, step: 50 }), 500);

console.log('auction-bidding.test.js passed');
