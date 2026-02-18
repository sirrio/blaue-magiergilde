const assert = require('node:assert/strict');

const { formatAuctionVoiceLine } = require('../auctionVoiceBidPoster');

const highestLine = formatAuctionVoiceLine({
    itemLabel: 'Brawler\'s Ring',
    currency: 'GP',
    bidderDiscordId: '123456789',
    bidderName: 'sirrio',
    amount: 50,
    sold: false,
});

assert.equal(
    highestLine,
    '🏆 Highest bid for **Brawler\'s Ring**: <@123456789> (sirrio) - 50 GP',
);

const soldLine = formatAuctionVoiceLine({
    itemLabel: 'Brawler\'s Ring',
    currency: 'GP',
    bidderDiscordId: '123456789',
    bidderName: 'sirrio',
    amount: 50,
    sold: true,
});

assert.equal(
    soldLine,
    '✅ Sold **Brawler\'s Ring**: <@123456789> (sirrio) - 50 GP',
);

const soldLineWithoutAmount = formatAuctionVoiceLine({
    itemLabel: 'Brawler\'s Ring',
    currency: 'GP',
    bidderDiscordId: '',
    bidderName: 'sirrio',
    amount: 0,
    sold: true,
});

assert.equal(
    soldLineWithoutAmount,
    '✅ Sold **Brawler\'s Ring**: sirrio',
);

console.log('auction-voice-line.test.js passed');
