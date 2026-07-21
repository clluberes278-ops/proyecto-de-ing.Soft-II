// ============================================================================
// MATRÍCULA DE ESTUDIANTES POR SECCIÓN
// Se monta en server.js como: app.use('/api/secciones', router)
// Rutas resultantes:
//   GET    /api/secciones/:id/estudiantes
//   POST   /api/secciones/:id/estudiantes
//   DELETE /api/secciones/:id/estudiantes/:idEstudiante
// (No chocan con las rutas de /api/secciones ya definidas en server.js
//  porque tienen un segmento extra "/estudiantes" en la URL.)
// ============================================================================

const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');

// Resuelve id_estudiante a partir de matrícula o id numérico
async function resolverIdEstudiante(pool, valor) {
    if (!isNaN(valor)) return Number(valor);
    const r = await pool.request()
        .input('matricula', sql.VarChar(20), valor)
        .query('SELECT id_estudiante FROM Estudiante WHERE matricula = @matricula');
    if (r.recordset.length === 0) throw new Error(`Estudiante no encontrado: ${valor}`);
    return r.recordset[0].id_estudiante;
}

// ============================================================================
// GET /api/secciones/:id/estudiantes
// Lista los estudiantes matriculados en una sección específica.
// ============================================================================
router.get('/:id/estudiantes', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        const result = await pool.request()
            .input('idSeccion', sql.Int, id)
            .query(`
                SELECT
                    e.id_estudiante,
                    e.matricula,
                    e.nombre,
                    e.correo,
                    e.estado
                FROM SeccionEstudiante se
                INNER JOIN Estudiante e ON se.id_estudiante = e.id_estudiante
                WHERE se.id_seccion = @idSeccion AND se.estado = 'Activa'
                ORDER BY e.nombre
            `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Error en GET /secciones/:id/estudiantes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// POST /api/secciones/:id/estudiantes
// Fija el listado COMPLETO de estudiantes matriculados en la sección
// (reemplaza lo que hubiera antes). Body: { estudiantes: [matricula|id, ...] }
// ============================================================================
router.post('/:id/estudiantes', async (req, res) => {
    try {
        const { id } = req.params;
        const { estudiantes } = req.body;

        if (!Array.isArray(estudiantes)) {
            return res.status(400).json({ success: false, error: 'Se requiere un arreglo "estudiantes"' });
        }

        const pool = await getConnection();

        const seccionExiste = await pool.request()
            .input('idSeccion', sql.Int, id)
            .query('SELECT id_seccion FROM Seccion WHERE id_seccion = @idSeccion');
        if (seccionExiste.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Sección no encontrada' });
        }

        const idsEstudiantes = [];
        for (const valor of estudiantes) {
            idsEstudiantes.push(await resolverIdEstudiante(pool, valor));
        }

        const transaction = pool.transaction();
        await transaction.begin();
        try {
            await transaction.request()
                .input('idSeccion', sql.Int, id)
                .query('DELETE FROM SeccionEstudiante WHERE id_seccion = @idSeccion');

            for (const idEstudiante of idsEstudiantes) {
                await transaction.request()
                    .input('idSeccion', sql.Int, id)
                    .input('idEstudiante', sql.Int, idEstudiante)
                    .query(`
                        INSERT INTO SeccionEstudiante (id_seccion, id_estudiante, estado)
                        VALUES (@idSeccion, @idEstudiante, 'Activa')
                    `);
            }
            await transaction.commit();
        } catch (e) {
            await transaction.rollback();
            throw e;
        }

        res.json({ success: true, message: `${idsEstudiantes.length} estudiante(s) matriculado(s) en la sección` });
    } catch (error) {
        console.error('Error en POST /secciones/:id/estudiantes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// DELETE /api/secciones/:id/estudiantes/:idEstudiante
// Quita un solo estudiante de una sección.
// ============================================================================
router.delete('/:id/estudiantes/:idEstudiante', async (req, res) => {
    try {
        const { id, idEstudiante } = req.params;
        const pool = await getConnection();
        const idEst = await resolverIdEstudiante(pool, idEstudiante);

        const result = await pool.request()
            .input('idSeccion', sql.Int, id)
            .input('idEstudiante', sql.Int, idEst)
            .query('DELETE FROM SeccionEstudiante WHERE id_seccion = @idSeccion AND id_estudiante = @idEstudiante');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'El estudiante no estaba matriculado en esta sección' });
        }
        res.json({ success: true, message: 'Estudiante removido de la sección' });
    } catch (error) {
        console.error('Error en DELETE /secciones/:id/estudiantes/:idEstudiante:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
