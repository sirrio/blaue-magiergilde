const fs = require('node:fs');
const path = require('node:path');

function redactValue(value) {
    if (value === null || value === undefined) return value;
    return 'REDACTED';
}

function redactConfig(config) {
    const redacted = { ...config };

    if ('token' in redacted) redacted.token = redactValue(redacted.token);
    if ('publicKey' in redacted) redacted.publicKey = redactValue(redacted.publicKey);
    if ('clientSecret' in redacted) redacted.clientSecret = redactValue(redacted.clientSecret);

    if (redacted.db && typeof redacted.db === 'object') {
        redacted.db = { ...redacted.db };
        if ('password' in redacted.db) redacted.db.password = redactValue(redacted.db.password);
    }

    return redacted;
}

function main() {
    const configPath = path.join(__dirname, 'config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);
    const redacted = redactConfig(config);
    process.stdout.write(JSON.stringify(redacted, null, 2));
    process.stdout.write('\n');
}

main();

