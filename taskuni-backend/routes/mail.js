const express = require('express');
const router = express.Router();
const mailer = require('../mailer');

// ============================================================================
// GET /api/mail/estado - Estado de la configuración SMTP
//
// No toca la base de datos, así que no usa db.js. El frontend lo consulta para
// saber si puede prometer un envío real (RPT-04) o si las alertas quedarán
// solamente registradas como "Simulada".
// ============================================================================
router.get('/estado', async (req, res) => {
    try {
        const estado = await mailer.verificarConexion();
        res.json({ success: true, data: estado });
    } catch (error) {
        console.error('Error en GET /mail/estado:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
