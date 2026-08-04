const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db'); // ajusta la ruta a tu módulo de conexión
const { registrarLog } = require('../log-helper');

// ============================================================================
// GET /api/configuracion - Obtener configuración (umbrales)
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const pool = await getConnection();
        const { periodo } = req.query;

        // Si se pide un período puntual, buscamos primero la fila de ese
        // período; si no existe (todavía no se guardó config para él), caemos
        // a la fila "global" (id_periodo NULL) y por último al hardcodeado.
        // Antes esto ignoraba id_periodo por completo y devolvía SIEMPRE la
        // primera fila de la tabla sin importar el período pedido.
        let config = null;

        if (periodo) {
            const porPeriodo = await pool.request()
                .input('periodo', sql.VarChar(20), periodo)
                .query(`
                    SELECT TOP 1 cu.id_configuracion, cu.riesgo, cu.verde, cu.amarillo, cu.rojo, cu.id_periodo
                    FROM ConfiguracionUmbral cu
                    INNER JOIN Periodo p ON p.id_periodo = cu.id_periodo
                    WHERE p.periodo = @periodo
                `);
            config = porPeriodo.recordset[0] || null;
        }

        if (!config) {
            const global = await pool.request().query(`
                SELECT TOP 1 id_configuracion, riesgo, verde, amarillo, rojo, id_periodo
                FROM ConfiguracionUmbral
                WHERE id_periodo IS NULL
                ORDER BY id_configuracion DESC
            `);
            config = global.recordset[0] || null;
        }

        if (!config) {
            config = { riesgo: 60.0, verde: 3.2, amarillo: 2.5 };
        }

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error en GET /configuracion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PUT /api/configuracion - Actualizar configuración
// Body esperado: { verde, amarillo, rojo? }
// ============================================================================
router.put('/', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'] || null;
        const { riesgo, verde, amarillo, periodo } = req.body;

        if (verde === undefined || amarillo === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Los campos verde y amarillo son requeridos'
            });
        }

        const pool = await getConnection();

        // Si el request trae un período, resolvemos su id_periodo y el
        // upsert queda acotado a esa fila; si no, se mantiene el comportamiento
        // anterior de una única fila "global" (id_periodo NULL). Antes esto
        // siempre pisaba/creaba una sola fila para toda la universidad sin
        // importar el período, aunque la columna id_periodo ya existía.
        let idPeriodo = null;
        if (periodo) {
            const periodoResult = await pool.request()
                .input('periodo', sql.VarChar(20), periodo)
                .query(`SELECT id_periodo FROM Periodo WHERE periodo = @periodo`);
            if (periodoResult.recordset.length === 0) {
                return res.status(400).json({ success: false, error: `Período "${periodo}" no existe` });
            }
            idPeriodo = periodoResult.recordset[0].id_periodo;
        }

        // "rojo" en el diseño es un texto derivado ("Automático"), no editable desde el form
        const query = `
            IF EXISTS (SELECT 1 FROM ConfiguracionUmbral WHERE id_periodo ${idPeriodo === null ? 'IS NULL' : '= @idPeriodo'})
                UPDATE ConfiguracionUmbral
                SET riesgo = @riesgo,
                    verde = @verde,
                    amarillo = @amarillo,
                    rojo = @rojo
                WHERE id_periodo ${idPeriodo === null ? 'IS NULL' : '= @idPeriodo'}
            ELSE
                INSERT INTO ConfiguracionUmbral (riesgo, verde, amarillo, rojo, id_periodo)
                VALUES (@riesgo, @verde, @amarillo, @rojo, @idPeriodo)
        `;

        const request = pool.request()
            .input('riesgo', sql.Decimal(5, 2), riesgo !== undefined ? riesgo : 60.0)
            .input('verde', sql.Decimal(5, 2), verde)
            .input('amarillo', sql.Decimal(5, 2), amarillo)
            .input('rojo', sql.VarChar(15), 'Automático')
            .input('idPeriodo', sql.Int, idPeriodo);

        await request.query(query);

        await registrarLog(pool, sql, {
            evento: 'UMBRALES_ACTUALIZADOS', usuario, entidad: 'ConfiguracionUmbral', accion: 'UPDATE', periodo,
            descripcion: `Umbrales actualizados${periodo ? ` (período ${periodo})` : ''}: verde=${verde}, amarillo=${amarillo}, riesgo=${riesgo}`
        });

        res.json({ success: true, message: 'Configuración actualizada' });
    } catch (error) {
        console.error('Error en PUT /configuracion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;