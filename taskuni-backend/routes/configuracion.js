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

        // CORRECTO - la tabla real se llama ConfiguracionUmbral, no Configuracion
        const query = `
            SELECT
                id_configuracion,
                riesgo,
                verde,
                amarillo,
                rojo,
                id_periodo
            FROM ConfiguracionUmbral
        `;

        const result = await pool.request().query(query);

        // Tu frontend (core.js / dashboard.js) espera un solo objeto { riesgo, verde, amarillo }
        // Si hay múltiples filas (una por periodo), devolvemos la más reciente/activa.
        const config = result.recordset[0] || { riesgo: 60.0, verde: 3.2, amarillo: 2.5 };

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
        const { riesgo, verde, amarillo } = req.body;

        if (verde === undefined || amarillo === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Los campos verde y amarillo son requeridos'
            });
        }

        const pool = await getConnection();

        // "rojo" en el diseño es un texto derivado ("Automático"), no editable desde el form
        const query = `
            IF EXISTS (SELECT 1 FROM ConfiguracionUmbral)
                UPDATE ConfiguracionUmbral
                SET riesgo = @riesgo,
                    verde = @verde,
                    amarillo = @amarillo,
                    rojo = @rojo
            ELSE
                INSERT INTO ConfiguracionUmbral (riesgo, verde, amarillo, rojo)
                VALUES (@riesgo, @verde, @amarillo, @rojo)
        `;

        const request = pool.request()
            .input('riesgo', sql.Decimal(5, 2), riesgo !== undefined ? riesgo : 60.0)
            .input('verde', sql.Decimal(5, 2), verde)
            .input('amarillo', sql.Decimal(5, 2), amarillo)
            .input('rojo', sql.VarChar(15), 'Automático');

        await request.query(query);

        await registrarLog(pool, sql, {
            evento: 'UMBRALES_ACTUALIZADOS', usuario, entidad: 'ConfiguracionUmbral', accion: 'UPDATE',
            descripcion: `Umbrales actualizados: verde=${verde}, amarillo=${amarillo}, riesgo=${riesgo}`
        });

        res.json({ success: true, message: 'Configuración actualizada' });
    } catch (error) {
        console.error('Error en PUT /configuracion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;