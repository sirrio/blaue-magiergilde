const test = require('node:test');
const assert = require('node:assert/strict');

const { buildShopPostRows } = require('../shopPoster');

test('renders heading and item rows in the stored roll rule order', () => {
    const postRows = buildShopPostRows(
        [
            { id: 10, row_kind: 'heading', heading_title: 'Common' },
            { id: 20, row_kind: 'rule', heading_title: '' },
            { id: 30, row_kind: 'heading', heading_title: 'Rare' },
            { id: 40, row_kind: 'rule', heading_title: '' },
        ],
        [
            { shop_item_id: 101, roll_rule_id: 20, name: 'Common blade' },
            { shop_item_id: 102, roll_rule_id: 40, name: 'Rare wand' },
        ],
    );

    assert.deepEqual(postRows.map((row) => row.type === 'heading' ? `heading:${row.title}` : `item:${row.row.name}`), [
        'heading:Common',
        'item:Common blade',
        'heading:Rare',
        'item:Rare wand',
    ]);
});

test('does not invent rows for shop items without a matching rule row', () => {
    const postRows = buildShopPostRows(
        [
            { id: 10, row_kind: 'heading', heading_title: 'Common' },
            { id: 20, row_kind: 'rule', heading_title: '' },
        ],
        [
            { shop_item_id: 101, roll_rule_id: 999, name: 'Orphaned line' },
        ],
    );

    assert.deepEqual(postRows.map((row) => row.type === 'heading' ? row.title : row.row.name), [
        'Common',
    ]);
});
