const fs = require('node:fs');
const path = require('node:path');

const testsDir = __dirname;
const entries = fs.readdirSync(testsDir, { withFileTypes: true });
const testFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.test.js'))
    .map(entry => entry.name)
    .sort();

for (const file of testFiles) {
    require(path.join(testsDir, file));
}
