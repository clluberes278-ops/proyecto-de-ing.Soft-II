// ============================================================================
// Bitácora genérica de actividad (dbo.Log): CRUD + import/export.
// Recibe pool/sql como parámetros para servir tanto a server.js (su propio
// pool/mssql) como a los routers en routes/*.js (db.js). Se traga sus propios
// errores (igual que registrarMantenimientoPensum en server.js) para no
// romper el endpoint que la llama si el ALTER TABLE con las columnas nuevas
// (usuario, entidad, accion, descripcion) todavía no corrió.
// ============================================================================

async function registrarLog(pool, sql, { tipo, evento, usuario, entidad, accion, descripcion, periodo, registros, archivo }) {
    try {
        await pool.request()
            // 'tipo' es NOT NULL en Log (columna original, pensada para
            // IMPORTACIÓN/EXPORTACIÓN); los eventos CRUD no mandan tipo, así
            // que cae en 'CRUD' en vez de violar la restricción.
            .input('tipo', sql.VarChar(20), tipo || 'CRUD')
            .input('evento', sql.VarChar(50), evento)
            .input('usuario', sql.VarChar(30), usuario || null)
            .input('entidad', sql.VarChar(30), entidad || null)
            .input('accion', sql.VarChar(20), accion || null)
            .input('descripcion', sql.VarChar(100), descripcion || null)
            .input('periodo', sql.VarChar(20), periodo || null)
            .input('registros', sql.Int, registros ?? null)
            .input('archivo', sql.VarChar(100), archivo || null)
            .input('fecha', sql.DateTime, new Date())
            .query(`
                INSERT INTO Log (tipo, evento, usuario, entidad, accion, descripcion, periodo, registros, archivo, fecha)
                VALUES (@tipo, @evento, @usuario, @entidad, @accion, @descripcion, @periodo, @registros, @archivo, @fecha)
            `);
    } catch (error) {
        console.warn('[Log] No se pudo registrar el evento (¿corriste el ALTER TABLE Log?):', error.message);
    }
}

module.exports = { registrarLog };
