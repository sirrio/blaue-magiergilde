const assert = require('node:assert/strict');
const { buildCharacterApprovalMessage, buildNewAccountMessage } = require('../characterApprovalNotifier');

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
    is_first_submission: true,
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

const userField = embedData.fields.find((field) => field.name === 'Nutzer');
assert.ok(userField?.value.includes('<@123456789012345678>'));

const firstSubmissionField = embedData.fields.find((field) => field.name === 'Erstanmeldung');
assert.equal(firstSubmissionField?.value, 'Ja');

const registrationField = embedData.fields.find((field) => field.name === 'Registrierungsnotizen');
assert.equal(registrationField?.value, 'Please review this with custom homebrew note.');

const reviewField = embedData.fields.find((field) => field.name === 'Review-Notiz');
assert.equal(reviewField?.value, 'Please provide a proper DnDBeyond link before approval.');

const buttonLabels = message.components[0].toJSON().components.map((component) => component.label);
assert.deepEqual(buttonLabels, ['Genehmigen', 'Änderungen anfordern', 'Ablehnen', 'Auf Pending setzen']);
assert.equal(message.components[0].toJSON().components[3].disabled, true);

const approvedMessage = buildCharacterApprovalMessage({
    ...payload,
    character_status: 'approved',
});
assert.equal(approvedMessage.components[0].toJSON().components[3].disabled, false);

const newAccountMessage = buildNewAccountMessage({
    user_id: 5,
    user_name: 'Test User',
    user_discord_id: '123456789012345678',
    user_discord_username: 'testuser',
    user_discord_display_name: 'Test Display',
    source: 'discord',
    approval_url: 'https://blaue-magiergilde.test/admin/character-approvals',
});

const newAccountEmbed = newAccountMessage.embeds[0].toJSON();
assert.equal(newAccountEmbed.title, 'Neuer Account');
assert.equal(newAccountEmbed.description, 'Ein neuer App-Account wurde erstellt.');

const sourceField = newAccountEmbed.fields.find((field) => field.name === 'Quelle');
assert.equal(sourceField?.value, 'Discord');

const statusField = newAccountEmbed.fields.find((field) => field.name === 'Charakterstatus');
assert.equal(statusField?.value, 'Noch kein Charakter eingereicht');

const newAccountButton = newAccountMessage.components[0].toJSON().components[0];
assert.equal(newAccountButton.label, 'Freigaben öffnen');
assert.equal(newAccountButton.url, 'https://blaue-magiergilde.test/admin/character-approvals');

console.log('character-approval-embed.test.js passed');
