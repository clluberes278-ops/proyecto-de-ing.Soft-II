const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');

// ============================================================================
// GET /api/periodos - Listar todos los periodos
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const pool = await getConnection();

        // ✅ CORRECTO - usar nombres reales de columnas (snake_case)
        const query = `
            SELECT
                id_periodo,
                periodo,
                fecha_inicio,
                fecha_fin,
                estado
            FROM Periodo
            ORDER BY fecha_inicio DESC
        `;

        const result = await pool.request().query(query);

        // ✅ Transformar a camelCase para el frontend
        const periodos = result.recordset.map(p => ({
            id_periodo: p.id_periodo,
            periodo: p.periodo,
            fechaInicio: p.fecha_inicio,
            fechaFin: p.fecha_fin,
            estado: p.estado
        }));

        res.json({ success: true, data: periodos });
    } catch (error) {
        console.error('Error en GET /periodos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// POST /api/periodos - Crear nuevo periodo
// Body esperado: { periodo, cuatrimestre, fechaInicio, fechaFin, estado }
// ============================================================================
router.post('/', async (req, res) => {
    try {
        const { periodo, fechaInicio, fechaFin, estado } = req.body;

        if (!periodo || !fechaInicio || !fechaFin) {
            return res.status(400).json({
                success: false,
                error: 'Los campos periodo, fechaInicio y fechaFin son requeridos'
            });
        }

        const pool = await getConnection();

        // Si el nuevo período es Activo, cerrar los demás
        if ((estado || 'Activo') === 'Activo') {
            await pool.request().query("UPDATE Periodo SET estado = 'Cerrado'");
        }

        const query = `
            INSERT INTO Periodo (periodo, fecha_inicio, fecha_fin, estado)
            OUTPUT INSERTED.id_periodo
            VALUES (@periodo, @fechaInicio, @fechaFin, @estado)
        `;

        const result = await pool.request()
            .input('periodo', sql.VarChar(20), periodo)
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaFin', sql.Date, fechaFin)
            .input('estado', sql.VarChar(15), estado || 'Activo')
            .query(query);

        res.json({ success: true, id_periodo: result.recordset[0].id_periodo });
    } catch (error) {
        console.error('Error en POST /periodos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;