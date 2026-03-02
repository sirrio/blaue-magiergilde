const assert = require('node:assert/strict');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { buildCharacterApprovalMessage } = require('../characterApprovalNotifier');
const { handle } = require('../interactions/characterApproval');

async function testApproveUsesInlineConfirm() {
    const message = buildCharacterApprovalMessage({
        character_status: 'pending',
        character_name: 'Test Character',
        character_tier: 'bt',
        character_version: '2024',
        character_classes: ['Wizard'],
        user_name: 'User',
        user_discord_id: '123456789012345678',
        character_id: 12,
        approval_url: 'https://blaue-magiergilde.test/admin/character-approvals',
        external_link: 'https://www.dndbeyond.com/characters/12',
    });

    let updatePayload = null;

    const interaction = {
        customId: 'character-approval:approve:12',
        message: {
            embeds: message.embeds.map((embed) => embed.toJSON()),
            components: message.components,
        },
        isButton: () => true,
        isModalSubmit: () => false,
        update: async (payload) => {
            updatePayload = payload;
        },
    };

    const handled = await handle(interaction);

    assert.equal(handled, true);
    assert.ok(updatePayload);
    assert.equal(updatePayload.components.length, 2);

    const labels = updatePayload.components[0].components.map((component) => component.label);
    assert.deepEqual(labels, ['Genehmigen bestätigen', 'Abbrechen']);
    assert.equal(updatePayload.components[1].components[0].label, 'Freigaben öffnen');
}

async function testCancelRestoresOriginalActions() {
    const originalMessage = buildCharacterApprovalMessage({
        character_status: 'approved',
        character_name: 'Approved Character',
        character_tier: 'bt',
        character_version: '2024',
        character_classes: ['Wizard'],
        user_name: 'User',
        user_discord_id: '123456789012345678',
        character_id: 12,
        approval_url: 'https://blaue-magiergilde.test/admin/character-approvals',
        external_link: 'https://www.dndbeyond.com/characters/12',
    });

    const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('character-approval-confirm:pending:12:approved')
            .setLabel('Pending bestätigen')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('character-approval-cancel:pending:12:approved')
            .setLabel('Abbrechen')
            .setStyle(ButtonStyle.Secondary),
    );

    let updatePayload = null;

    const interaction = {
        customId: 'character-approval-cancel:pending:12:approved',
        message: {
            embeds: originalMessage.embeds.map((embed) => embed.toJSON()),
            components: [confirmRow, ...originalMessage.components.slice(1)],
        },
        isButton: () => true,
        isModalSubmit: () => false,
        update: async (payload) => {
            updatePayload = payload;
        },
    };

    const handled = await handle(interaction);

    assert.equal(handled, true);
    assert.ok(updatePayload);
    assert.equal(updatePayload.components.length, 2);

    const labels = updatePayload.components[0].components.map((component) => component.label);
    assert.deepEqual(labels, ['Genehmigen', 'Änderungen anfordern', 'Ablehnen', 'Auf Pending setzen']);
    assert.equal(updatePayload.components[0].components[3].disabled, false);
}

Promise.resolve()
    .then(testApproveUsesInlineConfirm)
    .then(testCancelRestoresOriginalActions)
    .then(() => {
        console.log('character-approval-inline-confirm.test.js passed');
    });
