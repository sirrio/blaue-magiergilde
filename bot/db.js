const mysql = require('mysql2/promise');
require('./env');

const host = (process.env.DB_HOST || '127.0.0.1').trim();
const user = (process.env.DB_USERNAME || process.env.DB_USER || '').trim();
const password = process.env.DB_PASSWORD ?? '';
const database = (process.env.DB_DATABASE || process.env.DB_NAME || '').trim();
const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

if (!user || !database) {
    throw new Error('Bot DB not configured. Set DB_USERNAME and DB_DATABASE in the root .env.');
}

const pool = mysql.createPool({
    host,
    user,
    password,
    database,
    port,
});

module.exports = pool;
