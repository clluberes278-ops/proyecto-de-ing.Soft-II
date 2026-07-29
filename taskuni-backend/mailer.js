// ============================================================================
// mailer.js — envío de correo para las alertas académicas (RPT-04)
//
// El SMTP se configura por .env. Si falta cualquiera de las variables
// obligatorias, el módulo NO falla: entra en "modo simulación", registra en
// consola lo que habría enviado y lo reporta como simulado. Así el proyecto
// sigue corriendo en una máquina sin credenciales (por ejemplo, al clonarlo
// para una demo) sin romper el endpoint de notificaciones.
//
// Variables reconocidas:
//   SMTP_HOST    host del servidor (ej. smtp.gmail.com)
//   SMTP_PORT    puerto (587 STARTTLS por defecto, 465 SSL)
//   SMTP_USER    usuario/cuenta
//   SMTP_PASS    contraseña (en Gmail: contraseña de aplicación, no la normal)
//   SMTP_SECURE  "true" fuerza SSL; si se omite se deduce del puerto (465)
//   SMTP_FROM    remitente visible (por defecto: "taskUni UNPHU <SMTP_USER>")
// ============================================================================

const nodemailer = require('nodemailer');

const REQUERIDAS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

function faltantes() {
    return REQUERIDAS.filter(v => !process.env[v] || String(process.env[v]).trim() === '');
}

function smtpConfigurado() {
    return faltantes().length === 0;
}

let transporterCache = null;

function getTransporter() {
    if (!smtpConfigurado()) return null;
    if (transporterCache) return transporterCache;

    const port = Number(process.env.SMTP_PORT);
    // SMTP_SECURE manda si está definido; si no, 465 es SSL implícito y el
    // resto (587, 25) usa STARTTLS.
    const secure = process.env.SMTP_SECURE !== undefined
        ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
        : port === 465;

    transporterCache = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    return transporterCache;
}

function remitente() {
    return process.env.SMTP_FROM || `taskUni UNPHU <${process.env.SMTP_USER}>`;
}

// Si SMTP_USER no es una dirección completa y no se definió SMTP_FROM, el
// remitente queda malformado y el servidor responde "Bad sender address
// syntax", que no le dice nada a nadie. Mejor detectarlo aquí.
function remitenteInvalido() {
    if (process.env.SMTP_FROM) return null;
    const user = String(process.env.SMTP_USER || '');
    if (!user.includes('@')) {
        return `SMTP_USER ("${user}") no es una dirección de correo completa. Define SMTP_FROM en el .env o usa el correo completo como SMTP_USER.`;
    }
    return null;
}

/**
 * Verifica la conexión SMTP sin enviar nada. Útil al arrancar el servidor
 * para avisar temprano si las credenciales están mal.
 * @returns {Promise<{configurado: boolean, ok: boolean, error?: string, faltantes?: string[]}>}
 */
async function verificarConexion() {
    if (!smtpConfigurado()) {
        return { configurado: false, ok: false, faltantes: faltantes() };
    }
    const malRemitente = remitenteInvalido();
    if (malRemitente) {
        return { configurado: true, ok: false, error: malRemitente };
    }
    try {
        await getTransporter().verify();
        return { configurado: true, ok: true };
    } catch (error) {
        return { configurado: true, ok: false, error: error.message };
    }
}

/**
 * Envía un correo. Nunca lanza: siempre resuelve con el resultado, porque el
 * llamador necesita registrar la notificación en la bitácora pase lo que pase.
 *
 * @param {{para: string, asunto: string, mensaje: string}} datos
 * @returns {Promise<{estado: 'Enviada'|'Fallida'|'Simulada', detalle: string}>}
 */
async function enviarCorreo({ para, asunto, mensaje }) {
    if (!para || String(para).trim() === '') {
        return { estado: 'Fallida', detalle: 'El estudiante no tiene correo registrado' };
    }

    if (!smtpConfigurado()) {
        console.log(`[mailer] SIMULADO -> ${para} | ${asunto}`);
        return {
            estado: 'Simulada',
            detalle: `SMTP no configurado (faltan: ${faltantes().join(', ')})`
        };
    }

    const malRemitente = remitenteInvalido();
    if (malRemitente) {
        return { estado: 'Fallida', detalle: malRemitente };
    }

    try {
        const info = await getTransporter().sendMail({
            from: remitente(),
            to: para,
            subject: asunto,
            text: mensaje,
            html: plantillaHTML(asunto, mensaje)
        });
        return { estado: 'Enviada', detalle: info.messageId || 'enviado' };
    } catch (error) {
        console.error(`[mailer] Error enviando a ${para}:`, error.message);
        return { estado: 'Fallida', detalle: error.message };
    }
}

// Plantilla mínima; el texto plano va aparte para clientes que no rendericen HTML.
function plantillaHTML(asunto, mensaje) {
    return `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
            <div style="background: #0f766e; color: #ffffff; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                <h2 style="margin: 0; font-size: 18px;">taskUni · UNPHU</h2>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                <h3 style="margin: 0 0 12px; font-size: 16px; color: #0f172a;">${asunto}</h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155;">${mensaje}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                    Mensaje automático del sistema de gestión académica. No responda a este correo.
                </p>
            </div>
        </div>
    `;
}

module.exports = {
    enviarCorreo,
    verificarConexion,
    smtpConfigurado,
    faltantes
};
