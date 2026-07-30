const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');

// ============================================================================
// GET /api/mantenimiento-pensum - Bitácora de cambios de pensum
// Query params opcionales: idPensum, idCarrera
// Solo lectura: los registros los inserta el backend automáticamente cuando
// cambia Asignatura.id_pensum (ver POST/PUT /api/asignaturas en server.js).
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const { idPensum, idCarrera } = req.query;
        const pool = await getConnection();
        const request = pool.request();

        let query = `
            SELECT
                m.id_mantenimiento,
                m.fecha_cambio,
                m.tipo_cambio,
                m.descripcion,
                m.usuario,
                a.codigo_asignatura,
                a.nombre_asignatura,
                p.id_pensum,
                c.nombre_carrera
            FROM MantenimientoPensum m
            INNER JOIN Asignatura a ON m.id_asignatura = a.id_asignatura
            INNER JOIN Pensum p ON m.id_pensum = p.id_pensum
            LEFT JOIN Carrera c ON p.id_carrera = c.id_carrera
            WHERE 1 = 1
        `;

        if (idPensum) {
            query += ' AND m.id_pensum = @idPensum';
            request.input('idPensum', sql.Int, idPensum);
        }
        if (idCarrera) {
            query += ' AND p.id_carrera = @idCarrera';
            request.input('idCarrera', sql.Int, idCarrera);
        }

        query += ' ORDER BY m.fecha_cambio DESC';

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Error en GET /mantenimiento-pensum:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
