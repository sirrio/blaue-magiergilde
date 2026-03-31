const assert = require('node:assert/strict');
const command = require('../commands/game/draw');
const {
    parseEmojiInput,
    reactionMatchesInput,
    drawParticipants,
    resolveReactionDisplay,
    buildPublicMentionContent,
    buildPublicResultEmbed,
    buildPreviewEmbed,
    resolveReactionTarget,
    buildPreviewComponents,
    buildFixedCustomId,
    buildConfirmCustomId,
    buildRerollCustomId,
    buildCancelCustomId,
    parseActionCustomId,
    parseFixedCustomId,
} = require('../interactions/reactionDraw');

async function run() {
    const unicodeEmoji = parseEmojiInput('✅');
    assert.equal(unicodeEmoji.name, '✅');
    assert.equal(unicodeEmoji.id, null);

    const customEmoji = parseEmojiInput('<:signup:1234567890>');
    assert.equal(customEmoji.name, 'signup');
    assert.equal(customEmoji.id, '1234567890');

    const shortcodeEmoji = parseEmojiInput(':MG_LT:');
    assert.equal(shortcodeEmoji.name, 'MG_LT');
    assert.equal(shortcodeEmoji.id, null);

    assert.equal(reactionMatchesInput({
        emoji: {
            id: null,
            name: '✅',
            toString: () => '✅',
        },
    }, unicodeEmoji), true);

    assert.equal(reactionMatchesInput({
        emoji: {
            id: '1234567890',
            name: 'signup',
            toString: () => '<:signup:1234567890>',
        },
    }, customEmoji), true);

    assert.equal(reactionMatchesInput({
        emoji: {
            id: '987654321',
            name: 'mg_lt',
            toString: () => '<:mg_lt:987654321>',
        },
    }, shortcodeEmoji), true);

    const laterMessageReaction = {
        emoji: {
            id: '987654321',
            name: 'mg_lt',
            toString: () => '<:mg_lt:987654321>',
        },
    };
    const unrelatedReaction = {
        emoji: {
            id: null,
            name: 'other',
            toString: () => '<:other:111>',
        },
    };
    const thread = {
        id: 'thread-1',
        fetchStarterMessage: async () => ({
            id: 'starter',
            url: 'https://discord.com/channels/1/2/starter',
            content: 'starter',
            reactions: { cache: [] },
        }),
        parent: {
            messages: {
                fetch: async () => ({
                    id: 'parent-root',
                    url: 'https://discord.com/channels/1/2/parent-root',
                    content: 'parent root',
                    reactions: { cache: [laterMessageReaction] },
                }),
            },
        },
        messages: {
            fetch: async () => new Map([
                ['later', {
                    id: 'later',
                    url: 'https://discord.com/channels/1/2/later',
                    content: 'signup post',
                    reactions: { cache: [unrelatedReaction] },
                }],
            ]),
        },
    };

    thread.parent.messages.fetch = async () => ({
        id: 'parent-root',
        url: 'https://discord.com/channels/1/2/parent-root',
        content: 'parent root',
        author: { id: '42' },
        reactions: { cache: [laterMessageReaction] },
    });
    thread.fetchStarterMessage = async () => ({
        id: 'starter',
        url: 'https://discord.com/channels/1/2/starter',
        content: 'starter',
        author: { id: '999' },
        reactions: { cache: [] },
    });
    thread.messages.fetch = async () => new Map([
        ['later', {
            id: 'later',
            url: 'https://discord.com/channels/1/2/later',
            content: 'signup post',
            author: { id: '999' },
            reactions: { cache: [laterMessageReaction] },
        }],
    ]);

    const target = await resolveReactionTarget(thread, shortcodeEmoji, '42');
    assert.equal(target.kind, 'ok');
    assert.equal(target.message.id, 'parent-root');
    assert.equal(await resolveReactionDisplay(target.reaction, shortcodeEmoji), '<:mg_lt:987654321>');
    assert.equal(await resolveReactionDisplay({
        emoji: {
            id: null,
            name: 'MG_LT',
            identifier: 'MG_LT:987654321',
            toString: () => ':MG_LT:',
        },
    }, shortcodeEmoji), '<:MG_LT:987654321>');
    assert.equal(await resolveReactionDisplay({
        emoji: {
            id: null,
            name: 'MG_LT',
            toString: () => ':MG_LT:',
        },
    }, shortcodeEmoji, {
        emojis: {
            fetch: async () => ({
                find: (predicate) => {
                    const emoji = {
                        name: 'MG_LT',
                        toString: () => '<:MG_LT:123123123>',
                    };
                    return predicate(emoji) ? emoji : null;
                },
            }),
        },
    }), '<:MG_LT:123123123>');
    assert.equal(await resolveReactionDisplay({
        emoji: {
            id: null,
            name: 'C_Wizard_24',
            toString: () => ':C_Wizard_24:',
        },
    }, null), '[C_Wizard_24]');
    assert.equal(await resolveReactionDisplay({
        emoji: {
            id: '977141248970342400',
            name: 'n_19',
            identifier: 'n_19:977141248970342400',
            toString: () => '<:n_19:977141248970342400>',
        },
    }, null, null, null, { preferCustomNameFallback: true }), '[n_19]');
    assert.equal(await resolveReactionDisplay({
        emoji: {
            id: null,
            name: 'C_Wizard_24',
            toString: () => ':C_Wizard_24:',
        },
    }, null, {
        emojis: {
            fetch: async () => ({
                find: (predicate) => {
                    const emoji = {
                        name: 'C_Wizard_24',
                        toString: () => '<:C_Wizard_24:777777777>',
                    };
                    return predicate(emoji) ? emoji : null;
                },
            }),
        },
    }), '<:C_Wizard_24:777777777>');
    assert.equal(await resolveReactionDisplay({
        emoji: {
            id: null,
            name: '',
            identifier: '%F0%9F%94%9F',
            toString: () => '',
        },
    }, null), '🔟');
    assert.equal(await resolveReactionDisplay({
        emoji: {
            id: null,
            name: '',
            identifier: '%F0%9F%8F%B9',
            toString: () => '',
        },
    }, null), '🏹');
    assert.equal(await resolveReactionDisplay({
        emoji: {
            id: null,
            name: '',
            identifier: '%F0%9F%AA%93',
            toString: () => '',
        },
    }, null), '🪓');
    assert.equal(await resolveReactionDisplay({
        emoji: {
            id: null,
            name: '',
            identifier: '%F0%9F%A4%9D',
            toString: () => '',
        },
    }, null), '🤝');

    const drawn = drawParticipants(
        [
            { id: '1', label: 'A' },
            { id: '2', label: 'B' },
            { id: '3', label: 'C' },
            { id: '4', label: 'D' },
        ],
        2,
    );

    assert.equal(drawn.winners.length, 2);
    assert.equal(new Set([...drawn.winners].map(user => user.id)).size, 2);

    const previewEmbed = buildPreviewEmbed({
        id: 'abc',
        ownerId: '137565166001848320',
        locale: 'de',
        createdAt: Date.now(),
        threadId: '123',
        messageId: '456',
        messageUrl: 'https://discord.com/channels/1/2/3',
        emoji: unicodeEmoji,
        reactionDisplay: '✅',
        requestedWinnerCount: 2,
        participants: [
            { id: '1', label: 'Alpha', reactionDisplays: ['🔟', '7️⃣', '<:rank10blue:10>', '<:one:1>', '<:keycap_ten:10>', '<:n_12:12>', '<:C_Wizard_24:2>', '<:mg_bt:1>', '✅'] },
            { id: '2', label: 'Beta', reactionDisplays: [] },
            { id: '3', label: 'Gamma' },
        ],
        winners: [
            { id: '1', label: 'Alpha' },
            { id: '2', label: 'Beta' },
        ],
    });

    assert.equal(previewEmbed.data.title, 'Auswahl prüfen');
    assert.equal(previewEmbed.data.fields[0].value.includes('Alpha 🔟 7️⃣ <:rank10blue:10> <:one:1> <:keycap_ten:10> <:n_12:12> <:C_Wizard_24:2> <:mg_bt:1> ✅'), true);
    assert.equal(previewEmbed.data.description.includes('Anmeldungen: **3**'), true);
    assert.equal(previewEmbed.data.fields[0].name, 'Anmeldeliste');
    assert.equal(previewEmbed.data.fields[1].name, 'Aktuell ausgewählt');
    assert.equal(previewEmbed.data.fields.length, 2);

    const previewWithFixedEmbed = buildPreviewEmbed({
        id: 'abc',
        ownerId: '137565166001848320',
        locale: 'de',
        createdAt: Date.now(),
        threadId: '123',
        messageId: '456',
        messageUrl: 'https://discord.com/channels/1/2/3',
        reactionDisplay: '✅',
        requestedWinnerCount: 3,
        participants: [
            { id: '1', label: 'Alpha' },
            { id: '2', label: 'Beta' },
            { id: '3', label: 'Gamma' },
        ],
        fixedParticipantIds: ['1'],
        fixedParticipants: [
            { id: '1', label: 'Alpha', reactionDisplays: ['🔟', '7️⃣', '✊', '🏹', '🪓'] },
        ],
        drawnParticipants: [
            { id: '2', label: 'Beta', reactionDisplays: ['7️⃣', '🤝', '❤️'] },
            { id: '3', label: 'Gamma', reactionDisplays: ['✊'] },
        ],
        winners: [
            { id: '1', label: 'Alpha', reactionDisplays: ['🔟', '7️⃣', '✊', '🏹', '🪓'] },
            { id: '2', label: 'Beta', reactionDisplays: ['7️⃣', '🤝', '❤️'] },
            { id: '3', label: 'Gamma', reactionDisplays: ['✊'] },
        ],
    });

    assert.equal(previewWithFixedEmbed.data.fields[0].name, 'Anmeldeliste');
    assert.equal(previewWithFixedEmbed.data.fields[1].name, 'Fest gesetzt');
    assert.equal(previewWithFixedEmbed.data.fields[2].name, 'Zufällig gewählt');
    assert.equal(previewWithFixedEmbed.data.fields[1].value.includes('<@1> · 🔟7️⃣✊🏹 +1'), true);
    assert.equal(previewWithFixedEmbed.data.fields[2].value.includes('<@2> · 7️⃣🤝❤️'), true);
    assert.equal(previewWithFixedEmbed.data.fields.length, 3);

    const previewWithOnlyFixedEmbed = buildPreviewEmbed({
        id: 'abc',
        ownerId: '137565166001848320',
        locale: 'de',
        createdAt: Date.now(),
        threadId: '123',
        messageId: '456',
        messageUrl: 'https://discord.com/channels/1/2/3',
        reactionDisplay: '✅',
        requestedWinnerCount: 2,
        participants: [
            { id: '1', label: 'Alpha' },
            { id: '2', label: 'Beta' },
            { id: '3', label: 'Gamma' },
        ],
        fixedParticipantIds: ['1', '2'],
        fixedParticipants: [
            { id: '1', label: 'Alpha', reactionDisplays: ['🔟', '7️⃣', '✊', '🏹', '🪓'] },
            { id: '2', label: 'Beta', reactionDisplays: ['7️⃣'] },
        ],
        drawnParticipants: [],
        winners: [
            { id: '1', label: 'Alpha', reactionDisplays: ['🔟', '7️⃣', '✊', '🏹', '🪓'] },
            { id: '2', label: 'Beta', reactionDisplays: ['7️⃣'] },
        ],
    });

    assert.equal(previewWithOnlyFixedEmbed.data.fields[0].name, 'Anmeldeliste');
    assert.equal(previewWithOnlyFixedEmbed.data.fields[1].name, 'Fest gesetzt');
    assert.equal(previewWithOnlyFixedEmbed.data.fields[1].value.includes('<@1> · 🔟7️⃣✊🏹 +1'), true);
    assert.equal(previewWithOnlyFixedEmbed.data.fields.length, 2);

    const previewComponents = buildPreviewComponents({
        id: 'abc',
        ownerId: '137565166001848320',
        locale: 'de',
        requestedWinnerCount: 3,
        participants: [
            { id: '1', label: 'Alpha' },
            { id: '2', label: 'Beta' },
            { id: '3', label: 'Gamma' },
        ],
        fixedParticipantIds: ['2'],
    });

    assert.equal(previewComponents.length, 2);
    assert.equal(previewComponents[1].components[0].data.custom_id, buildFixedCustomId('abc', '137565166001848320'));

    assert.equal(buildPublicMentionContent(previewEmbed.data.fields ? [
        { id: '1' },
        { id: '2' },
    ] : []), '<@1> <@2>');

    const publicEmbed = buildPublicResultEmbed({
        ownerId: '137565166001848320',
        locale: 'de',
        reactionDisplay: '<:mg_lt:987654321>',
        participants: [
            { id: '1', label: 'Alpha' },
            { id: '2', label: 'Beta' },
            { id: '3', label: 'Gamma' },
        ],
        winners: [
            { id: '1', label: 'Alpha', reactionDisplays: ['7️⃣', '🤝', '❤️'] },
            { id: '2', label: 'Beta', reactionDisplays: ['✊'] },
        ],
        fixedParticipants: [
            { id: '3', label: 'Gamma', reactionDisplays: ['🔟', '7️⃣', '✊', '🏹', '🪓'] },
        ],
        drawnParticipants: [
            { id: '1', label: 'Alpha', reactionDisplays: ['7️⃣', '🤝', '❤️'] },
            { id: '2', label: 'Beta', reactionDisplays: ['✊'] },
        ],
    });

    assert.equal(publicEmbed.data.title, 'Die Spieler wurden ausgewählt');
    assert.equal(publicEmbed.data.description.includes('Reaktion: <:mg_lt:987654321>'), true);
    assert.equal(publicEmbed.data.description.includes('Anmeldungen: **3**'), true);
    assert.equal(publicEmbed.data.description.toLowerCase().includes('ins abenteuer kommen mit'), true);
    assert.equal(publicEmbed.data.fields[0].name, 'Fest gesetzt');
    assert.equal(publicEmbed.data.fields[1].name, 'Zufällig gewählt');
    assert.equal(publicEmbed.data.fields[0].value.includes('<@3> · 🔟7️⃣✊🏹 +1'), true);
    assert.equal(publicEmbed.data.fields[1].value.includes('<@1> · 7️⃣🤝❤️'), true);
    assert.equal(publicEmbed.data.fields[2].name, 'Charakterbögen');
    assert.equal(publicEmbed.data.fields[2].value.includes('Bitte schickt eure Charakterbögen an <@137565166001848320>.'), true);

    const confirmId = buildConfirmCustomId('session42', '137565166001848320');
    const rerollId = buildRerollCustomId('session42', '137565166001848320');
    const cancelId = buildCancelCustomId('session42', '137565166001848320');

    assert.deepEqual(parseActionCustomId(confirmId), {
        action: 'confirm',
        sessionId: 'session42',
        ownerId: '137565166001848320',
    });
    assert.deepEqual(parseActionCustomId(rerollId), {
        action: 'reroll',
        sessionId: 'session42',
        ownerId: '137565166001848320',
    });
    assert.deepEqual(parseActionCustomId(cancelId), {
        action: 'cancel',
        sessionId: 'session42',
        ownerId: '137565166001848320',
    });
    assert.deepEqual(parseFixedCustomId(buildFixedCustomId('session42', '137565166001848320')), {
        action: 'fixed',
        sessionId: 'session42',
        ownerId: '137565166001848320',
    });

    const commandJson = command.data.toJSON();
    assert.equal(commandJson.name.endsWith('-draw'), true);
    assert.equal(commandJson.description, 'Lost unter den Reaktionen einer Thread-Nachricht aus.');
    assert.equal(commandJson.options.length, 2);

    console.log('reaction-draw.test.js passed');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
