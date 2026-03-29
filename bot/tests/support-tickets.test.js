const assert = require('node:assert/strict');
const {
    isTicketCloseCommand,
    isTicketClaimCommand,
    isTicketUnclaimCommand,
    isTicketReopenCommand,
    buildTicketThreadName,
    buildTicketSummaryContent,
    buildUserRelayContent,
    buildStaffRelayContent,
    buildTicketStateLine,
} = require('../supportTickets');

const sampleMessage = {
    author: {
        id: '1234567890',
        username: 'sirrio',
        tag: 'sirrio#0001',
    },
    content: 'Need help with my character sheet.',
    attachments: new Map([
        ['1', { url: 'https://cdn.example.com/file-one.png' }],
        ['2', { url: 'https://cdn.example.com/file-two.png' }],
    ]),
};

assert.equal(isTicketCloseCommand('!close'), true);
assert.equal(isTicketCloseCommand(' ticket   close '), true);
assert.equal(isTicketCloseCommand('close'), true);
assert.equal(isTicketCloseCommand('please close'), false);
assert.equal(isTicketClaimCommand('!claim'), true);
assert.equal(isTicketUnclaimCommand('ticket unclaim'), true);
assert.equal(isTicketReopenCommand('/reopen'), true);
assert.equal(isTicketReopenCommand('re-open'), false);

const threadName = buildTicketThreadName(sampleMessage.author);
assert.equal(threadName.startsWith('inbox-'), true);
assert.equal(threadName.includes('#'), false);

const userRelay = buildUserRelayContent(sampleMessage, 'de');
assert.equal(userRelay.startsWith('👤 '), true);
assert.equal(userRelay.includes('sirrio#0001:'), true);
assert.equal(userRelay.includes('Need help with my character sheet.'), true);
assert.equal(userRelay.includes('📎 2 Anhänge'), true);
assert.equal(userRelay.includes('[Attachment 1]('), true);
assert.equal(userRelay.includes('From:'), false);

const staffRelay = buildStaffRelayContent(sampleMessage, 'en');
assert.equal(staffRelay.startsWith('🛠 '), true);
assert.equal(staffRelay.includes('sirrio#0001:'), true);
assert.equal(staffRelay.includes('Need help with my character sheet.'), true);
assert.equal(staffRelay.includes('📎 2 attachments'), true);
assert.equal(staffRelay.includes('[Attachment 2]('), true);
assert.equal(staffRelay.includes('From:'), false);

assert.equal(buildTicketStateLine('pending_staff', null).includes('Pending staff'), true);
assert.equal(buildTicketStateLine('pending_user', '1234').includes('<@1234>'), true);

const summary = buildTicketSummaryContent({
    id: 42,
    user_discord_id: '1234567890',
    status: 'pending_user',
    assigned_to_discord_id: '98765',
    updated_at: new Date().toISOString(),
}, 'sirrio#0001', 'de');
assert.equal(summary.includes('Support-Ticket #42'), false);
assert.equal(summary.includes('pending_user'), false);
assert.equal(summary.includes('Pending user'), true);
assert.equal(summary.includes('Zuständig: <@98765>'), true);
assert.equal(summary.includes('Briefkasten #42'), true);

console.log('support-tickets.test.js passed');
