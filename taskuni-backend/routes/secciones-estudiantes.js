// ============================================================================
// MATRÍCULA DE ESTUDIANTES POR SECCIÓN
// Se monta en server.js como: app.use('/api/secciones', router)
// Rutas resultantes:
//   GET    /api/secciones/:id/estudiantes                 - lista de un curso
//   POST   /api/secciones/:id/estudiantes                 - [DEPRECADO] set masivo (admin)
//   POST   /api/secciones/:id/estudiantes/:idEstudiante    - auto-inscripción (estudiante)
//   DELETE /api/secciones/:id/estudiantes/:idEstudiante    - dar de baja (estudiante o admin)
//   GET    /api/secciones/estudiante/:idEstudiante         - secciones donde está inscrito
// (No chocan con las rutas de /api/secciones ya definidas en server.js
//  porque tienen un segmento extra "/estudiantes" en la URL.)
// ============================================================================

const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');
const { registrarLog } = require('../log-helper');

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
// GET /api/secciones/estudiante/:idEstudiante
// Lista las secciones (con asignatura, profesor y periodo) en las que un
// estudiante está inscrito actualmente. Usado por el panel de "Mis Materias".
// ============================================================================
router.get('/estudiante/:idEstudiante', async (req, res) => {
    try {
        const pool = await getConnection();
        const idEst = await resolverIdEstudiante(pool, req.params.idEstudiante);

        const result = await pool.request()
            .input('idEstudiante', sql.Int, idEst)
            .query(`
                SELECT
                    s.id_seccion AS id,
                    s.numero_seccion AS numero,
                    a.id_asignatura,
                    a.codigo_asignatura AS codigoAsignatura,
                    a.nombre_asignatura AS nombreAsignatura,
                    a.creditos,
                    pr.nombre AS nombreProfesor,
                    per.id_periodo,
                    per.periodo,
                    per.estado AS estadoPeriodo
                FROM SeccionEstudiante se
                INNER JOIN Seccion s ON se.id_seccion = s.id_seccion
                INNER JOIN Asignatura a ON s.id_asignatura = a.id_asignatura
                LEFT JOIN Profesor pr ON s.id_profesor = pr.id_profesor
                INNER JOIN Periodo per ON s.id_periodo = per.id_periodo
                WHERE se.id_estudiante = @idEstudiante AND se.estado = 'Activa'
                ORDER BY per.periodo DESC, a.nombre_asignatura
            `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Error en GET /secciones/estudiante/:idEstudiante:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

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
// POST /api/secciones/:id/estudiantes/:idEstudiante
// Auto-inscripción: el propio estudiante se agrega a una sección.
// Reglas:
//  - La sección debe existir y estar Activa.
//  - El estudiante no puede estar ya inscrito en OTRA sección de la misma
//    asignatura dentro del mismo periodo (evita duplicar la materia).
//  - La asignatura de la sección debe pertenecer al pensum ACTIVO de la
//    carrera del estudiante (sin esto un estudiante de contabilidad podía
//    inscribirse en materias de sistemas). Si la carrera no tiene pensum
//    activo o la sección no tiene pensum/carrera asociada, se rechaza.
// ============================================================================
router.post('/:id/estudiantes/:idEstudiante', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { id } = req.params;
        const pool = await getConnection();
        const idEst = await resolverIdEstudiante(pool, req.params.idEstudiante);

        const seccionResult = await pool.request()
            .input('idSeccion', sql.Int, id)
            .query(`
                SELECT s.id_seccion, s.id_asignatura, s.id_periodo, s.estado
                FROM Seccion s
                WHERE s.id_seccion = @idSeccion
            `);
        if (seccionResult.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Sección no encontrada' });
        }
        const seccion = seccionResult.recordset[0];
        if (seccion.estado && seccion.estado !== 'Activa') {
            return res.status(409).json({ success: false, error: 'Esta sección no está activa' });
        }

        // ¿Ya está inscrito en otra sección de la misma asignatura y periodo?
        const yaInscritoMismaMateria = await pool.request()
            .input('idEstudiante', sql.Int, idEst)
            .input('idAsignatura', sql.Int, seccion.id_asignatura)
            .input('idPeriodo', sql.Int, seccion.id_periodo)
            .query(`
                SELECT se.id_seccion
                FROM SeccionEstudiante se
                INNER JOIN Seccion s ON se.id_seccion = s.id_seccion
                WHERE se.id_estudiante = @idEstudiante
                  AND se.estado = 'Activa'
                  AND s.id_asignatura = @idAsignatura
                  AND s.id_periodo = @idPeriodo
            `);
        if (yaInscritoMismaMateria.recordset.length > 0) {
            if (yaInscritoMismaMateria.recordset[0].id_seccion === Number(id)) {
                return res.json({ success: true, message: 'Ya estabas inscrito en esta sección' });
            }
            return res.status(409).json({
                success: false,
                error: 'Ya estás inscrito en otra sección de esta misma asignatura en este periodo'
            });
        }

        // Validación de carrera: la asignatura de la sección debe pertenecer
        // al pensum activo de la carrera del estudiante.
        const carreraEstudianteResult = await pool.request()
            .input('idEstudiante', sql.Int, idEst)
            .query(`
                SELECT e.id_carrera, p.id_pensum, p.estado AS estadoPensum
                FROM Estudiante e
                LEFT JOIN Pensum p ON p.id_carrera = e.id_carrera AND p.estado = 'Activo'
                WHERE e.id_estudiante = @idEstudiante
            `);
        const carreraEst = carreraEstudianteResult.recordset[0];
        if (!carreraEst || carreraEst.id_carrera == null) {
            return res.status(409).json({
                success: false,
                error: 'No tienes una carrera asignada. Contacta a administración.'
            });
        }
        if (!carreraEst.id_pensum) {
            return res.status(409).json({
                success: false,
                error: 'Tu carrera no tiene un pensum activo. Contacta a administración.'
            });
        }

        // La sección debe tener una asignatura con un pensum cuya carrera
        // coincida con la del estudiante (y ese pensum debe ser el activo).
        const pensumSeccionResult = await pool.request()
            .input('idAsignatura', sql.Int, seccion.id_asignatura)
            .input('idCarreraEst', sql.Int, carreraEst.id_carrera)
            .query(`
                SELECT a.id_pensum, p.id_carrera, p.estado AS estadoPensum
                FROM Asignatura a
                INNER JOIN Pensum p ON a.id_pensum = p.id_pensum
                WHERE a.id_asignatura = @idAsignatura
            `);
        const pensumSeccion = pensumSeccionResult.recordset[0];
        const carreraDeLaAsignatura = pensumSeccion ? pensumSeccion.id_carrera : null;

        if (!pensumSeccion) {
            return res.status(409).json({
                success: false,
                error: 'Esta sección no tiene una asignatura con pensum asociado. Contacta a administración.'
            });
        }
        if (carreraDeLaAsignatura !== carreraEst.id_carrera || pensumSeccion.estadoPensum !== 'Activo') {
            return res.status(409).json({
                success: false,
                error: 'Esta materia no pertenece al plan de estudios de tu carrera.'
            });
        }

        await pool.request()
            .input('idSeccion', sql.Int, id)
            .input('idEstudiante', sql.Int, idEst)
            .query(`
                INSERT INTO SeccionEstudiante (id_seccion, id_estudiante, estado)
                VALUES (@idSeccion, @idEstudiante, 'Activa')
            `);

        await registrarLog(pool, sql, {
            evento: 'MATRICULA_CREADA', usuario, entidad: 'Matricula', accion: 'CREATE',
            descripcion: `Estudiante id ${idEst} inscrito en sección ${id}`
        });

        res.status(201).json({ success: true, message: 'Inscripción realizada correctamente' });
    } catch (error) {
        console.error('Error en POST /secciones/:id/estudiantes/:idEstudiante:', error);
        if (error.number === 2627) {
            return res.status(409).json({ success: false, error: 'Ya estabas inscrito en esta sección' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// POST /api/secciones/:id/estudiantes  [DEPRECADO]
// Antes usado por el admin/profesor para fijar en bloque el listado completo
// de estudiantes de una sección. Ya no se usa desde el frontend: ahora cada
// estudiante se inscribe individualmente con POST /:id/estudiantes/:idEstudiante.
// Se deja aquí (sin uso) solo por compatibilidad; puede eliminarse si no hace falta.
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
// Quita un solo estudiante de una sección (baja / auto-baja del estudiante).
// ============================================================================
router.delete('/:id/estudiantes/:idEstudiante', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
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

        await registrarLog(pool, sql, {
            evento: 'MATRICULA_ELIMINADA', usuario, entidad: 'Matricula', accion: 'DELETE',
            descripcion: `Estudiante id ${idEst} removido de sección ${id}`
        });

        res.json({ success: true, message: 'Estudiante removido de la sección' });
    } catch (error) {
        console.error('Error en DELETE /secciones/:id/estudiantes/:idEstudiante:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
