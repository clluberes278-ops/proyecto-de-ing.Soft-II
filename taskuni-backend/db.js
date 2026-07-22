// ============================================================================
// MÓDULO DE CONEXIÓN COMPARTIDO A SQL SERVER
// Usado por los routers en routes/*.js
// (server.js mantiene su propio pool para las rutas que siguen viviendo ahí)
// ============================================================================

const mssql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    authentication: {
        type: 'default',
        options: {
            userName: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        }
    },
    options: {
        database: process.env.DB_DATABASE,
        trustServerCertificate: true,
        enableKeepAlive: true
    }
};

let pool = null;

async function getConnection() {
    if (pool && pool.connected) {
        return pool;
    }
    pool = new mssql.ConnectionPool(config);
    await pool.connect();
    return pool;
}

module.exports = { getConnection, sql: mssql };