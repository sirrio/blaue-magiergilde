const assert = require('node:assert/strict');

const previousPublicUrl = process.env.BOT_PUBLIC_APP_URL;
const previousAppUrl = process.env.APP_URL;

process.env.BOT_PUBLIC_APP_URL = 'https://blaue-magiergilde.de';
process.env.APP_URL = 'https://blaue-magiergilde.de';

delete require.cache[require.resolve('../appUrls')];
delete require.cache[require.resolve('../linkingUi')];

const { legalLinksLine, notLinkedContent, buildNotLinkedButtons, buildJoinConfirmButtons } = require('../linkingUi');

const legalLine = legalLinksLine();
assert.equal(legalLine.includes('Rechtliches'), true);
assert.equal(legalLine.includes('/datenschutz'), true);
assert.equal(legalLine.includes('/impressum'), true);

const content = notLinkedContent();
assert.equal(content.includes('Rechtliches'), true);
assert.equal(content.toLowerCase().includes('datenschutz'), true);
assert.equal(content.toLowerCase().includes('impressum'), true);

const buttons = buildNotLinkedButtons('123');
const components = buttons.components.map((component) => component.toJSON());

assert.equal(components[0].label, 'Neuen Account erstellen');
assert.equal(components[0].custom_id, 'appJoinStart_123');
assert.equal(components[1].label, 'Bestehenden Account verbinden');
assert.equal(components[1].style, 5);
assert.equal(components[1].url, 'https://blaue-magiergilde.de/settings/profile');

const joinConfirmButtons = buildJoinConfirmButtons('123').components.map((component) => component.toJSON());

assert.equal(joinConfirmButtons[0].label, 'Ja, Account erstellen');
assert.equal(joinConfirmButtons[0].custom_id, 'appJoinConfirm_123');
assert.equal(joinConfirmButtons[1].label, 'Abbrechen');
assert.equal(joinConfirmButtons[1].custom_id, 'appJoinCancel_123');

if (previousPublicUrl === undefined) {
    delete process.env.BOT_PUBLIC_APP_URL;
} else {
    process.env.BOT_PUBLIC_APP_URL = previousPublicUrl;
}

if (previousAppUrl === undefined) {
    delete process.env.APP_URL;
} else {
    process.env.APP_URL = previousAppUrl;
}

delete require.cache[require.resolve('../appUrls')];
delete require.cache[require.resolve('../linkingUi')];

console.log('linking-ui.test.js passed');
