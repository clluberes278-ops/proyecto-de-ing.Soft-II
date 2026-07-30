const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');
const { registrarLog } = require('../log-helper');

// ============================================================================
// GET /api/facultades - Listar todas las facultades
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const pool = await getConnection();

        const result = await pool.request().query(`
            SELECT
                id_facultad,
                codigo_facultad AS codigo,
                nombre_facultad AS nombre,
                estado
            FROM Facultad
            ORDER BY nombre_facultad
        `);

        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Error en GET /facultades:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// POST /api/facultades - Crear una nueva facultad
// Body esperado: { codigo, nombre, estado }
// ============================================================================
router.post('/', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { codigo, nombre, estado } = req.body;

        if (!codigo || !nombre) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos (codigo, nombre)'
            });
        }

        const pool = await getConnection();

        await pool.request()
            .input('codigo', sql.VarChar(20), codigo)
            .input('nombre', sql.VarChar(100), nombre)
            .input('estado', sql.VarChar(15), estado || 'Activa')
            .query(`
                INSERT INTO Facultad (codigo_facultad, nombre_facultad, estado)
                VALUES (@codigo, @nombre, @estado)
            `);

        await registrarLog(pool, sql, {
            evento: 'FACULTAD_CREADA', usuario, entidad: 'Facultad', accion: 'CREATE',
            descripcion: `Facultad ${codigo} (${nombre}) creada`
        });

        res.status(201).json({ success: true, message: 'Facultad creada' });
    } catch (error) {
        // 2627 = violación de restricción UNIQUE (código de facultad repetido)
        if (error.number === 2627) {
            return res.status(409).json({ success: false, error: 'Ya existe una facultad con ese código' });
        }
        console.error('Error en POST /facultades:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PUT /api/facultades/:id - Actualizar una facultad existente
// Body esperado: { nombre, estado }
// ============================================================================
router.put('/:id', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { id } = req.params;
        const { nombre, estado } = req.body;

        const pool = await getConnection();

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar(100), nombre)
            .input('estado', sql.VarChar(15), estado)
            .query(`
                UPDATE Facultad
                SET nombre_facultad = @nombre, estado = @estado
                WHERE id_facultad = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Facultad no encontrada' });
        }

        await registrarLog(pool, sql, {
            evento: 'FACULTAD_ACTUALIZADA', usuario, entidad: 'Facultad', accion: 'UPDATE',
            descripcion: `Facultad id ${id} actualizada`
        });

        res.json({ success: true, message: 'Facultad actualizada' });
    } catch (error) {
        console.error('Error en PUT /facultades:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// DELETE /api/facultades/:codigo - Eliminar una facultad por código
// ============================================================================
router.delete('/:codigo', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { codigo } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .input('codigo', sql.VarChar(20), codigo)
            .query('DELETE FROM Facultad WHERE codigo_facultad = @codigo');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Facultad no encontrada' });
        }

        await registrarLog(pool, sql, {
            evento: 'FACULTAD_ELIMINADA', usuario, entidad: 'Facultad', accion: 'DELETE',
            descripcion: `Facultad ${codigo} eliminada`
        });

        res.json({ success: true, message: 'Facultad eliminada' });
    } catch (error) {
        // 547 = violación de FK (alguna Carrera todavía referencia esta facultad)
        if (error.number === 547) {
            return res.status(409).json({ success: false, error: 'No se puede eliminar: hay carreras asociadas a esta facultad' });
        }
        console.error('Error en DELETE /facultades:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
