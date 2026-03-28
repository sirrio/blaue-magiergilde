const assert = require('node:assert/strict');
const command = require('../commands/auction/hiddenbid');
const {
    buildDashboardEmbeds,
    buildSelectedItemEmbed,
    getPickerPageMeta,
    buildRefreshCustomId,
    buildPageNavCustomId,
    buildPageStatusCustomId,
    sortItemsLikeAuctionPage,
} = require('../interactions/hiddenBid');

const embeds = buildDashboardEmbeds({
    locale: 'de',
    ownConfiguredCount: 1,
    items: [
        {
            auction_item_id: 17,
            item_name: 'Adder Stone',
            item_rarity: 'rare',
            item_type: 'consumable',
            auction_currency: 'GP',
            min_bid: 500,
            step: 50,
            highest_bid: 650,
            user_hidden_max: 900,
            auction_created_at: '2026-03-02 12:00:00',
            notes: '',
        },
    ],
});

assert.equal(Array.isArray(embeds), true);
assert.equal(embeds.length, 1);
assert.equal(embeds[0].data.title, 'Hidden-Bid-Dashboard');
assert.equal(embeds[0].data.description.includes('Wähle ein offenes Auktionsitem'), true);
assert.equal(embeds[0].data.description.includes('Deine Hidden Bids: **1**'), true);

const pageMeta = getPickerPageMeta(
    Array.from({ length: 30 }, (_, index) => ({ auction_item_id: index + 1 })),
    2,
);

assert.equal(pageMeta.currentPage, 2);
assert.equal(pageMeta.totalPages, 2);
assert.equal(pageMeta.from, 26);
assert.equal(pageMeta.to, 30);
assert.equal(pageMeta.visibleItems.length, 5);

const pagedEmbeds = buildDashboardEmbeds({
    locale: 'de',
    ownConfiguredCount: 0,
    items: Array.from({ length: 30 }, (_, index) => ({
        auction_item_id: index + 1,
        item_name: `Item ${index + 1}`,
        item_rarity: 'common',
        item_type: 'item',
        auction_currency: 'GP',
        min_bid: 100,
        step: 25,
        highest_bid: 0,
        user_hidden_max: null,
        auction_created_at: '2026-03-02 12:00:00',
        notes: '',
    })),
    pageMeta,
});

assert.equal(pagedEmbeds[0].data.description.includes('Zeige **26-30** von **30** Items. Seite **2/2**.'), true);
assert.notEqual(
    buildRefreshCustomId('137565166001848320', 0, 1),
    buildPageNavCustomId('137565166001848320', 0, 1),
);
assert.notEqual(
    buildRefreshCustomId('137565166001848320', 0, 1),
    buildPageStatusCustomId('137565166001848320', 1),
);

const sortedItems = sortItemsLikeAuctionPage([
    {
        auction_item_id: 4,
        auction_created_at: '2026-03-02 12:00:00',
        item_name: 'Zulu Wand',
        item_rarity: 'rare',
        item_type: 'item',
    },
    {
        auction_item_id: 2,
        auction_created_at: '2026-03-02 12:00:00',
        item_name: 'Alpha Blade',
        item_rarity: 'rare',
        item_type: 'weapon',
    },
    {
        auction_item_id: 3,
        auction_created_at: '2026-03-02 12:00:00',
        item_name: 'Beta Shield',
        item_rarity: 'rare',
        item_type: 'armor',
    },
    {
        auction_item_id: 1,
        auction_created_at: '2026-03-01 12:00:00',
        item_name: 'Older Common Item',
        item_rarity: 'common',
        item_type: 'item',
    },
]);

assert.deepEqual(sortedItems.map(item => item.auction_item_id), [2, 3, 4, 1]);

const selectedEmbed = buildSelectedItemEmbed({
    auction_item_id: 17,
    item_name: 'Adder Stone',
    item_rarity: 'rare',
    item_type: 'consumable',
    auction_currency: 'GP',
    min_bid: 500,
    step: 50,
    highest_bid: 650,
    user_hidden_max: 900,
    notes: '',
}, 'de');

assert.equal(selectedEmbed.data.title, 'Ausgewähltes Item');
assert.equal(selectedEmbed.data.description.includes('Höchstes sichtbares Gebot: 650 GP'), true);
assert.equal(selectedEmbed.data.description.includes('Dein Hidden Bid: **900 GP**'), true);

assert.equal(command.data.description, 'Setze dein verborgenes Maximalgebot für Auktionsitems.');

console.log('hiddenbid-ui.test.js passed');
