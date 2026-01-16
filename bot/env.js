const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined || key.startsWith('BOT_')) {
            process.env[key] = value;
        }
    }
}
