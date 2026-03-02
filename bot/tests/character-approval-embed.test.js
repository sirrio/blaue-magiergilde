const assert = require('node:assert/strict');
const { buildCharacterApprovalMessage } = require('../characterApprovalNotifier');

const payload = {
    character_status: 'pending',
    character_name: 'Test Character',
    character_tier: 'bt',
    character_version: '2024',
    character_faction: 'none',
    character_classes: ['Wizard'],
    character_is_filler: false,
    character_dm_bubbles: 0,
    character_dm_coins: 0,
    character_shop_spend: 0,
    character_registration_note: 'Please review this with custom homebrew note.',
    character_review_note: 'Please provide a proper DnDBeyond link before approval.',
    character_avatar_url: 'https://example.test/avatars/character.png',
    user_name: 'User',
    user_discord_id: '123456789012345678',
    character_id: 12,
};

const message = buildCharacterApprovalMessage(payload, {
    avatarUrlOverride: 'attachment://character-avatar.png',
});

const embedData = message.embeds[0].toJSON();
assert.equal(embedData.title, 'PENDING · [BT] Test Character');
assert.equal(embedData.thumbnail?.url, 'attachment://character-avatar.png');

const factionField = embedData.fields.find((field) => field.name === 'Faction');
assert.equal(factionField, undefined);

const dmField = embedData.fields.find((field) => field.name === 'DM');
assert.equal(dmField?.value, '0 bubbles · 0 coins');

const userField = embedData.fields.find((field) => field.name === 'User');
assert.ok(userField?.value.includes('<@123456789012345678>'));

const registrationField = embedData.fields.find((field) => field.name === 'Registration notes');
assert.equal(registrationField?.value, 'Please review this with custom homebrew note.');

const reviewField = embedData.fields.find((field) => field.name === 'Review note');
assert.equal(reviewField?.value, 'Please provide a proper DnDBeyond link before approval.');

const buttonLabels = message.components[0].toJSON().components.map((component) => component.label);
assert.deepEqual(buttonLabels, ['Approve', 'Request changes', 'Decline', 'Set pending']);
assert.equal(message.components[0].toJSON().components[3].disabled, true);

const approvedMessage = buildCharacterApprovalMessage({
    ...payload,
    character_status: 'approved',
});
assert.equal(approvedMessage.components[0].toJSON().components[3].disabled, false);

console.log('character-approval-embed.test.js passed');
