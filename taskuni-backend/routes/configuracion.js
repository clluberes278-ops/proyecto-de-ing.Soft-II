const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db'); // ajusta la ruta a tu módulo de conexión

// ============================================================================
// GET /api/configuracion - Obtener configuración (umbrales)
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const pool = await getConnection();

        // ✅ CORRECTO - la tabla real se llama ConfiguracionUmbral, no Configuracion
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
        const { verde, amarillo, rojo } = req.body;

        if (verde === undefined || amarillo === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Los campos verde y amarillo son requeridos'
            });
        }

        const pool = await getConnection();

        // Actualiza la fila existente (ajusta el WHERE si manejas config por periodo)
        const query = `
            UPDATE ConfiguracionUmbral
            SET verde = @verde,
                amarillo = @amarillo
                ${rojo !== undefined ? ', rojo = @rojo' : ''}
        `;

        const request = pool.request()
            .input('verde', sql.Decimal(5, 2), verde)
            .input('amarillo', sql.Decimal(5, 2), amarillo);

        if (rojo !== undefined) {
            request.input('rojo', sql.Decimal(5, 2), rojo);
        }

        await request.query(query);

        res.json({ success: true, message: 'Configuración actualizada' });
    } catch (error) {
        console.error('Error en PUT /configuracion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
