// Ejecutar UNA sola vez: node seed-admin.js
// Crea la primera cuenta admin para poder entrar al sistema.
// Después de correrlo, puedes crear el resto de las cuentas desde el panel de admin.

const bcrypt = require('bcryptjs');
const { getConnection, sql } = require('./db');

const CORREO_ADMIN = 'admin@unphu.edu.do';
const PASSWORD_ADMIN = 'Admin123456'; // Cámbiala después de tu primer login

async function seed() {
    const pool = await getConnection();

    const existe = await pool.request()
        .input('correo', sql.VarChar(100), CORREO_ADMIN)
        .query('SELECT id_usuario FROM Usuario WHERE correo = @correo');

    if (existe.recordset.length > 0) {
        console.log('Ya existe una cuenta con ese correo, no se creó ninguna nueva.');
        process.exit(0);
    }

    const hash = await bcrypt.hash(PASSWORD_ADMIN, 10);

    await pool.request()
        .input('correo', sql.VarChar(100), CORREO_ADMIN)
        .input('hash', sql.VarChar(255), hash)
        .query(`
            INSERT INTO Usuario (correo, password_hash, rol, estado)
            VALUES (@correo, @hash, 'admin', 'Activo')
        `);

    console.log('[OK] Cuenta admin creada:');
    console.log('   Correo:', CORREO_ADMIN);
    console.log('   Password:', PASSWORD_ADMIN);
    console.log('   Cámbiala después de entrar por primera vez.');
    process.exit(0);
}

seed().catch(err => {
    console.error('Error creando la cuenta admin:', err.message);
    process.exit(1);
});
