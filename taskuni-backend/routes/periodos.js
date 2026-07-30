const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');
const { registrarLog } = require('../log-helper');

// ============================================================================
// GET /api/periodos - Listar todos los periodos
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const pool = await getConnection();

        // CORRECTO - usar nombres reales de columnas (snake_case)
        const query = `
            SELECT
                id_periodo,
                periodo,
                fecha_inicio,
                fecha_fin,
                estado
            FROM Periodo
            ORDER BY CASE WHEN estado = 'Activo' THEN 0 ELSE 1 END, fecha_inicio DESC
        `;

        const result = await pool.request().query(query);

        // Transformar a camelCase para el frontend
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
        const usuario = req.headers['x-usuario'] || null;
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

        await registrarLog(pool, sql, {
            evento: 'PERIODO_CREADO', usuario, entidad: 'Periodo', accion: 'CREATE',
            descripcion: `Periodo ${periodo} creado`
        });

        res.json({ success: true, id_periodo: result.recordset[0].id_periodo });
    } catch (error) {
        console.error('Error en POST /periodos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PUT /api/periodos/:id - Actualizar un periodo existente
// Body esperado: { periodo, fechaInicio, fechaFin, estado }
// ============================================================================
router.put('/:id', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { id } = req.params;
        const { periodo, fechaInicio, fechaFin, estado } = req.body;

        if (!periodo || !fechaInicio || !fechaFin) {
            return res.status(400).json({
                success: false,
                error: 'Los campos periodo, fechaInicio y fechaFin son requeridos'
            });
        }

        const pool = await getConnection();

        // Si este periodo pasa a Activo, cerrar los demás
        if ((estado || 'Activo') === 'Activo') {
            await pool.request()
                .input('id', sql.Int, id)
                .query("UPDATE Periodo SET estado = 'Cerrado' WHERE id_periodo <> @id");
        }

        const query = `
            UPDATE Periodo
            SET periodo = @periodo,
                fecha_inicio = @fechaInicio,
                fecha_fin = @fechaFin,
                estado = @estado
            WHERE id_periodo = @id
        `;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('periodo', sql.VarChar(20), periodo)
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaFin', sql.Date, fechaFin)
            .input('estado', sql.VarChar(15), estado || 'Activo')
            .query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Periodo no encontrado' });
        }

        await registrarLog(pool, sql, {
            evento: 'PERIODO_ACTUALIZADO', usuario, entidad: 'Periodo', accion: 'UPDATE',
            descripcion: `Periodo id ${id} actualizado`
        });

        res.json({ success: true, message: 'Periodo actualizado' });
    } catch (error) {
        console.error('Error en PUT /periodos/:id:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// DELETE /api/periodos/:id - Eliminar un periodo
// ============================================================================
router.delete('/:id', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Periodo WHERE id_periodo = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Periodo no encontrado' });
        }

        await registrarLog(pool, sql, {
            evento: 'PERIODO_ELIMINADO', usuario, entidad: 'Periodo', accion: 'DELETE',
            descripcion: `Periodo id ${id} eliminado`
        });

        res.json({ success: true, message: 'Periodo eliminado' });
    } catch (error) {
        console.error('Error en DELETE /periodos/:id:', error);
        // Violación de FK (número 547 en SQL Server): el periodo tiene secciones asociadas
        if (error.number === 547) {
            return res.status(409).json({
                success: false,
                error: 'No se puede eliminar: este periodo tiene secciones asociadas'
            });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;