const assert = require('node:assert/strict');
const command = require('../commands/auction/hiddenbid');
const { buildDashboardEmbeds, buildSelectedItemEmbed } = require('../interactions/hiddenBid');

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
