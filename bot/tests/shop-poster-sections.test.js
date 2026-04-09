const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveSectionMeta } = require('../shopPoster');

test('uses explicit section title and sort order when present', () => {
    const section = resolveSectionMeta({
        rarity: 'common',
        type: 'item',
        roll_section_title: 'Common WotC Gear',
        roll_sort_order: 15,
    });

    assert.deepEqual(section, {
        title: 'Common WotC Gear',
        sortOrder: 15,
    });
});

test('falls back to legacy section titles for old shop lines', () => {
    const section = resolveSectionMeta({
        rarity: 'common',
        type: 'spellscroll',
    });

    assert.deepEqual(section, {
        title: 'Common Spell Scroll',
        sortOrder: 30,
    });
});
