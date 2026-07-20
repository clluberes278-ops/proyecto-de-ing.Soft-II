const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');

// ============================================================================
// Helper: resolver id_estudiante a partir de matricula o id numérico
// ============================================================================
async function resolverIdEstudiante(pool, valor) {
    if (!isNaN(valor)) return Number(valor);
    const r = await pool.request()
        .input('matricula', sql.VarChar(20), valor)
        .query('SELECT id_estudiante FROM Estudiante WHERE matricula = @matricula');
    if (r.recordset.length === 0) throw new Error(`Estudiante no encontrado: ${valor}`);
    return r.recordset[0].id_estudiante;
}

// ============================================================================
// Helper: resolver id_asignatura a partir de codigo_asignatura o id numérico
// ============================================================================
async function resolverIdAsignatura(pool, valor) {
    if (!isNaN(valor)) return Number(valor);
    const r = await pool.request()
        .input('codigo', sql.VarChar(20), valor)
        .query('SELECT id_asignatura FROM Asignatura WHERE codigo_asignatura = @codigo');
    if (r.recordset.length === 0) throw new Error(`Asignatura no encontrada: ${valor}`);
    return r.recordset[0].id_asignatura;
}

// ============================================================================
// GET /api/notas - Listar notas (con filtros opcionales)
// Query params: periodo, asignatura, seccion, estudiante
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const { periodo, asignatura, seccion, estudiante } = req.query;
        const pool = await getConnection();
        const request = pool.request();

        let query = `
            SELECT
                n.id_nota,
                n.id_estudiante,
                n.id_asignatura,
                n.id_seccion,
                n.acum1,
                n.acum2,
                n.acum3,
                n.eval_final,
                n.nota_final,
                n.nota_literal,
                n.estado,
                e.nombre AS nombre_estudiante,
                a.nombre_asignatura
            FROM Nota n
            INNER JOIN Estudiante e ON n.id_estudiante = e.id_estudiante
            INNER JOIN Asignatura a ON n.id_asignatura = a.id_asignatura
            INNER JOIN Seccion s ON n.id_seccion = s.id_seccion
            INNER JOIN Periodo pe ON s.id_periodo = pe.id_periodo
            WHERE 1 = 1
        `;

        // Corregido: Seccion no tiene columna "periodo", solo id_periodo (FK).
        // El texto del periodo vive en la tabla Periodo, por eso el JOIN de arriba.
        if (periodo) {
            query += ' AND pe.periodo = @periodo';
            request.input('periodo', sql.VarChar(20), periodo);
        }
        if (asignatura) {
            const idAsig = await resolverIdAsignatura(pool, asignatura);
            query += ' AND n.id_asignatura = @asignatura';
            request.input('asignatura', sql.Int, idAsig);
        }
        if (seccion) {
            query += ' AND n.id_seccion = @seccion';
            request.input('seccion', sql.Int, seccion);
        }
        if (estudiante) {
            const idEst = await resolverIdEstudiante(pool, estudiante);
            query += ' AND n.id_estudiante = @estudiante';
            request.input('estudiante', sql.Int, idEst);
        }

        const result = await request.query(query);

        const notas = result.recordset.map(n => ({
            id_nota: n.id_nota,
            idEstudiante: n.id_estudiante,
            idAsignatura: n.id_asignatura,
            idSeccion: n.id_seccion,
            acum1: n.acum1,
            acum2: n.acum2,
            acum3: n.acum3,
            evalFinal: n.eval_final,
            notaFinal: n.nota_final,
            literal: n.nota_literal,
            estado: n.estado,
            nombreEstudiante: n.nombre_estudiante,
            nombreAsignatura: n.nombre_asignatura
        }));

        res.json({ success: true, data: notas });
    } catch (error) {
        console.error('Error en GET /notas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// POST /api/notas - Guardar/actualizar notas de un acta
// Body esperado (igual al que ya manda dashboard.js):
// { notas: [ { idEstudiante, idAsignatura, idSeccion, acum1, acum2, acum3,
//              evalFinal, notaFinal, literal } ] }
//
// dashboard.js ya manda el id_seccion real (elegido en el selector de Sección
// del formulario ENT-07). El fallback de abajo (tomar la primera sección de
// la asignatura) queda solo como red de seguridad por si llega vacío.
// ============================================================================
router.post('/', async (req, res) => {
    try {
        const { notas } = req.body;

        if (!Array.isArray(notas) || notas.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requiere un arreglo de notas' });
        }

        const pool = await getConnection();
        let guardadas = 0;

        for (const nota of notas) {
            const idEstudiante = await resolverIdEstudiante(pool, nota.idEstudiante);
            const idAsignatura = await resolverIdAsignatura(pool, nota.idAsignatura);

            let idSeccion = !isNaN(nota.idSeccion) ? Number(nota.idSeccion) : null;
            if (!idSeccion) {
                const secResult = await pool.request()
                    .input('idAsignatura', sql.Int, idAsignatura)
                    .query('SELECT TOP 1 id_seccion FROM Seccion WHERE id_asignatura = @idAsignatura ORDER BY id_seccion');
                if (secResult.recordset.length === 0) {
                    throw new Error(`No hay ninguna sección creada para la asignatura ${nota.idAsignatura}`);
                }
                idSeccion = secResult.recordset[0].id_seccion;
            }

            const request = pool.request()
                .input('id_estudiante', sql.Int, idEstudiante)
                .input('id_asignatura', sql.Int, idAsignatura)
                .input('id_seccion', sql.Int, idSeccion)
                .input('acum1', sql.Decimal(5, 2), nota.acum1)
                .input('acum2', sql.Decimal(5, 2), nota.acum2)
                .input('acum3', sql.Decimal(5, 2), nota.acum3)
                .input('eval_final', sql.Decimal(5, 2), nota.evalFinal)
                .input('nota_final', sql.Decimal(5, 2), nota.notaFinal)
                .input('nota_literal', sql.VarChar(2), nota.literal)
                .input('estado', sql.VarChar(15), nota.estado || 'Pendiente');

            await request.query(`
                MERGE Nota AS target
                USING (SELECT @id_estudiante AS id_estudiante, @id_asignatura AS id_asignatura, @id_seccion AS id_seccion) AS src
                ON target.id_estudiante = src.id_estudiante
                   AND target.id_asignatura = src.id_asignatura
                   AND target.id_seccion = src.id_seccion
                WHEN MATCHED THEN
                    UPDATE SET
                        acum1 = @acum1,
                        acum2 = @acum2,
                        acum3 = @acum3,
                        eval_final = @eval_final,
                        nota_final = @nota_final,
                        nota_literal = @nota_literal,
                        estado = @estado
                WHEN NOT MATCHED THEN
                    INSERT (id_estudiante, id_asignatura, id_seccion, acum1, acum2, acum3, eval_final, nota_final, nota_literal, estado)
                    VALUES (@id_estudiante, @id_asignatura, @id_seccion, @acum1, @acum2, @acum3, @eval_final, @nota_final, @nota_literal, @estado);
            `);
            guardadas++;
        }

        res.json({ success: true, message: `${guardadas} nota(s) guardada(s)` });
    } catch (error) {
        console.error('Error en POST /notas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;