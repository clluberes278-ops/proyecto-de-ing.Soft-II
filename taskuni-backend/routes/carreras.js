const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');
const { registrarLog } = require('../log-helper');

// ============================================================================
// GET /api/carreras - Listar todas las carreras
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const pool = await getConnection();

        const result = await pool.request().query(`
            SELECT
                c.id_carrera,
                c.codigo_carrera AS codigo,
                c.nombre_carrera AS nombre,
                COALESCE(f.nombre_facultad, c.facultad) AS facultad,
                c.id_facultad,
                c.estado
            FROM Carrera c
            LEFT JOIN Facultad f ON c.id_facultad = f.id_facultad
            ORDER BY c.nombre_carrera
        `);

        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Error en GET /carreras:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// POST /api/carreras - Crear una nueva carrera
// ============================================================================
router.post('/', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { codigo, nombre, id_facultad, facultad, estado } = req.body;

        if (!codigo || !nombre) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos (codigo, nombre)'
            });
        }

        const pool = await getConnection();

        let resolvedIdFacultad = id_facultad ? Number(id_facultad) : null;
        let facultadText = facultad || null;

        // Si no mandaron id_facultad pero mandaron el string de facultad, intentamos resolverlo
        if (!resolvedIdFacultad && facultadText) {
            const facResult = await pool.request()
                .input('facName', sql.VarChar(100), facultadText)
                .query('SELECT id_facultad FROM Facultad WHERE nombre_facultad = @facName');
            if (facResult.recordset.length > 0) {
                resolvedIdFacultad = facResult.recordset[0].id_facultad;
            }
        }

        // Si mandaron id_facultad, resolvemos también su nombre de texto para guardarlo
        if (resolvedIdFacultad && !facultadText) {
            const facResult = await pool.request()
                .input('facId', sql.Int, resolvedIdFacultad)
                .query('SELECT nombre_facultad FROM Facultad WHERE id_facultad = @facId');
            if (facResult.recordset.length > 0) {
                facultadText = facResult.recordset[0].nombre_facultad;
            }
        }

        await pool.request()
            .input('codigo', sql.VarChar(20), codigo)
            .input('nombre', sql.VarChar(100), nombre)
            .input('facultadText', sql.VarChar(100), facultadText)
            .input('id_facultad', sql.Int, resolvedIdFacultad)
            .input('estado', sql.VarChar(15), estado || 'Activa')
            .query(`
                INSERT INTO Carrera (codigo_carrera, nombre_carrera, facultad, id_facultad, estado)
                VALUES (@codigo, @nombre, @facultadText, @id_facultad, @estado)
            `);

        await registrarLog(pool, sql, {
            evento: 'CARRERA_CREADA', usuario, entidad: 'Carrera', accion: 'CREATE',
            descripcion: `Carrera ${codigo} (${nombre}) creada`
        });

        res.status(201).json({ success: true, message: 'Carrera creada' });
    } catch (error) {
        if (error.number === 2627) {
            return res.status(409).json({ success: false, error: 'Ya existe una carrera con ese código' });
        }
        console.error('Error en POST /carreras:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PUT /api/carreras/:id - Actualizar una carrera existente
// ============================================================================
router.put('/:id', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { id } = req.params;
        const { nombre, id_facultad, facultad, estado } = req.body;

        const pool = await getConnection();

        let resolvedIdFacultad = id_facultad ? Number(id_facultad) : null;
        let facultadText = facultad || null;

        // Si no mandaron id_facultad pero mandaron el string de facultad, intentamos resolverlo
        if (!resolvedIdFacultad && facultadText) {
            const facResult = await pool.request()
                .input('facName', sql.VarChar(100), facultadText)
                .query('SELECT id_facultad FROM Facultad WHERE nombre_facultad = @facName');
            if (facResult.recordset.length > 0) {
                resolvedIdFacultad = facResult.recordset[0].id_facultad;
            }
        }

        // Si mandaron id_facultad, resolvemos también su nombre de texto para guardarlo
        if (resolvedIdFacultad && !facultadText) {
            const facResult = await pool.request()
                .input('facId', sql.Int, resolvedIdFacultad)
                .query('SELECT nombre_facultad FROM Facultad WHERE id_facultad = @facId');
            if (facResult.recordset.length > 0) {
                facultadText = facResult.recordset[0].nombre_facultad;
            }
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar(100), nombre)
            .input('facultadText', sql.VarChar(100), facultadText)
            .input('id_facultad', sql.Int, resolvedIdFacultad)
            .input('estado', sql.VarChar(15), estado)
            .query(`
                UPDATE Carrera
                SET nombre_carrera = @nombre, facultad = @facultadText, id_facultad = @id_facultad, estado = @estado
                WHERE id_carrera = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Carrera no encontrada' });
        }

        await registrarLog(pool, sql, {
            evento: 'CARRERA_ACTUALIZADA', usuario, entidad: 'Carrera', accion: 'UPDATE',
            descripcion: `Carrera id ${id} actualizada`
        });

        res.json({ success: true, message: 'Carrera actualizada' });
    } catch (error) {
        console.error('Error en PUT /carreras:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// DELETE /api/carreras/:codigo - Eliminar una carrera por su código
// ============================================================================
router.delete('/:codigo', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { codigo } = req.params;
        const pool = await getConnection();

        // Obtener el id de la carrera primero
        const carreraRes = await pool.request()
            .input('codigo', sql.VarChar(20), codigo)
            .query('SELECT id_carrera FROM Carrera WHERE codigo_carrera = @codigo');
        
        if (carreraRes.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Carrera no encontrada' });
        }

        const idCarrera = carreraRes.recordset[0].id_carrera;

        // Verificar si hay estudiantes en esta carrera
        const estCheck = await pool.request()
            .input('idCarrera', sql.Int, idCarrera)
            .query('SELECT COUNT(*) AS count FROM Estudiante WHERE id_carrera = @idCarrera');
        
        if (estCheck.recordset[0].count > 0) {
            return res.status(409).json({
                success: false,
                error: 'No se puede eliminar: hay estudiantes matriculados en esta carrera'
            });
        }

        // Verificar si hay pensums asociados
        const pensumCheck = await pool.request()
            .input('idCarrera', sql.Int, idCarrera)
            .query('SELECT COUNT(*) AS count FROM Pensum WHERE id_carrera = @idCarrera');
        
        if (pensumCheck.recordset[0].count > 0) {
            return res.status(409).json({
                success: false,
                error: 'No se puede eliminar: hay un pensum asociado a esta carrera'
            });
        }

        await pool.request()
            .input('codigo', sql.VarChar(20), codigo)
            .query('DELETE FROM Carrera WHERE codigo_carrera = @codigo');

        await registrarLog(pool, sql, {
            evento: 'CARRERA_ELIMINADA', usuario, entidad: 'Carrera', accion: 'DELETE',
            descripcion: `Carrera ${codigo} eliminada`
        });

        res.json({ success: true, message: 'Carrera eliminada' });
    } catch (error) {
        console.error('Error en DELETE /carreras:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
