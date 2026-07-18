const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db'); // ajusta la ruta a tu módulo de conexión

// ============================================================================
// GET /api/notas - Listar notas (con filtros opcionales)
// Query params: periodo, asignatura, seccion, estudiante
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const { periodo, asignatura, seccion, estudiante } = req.query;
        const pool = await getConnection();
        const request = pool.request();

        // ✅ CORRECTO - usar nota_final / nota_literal (snake_case) como en la BD real
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
            WHERE 1 = 1
        `;

        // NOTA: ajusta los nombres de columna de filtro (s.periodo / s.id_periodo, etc.)
        // según tu esquema real de la tabla Seccion.
        if (periodo) {
            query += ' AND s.periodo = @periodo';
            request.input('periodo', sql.VarChar(20), periodo);
        }
        if (asignatura) {
            query += ' AND n.id_asignatura = @asignatura';
            request.input('asignatura', sql.Int, asignatura);
        }
        if (seccion) {
            query += ' AND n.id_seccion = @seccion';
            request.input('seccion', sql.Int, seccion);
        }
        if (estudiante) {
            query += ' AND n.id_estudiante = @estudiante';
            request.input('estudiante', sql.Int, estudiante);
        }

        const result = await request.query(query);

        // ✅ Transformar a camelCase para el frontend
        const notas = result.recordset.map(n => ({
            id_nota: n.id_nota,
            id_estudiante: n.id_estudiante,
            id_asignatura: n.id_asignatura,
            id_seccion: n.id_seccion,
            acum1: n.acum1,
            acum2: n.acum2,
            acum3: n.acum3,
            evalFinal: n.eval_final,
            notaFinal: n.nota_final,
            notaLiteral: n.nota_literal,
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
// Body esperado: { notas: [ { id_estudiante, id_asignatura, id_seccion,
//                              acum1, acum2, acum3, evalFinal, notaFinal,
//                              notaLiteral, estado } ] }
// ============================================================================
router.post('/', async (req, res) => {
    try {
        const { notas } = req.body;

        if (!Array.isArray(notas) || notas.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requiere un arreglo de notas' });
        }

        const pool = await getConnection();

        for (const nota of notas) {
            const request = pool.request()
                .input('id_estudiante', sql.Int, nota.id_estudiante)
                .input('id_asignatura', sql.Int, nota.id_asignatura)
                .input('id_seccion', sql.Int, nota.id_seccion)
                .input('acum1', sql.Decimal(5, 2), nota.acum1)
                .input('acum2', sql.Decimal(5, 2), nota.acum2)
                .input('acum3', sql.Decimal(5, 2), nota.acum3)
                .input('eval_final', sql.Decimal(5, 2), nota.evalFinal)
                .input('nota_final', sql.Decimal(5, 2), nota.notaFinal)
                .input('nota_literal', sql.VarChar(2), nota.notaLiteral)
                .input('estado', sql.Bit, nota.estado ?? 1);

            // MERGE: actualiza si ya existe la nota del estudiante/asignatura/sección, si no, la crea
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
        }

        res.json({ success: true, message: `${notas.length} nota(s) guardada(s)` });
    } catch (error) {
        console.error('Error en POST /notas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
