const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');
const { registrarLog } = require('../log-helper');

// ============================================================================
// GET /api/tareas?estudiante=<idOrMatricula> - Listar tareas de un estudiante
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const { estudiante } = req.query;
        if (!estudiante) {
            return res.status(400).json({ success: false, error: 'El parámetro estudiante es requerido' });
        }

        const pool = await getConnection();

        const query = `
            SELECT
                t.id_tarea,
                t.id_estudiante,
                t.id_asignatura,
                a.codigo_asignatura,
                a.nombre_asignatura,
                t.titulo,
                t.descripcion,
                t.fecha_limite,
                t.estado
            FROM Tarea t
            INNER JOIN Estudiante e ON e.id_estudiante = t.id_estudiante
            LEFT JOIN Asignatura a ON a.id_asignatura = t.id_asignatura
            WHERE e.id_estudiante = @estudiante OR e.matricula = @matricula
            ORDER BY t.fecha_limite ASC
        `;

        const result = await pool.request()
            .input('estudiante', sql.Int, isNaN(estudiante) ? null : Number(estudiante))
            .input('matricula', sql.VarChar(20), estudiante)
            .query(query);

        const tareas = result.recordset.map(t => ({
            id_tarea: t.id_tarea,
            id_estudiante: t.id_estudiante,
            id_asignatura: t.id_asignatura,
            codigoAsignatura: t.codigo_asignatura,
            nombreAsignatura: t.nombre_asignatura,
            titulo: t.titulo,
            descripcion: t.descripcion,
            fechaLimite: t.fecha_limite,
            estado: t.estado
        }));

        res.json({ success: true, data: tareas });
    } catch (error) {
        console.error('Error en GET /tareas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// POST /api/tareas - Crear nueva tarea
// Body esperado: { idEstudiante, idAsignatura, titulo, descripcion, fechaLimite }
// ============================================================================
router.post('/', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { idEstudiante, idAsignatura, titulo, descripcion, fechaLimite } = req.body;

        if (!idEstudiante || !titulo || !fechaLimite) {
            return res.status(400).json({
                success: false,
                error: 'Los campos idEstudiante, titulo y fechaLimite son requeridos'
            });
        }

        if (new Date(fechaLimite) <= new Date()) {
            return res.status(400).json({
                success: false,
                error: 'La fecha límite debe ser posterior a la fecha actual'
            });
        }

        const pool = await getConnection();

        const query = `
            INSERT INTO Tarea (id_estudiante, id_asignatura, titulo, descripcion, fecha_limite, estado)
            OUTPUT INSERTED.id_tarea
            VALUES (@idEstudiante, @idAsignatura, @titulo, @descripcion, @fechaLimite, 'Pendiente')
        `;

        const result = await pool.request()
            .input('idEstudiante', sql.Int, idEstudiante)
            .input('idAsignatura', sql.Int, idAsignatura || null)
            .input('titulo', sql.VarChar(100), titulo)
            .input('descripcion', sql.VarChar(500), descripcion || null)
            .input('fechaLimite', sql.DateTime, fechaLimite)
            .query(query);

        await registrarLog(pool, sql, {
            evento: 'TAREA_CREADA', usuario, entidad: 'Tarea', accion: 'CREATE',
            descripcion: `Tarea "${titulo}" creada`
        });

        res.status(201).json({ success: true, id_tarea: result.recordset[0].id_tarea });
    } catch (error) {
        console.error('Error en POST /tareas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PUT /api/tareas/:id - Actualizar una tarea existente
// Body esperado: { idAsignatura, titulo, descripcion, fechaLimite, estado }
// ============================================================================
router.put('/:id', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { id } = req.params;
        const { idAsignatura, titulo, descripcion, fechaLimite, estado } = req.body;

        if (!titulo || !fechaLimite) {
            return res.status(400).json({
                success: false,
                error: 'Los campos titulo y fechaLimite son requeridos'
            });
        }

        const pool = await getConnection();

        const query = `
            UPDATE Tarea
            SET id_asignatura = @idAsignatura,
                titulo = @titulo,
                descripcion = @descripcion,
                fecha_limite = @fechaLimite,
                estado = @estado
            WHERE id_tarea = @id
        `;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('idAsignatura', sql.Int, idAsignatura || null)
            .input('titulo', sql.VarChar(100), titulo)
            .input('descripcion', sql.VarChar(500), descripcion || null)
            .input('fechaLimite', sql.DateTime, fechaLimite)
            .input('estado', sql.VarChar(15), estado || 'Pendiente')
            .query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
        }

        await registrarLog(pool, sql, {
            evento: 'TAREA_ACTUALIZADA', usuario, entidad: 'Tarea', accion: 'UPDATE',
            descripcion: `Tarea id ${id} actualizada`
        });

        res.json({ success: true, message: 'Tarea actualizada' });
    } catch (error) {
        console.error('Error en PUT /tareas/:id:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// DELETE /api/tareas/:id - Eliminar una tarea
// ============================================================================
router.delete('/:id', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Tarea WHERE id_tarea = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
        }

        await registrarLog(pool, sql, {
            evento: 'TAREA_ELIMINADA', usuario, entidad: 'Tarea', accion: 'DELETE',
            descripcion: `Tarea id ${id} eliminada`
        });

        res.json({ success: true, message: 'Tarea eliminada' });
    } catch (error) {
        console.error('Error en DELETE /tareas/:id:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
