const mysql = require('mysql2/promise');

let config = {};
try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    config = require('./config.json');
} catch {
    config = {};
}

const dbConfig = config.db || {};

const pool = mysql.createPool({
    host: process.env.DB_HOST ?? dbConfig.host,
    user: process.env.DB_USER ?? process.env.DB_USERNAME ?? dbConfig.user ?? dbConfig.username,
    password: process.env.DB_PASSWORD ?? dbConfig.password,
    database: process.env.DB_NAME ?? process.env.DB_DATABASE ?? dbConfig.database ?? dbConfig.name,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : (dbConfig.port ? Number(dbConfig.port) : undefined),
});

module.exports = pool;
