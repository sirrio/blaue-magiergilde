const assert = require('node:assert/strict');

const modulePath = '../interactions/characterViews';
const originalFlag = process.env.FEATURE_CHARACTER_STATUS_SWITCH;

function loadBuildCharacterCardRows(flagValue) {
    process.env.FEATURE_CHARACTER_STATUS_SWITCH = flagValue;
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath).buildCharacterCardRows;
}

function labelsFromPrimaryRow(rows) {
    return rows[0].toJSON().components.map(component => component.label);
}

let buildCharacterCardRows = loadBuildCharacterCardRows('true');
let rows = buildCharacterCardRows({
    characterId: 10,
    ownerDiscordId: '123',
    isFiller: false,
    simplifiedTracking: false,
    guildStatus: 'draft',
});
let labels = labelsFromPrimaryRow(rows);

assert.equal(labels.includes('Bei der Magiergilde registrieren'), true);
assert.equal(labels.includes('Adventure'), false);
assert.equal(labels.includes('Downtime'), false);
assert.equal(labels.includes('Level setzen'), false);

buildCharacterCardRows = loadBuildCharacterCardRows('true');
rows = buildCharacterCardRows({
    characterId: 11,
    ownerDiscordId: '123',
    isFiller: false,
    simplifiedTracking: true,
    guildStatus: 'draft',
});
labels = labelsFromPrimaryRow(rows);

assert.equal(labels.includes('Level setzen'), false);

buildCharacterCardRows = loadBuildCharacterCardRows('true');
rows = buildCharacterCardRows({
    characterId: 13,
    ownerDiscordId: '123',
    isFiller: false,
    simplifiedTracking: false,
    guildStatus: 'needs_changes',
});
labels = labelsFromPrimaryRow(rows);
assert.equal(labels.includes('Bei der Magiergilde registrieren'), true);
assert.equal(labels.includes('Adventure'), false);

buildCharacterCardRows = loadBuildCharacterCardRows('false');
rows = buildCharacterCardRows({
    characterId: 12,
    ownerDiscordId: '123',
    isFiller: false,
    simplifiedTracking: false,
    guildStatus: 'draft',
});
const primaryComponents = rows[0].toJSON().components;
labels = primaryComponents.map(component => component.label);
const registerButton = primaryComponents.find(component => component.label === 'Bei der Magiergilde registrieren');

assert.equal(labels.includes('Adventure'), true);
assert.equal(labels.includes('Downtime'), true);
assert.ok(registerButton);
assert.equal(registerButton.disabled, true);

buildCharacterCardRows = loadBuildCharacterCardRows('true');
rows = buildCharacterCardRows({
    characterId: 14,
    ownerDiscordId: '123',
    isFiller: false,
    simplifiedTracking: false,
    guildStatus: 'draft',
    registrationBlockedReason: 'active_limit',
    registrationCounts: { consumedGeneralSlots: 8 },
});
const blockedRegisterButton = rows[0]
    .toJSON()
    .components
    .find(component => component.label === 'Bei der Magiergilde registrieren');

assert.ok(blockedRegisterButton);
assert.equal(blockedRegisterButton.disabled, true);

buildCharacterCardRows = loadBuildCharacterCardRows('true');
rows = buildCharacterCardRows({
    characterId: 15,
    ownerDiscordId: '123',
    isFiller: false,
    simplifiedTracking: false,
    guildStatus: 'approved',
    hasProgressionUpgradeAvailable: true,
});
const secondaryLabels = rows[1].toJSON().components.map(component => component.label);
assert.equal(secondaryLabels.includes('Neue Kurve'), true);
assert.equal(secondaryLabels.includes('Zurück zur Liste'), true);

if (originalFlag === undefined) {
    delete process.env.FEATURE_CHARACTER_STATUS_SWITCH;
} else {
    process.env.FEATURE_CHARACTER_STATUS_SWITCH = originalFlag;
}
delete require.cache[require.resolve(modulePath)];

console.log('character-card-rows.test.js passed');
