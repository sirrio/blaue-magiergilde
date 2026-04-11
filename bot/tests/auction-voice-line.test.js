const assert = require('node:assert/strict');

const db = require('../db');
const { fetchAuctionItemInfo, formatAuctionVoiceLine } = require('../auctionVoiceBidPoster');

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

(async () => {
    const originalExecute = db.execute;
    let capturedSql = '';

    try {
        db.execute = async (sql) => {
            capturedSql = sql;
            return [[{
                id: 42,
                notes: 'Old snapshot note',
                currency: 'GP',
                name: 'Historic Auction Snapshot',
                sold_bidder_discord_id: '123456789',
                sold_bidder_name: 'sirrio',
                sold_amount: 50,
            }]];
        };

        const info = await fetchAuctionItemInfo(42);

        assert.equal(info.name, 'Historic Auction Snapshot');
        assert.equal(capturedSql.includes('ai.item_name AS name'), true);
        assert.equal(capturedSql.includes('INNER JOIN items i ON i.id = ai.item_id'), false);

        console.log('auction-voice-line.test.js passed');
    } finally {
        db.execute = originalExecute;
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
