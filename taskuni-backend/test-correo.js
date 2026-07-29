// ============================================================================
// Prueba aislada del envío de correo, sin tocar la base de datos ni el
// frontend. Sirve para saber si el problema está en el SMTP o en el flujo
// de RPT-04.
//
// Uso:
//   node test-correo.js tu.correo@gmail.com
// ============================================================================

require('dotenv').config();
const mailer = require('./mailer');

(async () => {
    const destino = process.argv[2];

    console.log('');
    console.log('=== Prueba de correo taskUni ===');
    console.log('');

    // Paso 1: ¿están las variables?
    if (!mailer.smtpConfigurado()) {
        console.log('SMTP NO configurado.');
        console.log('Faltan en .env: ' + mailer.faltantes().join(', '));
        console.log('');
        console.log('Mientras falten, RPT-04 registra las alertas como "Simulada"');
        console.log('y no sale ningún correo.');
        process.exit(1);
    }
    console.log('Variables encontradas.');
    console.log(`  Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    console.log(`  User: ${process.env.SMTP_USER}`);
    console.log('');

    // Paso 2: ¿el servidor acepta las credenciales? (no envía nada todavía)
    console.log('Verificando conexión...');
    const estado = await mailer.verificarConexion();
    if (!estado.ok) {
        console.log('FALLÓ la conexión:');
        console.log('  ' + estado.error);
        console.log('');
        console.log('Causas comunes:');
        console.log('  - En Gmail hace falta CONTRASEÑA DE APLICACIÓN, no la normal.');
        console.log('  - Verificación en 2 pasos desactivada en la cuenta.');
        console.log('  - Puerto/host equivocados (Gmail: smtp.gmail.com puerto 587).');
        console.log('  - Firewall o red bloqueando el puerto de salida.');
        process.exit(1);
    }
    console.log('Conexión y credenciales OK.');
    console.log('');

    // Paso 3: envío real
    if (!destino) {
        console.log('Para enviar un correo de prueba, pasa un destinatario:');
        console.log('  node test-correo.js tu.correo@gmail.com');
        process.exit(0);
    }

    console.log(`Enviando correo de prueba a ${destino}...`);
    const resultado = await mailer.enviarCorreo({
        para: destino,
        asunto: 'Alerta Académica: Riesgo Detectado (PRUEBA)',
        mensaje: 'Este es un correo de prueba del sistema taskUni. Si lo estás leyendo, el envío de alertas de RPT-04 está funcionando correctamente.'
    });

    console.log('');
    console.log(`Estado: ${resultado.estado}`);
    console.log(`Detalle: ${resultado.detalle}`);
    console.log('');
    if (resultado.estado === 'Enviada') {
        console.log('Revisa la bandeja de entrada (y la carpeta de spam).');
    }
    process.exit(resultado.estado === 'Enviada' ? 0 : 1);
})();
