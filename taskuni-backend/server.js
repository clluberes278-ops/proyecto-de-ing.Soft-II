// ============================================================================
// SERVIDOR EXPRESS PARA taskUni
// Base de datos: SQL Server (UniversidadDB)
// ============================================================================

const express = require('express');
const mssql = require('mssql');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// NOTA: periodos, configuracion y notas ahora se manejan con routers dedicados
// en ./routes, que ya incluyen JOINs con nombre de estudiante/asignatura y las
// correcciones de tipos (estado bit, resolución de matrícula/código a id).
const periodosRouter = require('./routes/periodos');
const configuracionRouter = require('./routes/configuracion');
const notasRouter = require('./routes/notas');
// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// CONFIGURACIÓN SQL SERVER
// ============================================================================

const config = {
    server: process.env.DB_SERVER,
    authentication: {
        type: 'default',
        options: {
            userName: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        }
    },
    options: {
        database: process.env.DB_DATABASE,
        trustServerCertificate: true,
        enableKeepAlive: true
    }
};

let pool;

async function initializeDatabase() {
    try {
        pool = new mssql.ConnectionPool(config);
        await pool.connect();
        console.log('✅ Conectado a SQL Server (UniversidadDB)');
    } catch (error) {
        console.error('❌ Error conectando a SQL Server:', error);
        process.exit(1);
    }
}

// ============================================================================
// ROUTERS DEDICADOS (periodos, configuracion, notas)
// ============================================================================
app.use('/api/periodos', periodosRouter);
app.use('/api/configuracion', configuracionRouter);
app.use('/api/notas', notasRouter);

// ============================================================================
// RUTAS DE PRUEBA
// ============================================================================

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Servidor taskUni funcionando',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/db-status', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT @@VERSION AS version');
        res.json({
            status: 'Conectado',
            database: process.env.DB_DATABASE,
            server: process.env.DB_SERVER,
            version: result.recordset[0].version
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENDPOINTS PARA ESTUDIANTES
// ============================================================================

// GET /api/estudiantes
app.get('/api/estudiantes', async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT 
                id_estudiante,
                matricula,
                nombre,
                correo,
                id_carrera,
                estado
            FROM Estudiante
            ORDER BY nombre
        `);
        res.json({
            success: true,
            data: result.recordset,
            count: result.recordset.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/estudiantes/:id (por id numérico)
app.get('/api/estudiantes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.request()
            .input('id', mssql.Int, id)
            .query('SELECT id_estudiante, matricula, nombre, correo, id_carrera, estado FROM Estudiante WHERE id_estudiante = @id');
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Estudiante no encontrado' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/estudiantes (crear)
app.post('/api/estudiantes', async (req, res) => {
    try {
        const { matricula, nombre, correo, id_carrera, estado } = req.body;

        if (!matricula || !nombre || !id_carrera) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: matricula, nombre, id_carrera'
            });
        }

        // Convertir id_carrera (que puede ser código) a id numérico
        let carreraId = id_carrera;
        if (isNaN(id_carrera)) {
            // Buscar carrera por código
            const carreraResult = await pool.request()
                .input('codigo', mssql.VarChar(20), id_carrera)
                .query('SELECT id_carrera FROM Carrera WHERE codigo_carrera = @codigo');
            if (carreraResult.recordset.length === 0) {
                return res.status(400).json({ success: false, error: 'Carrera no encontrada' });
            }
            carreraId = carreraResult.recordset[0].id_carrera;
        }

        const result = await pool.request()
            .input('matricula', mssql.VarChar(20), matricula)
            .input('nombre', mssql.VarChar(100), nombre)
            .input('correo', mssql.VarChar(100), correo || null)
            .input('id_carrera', mssql.Int, carreraId)
            .input('estado', mssql.VarChar(15), estado || 'Activo')
            .query(`
                INSERT INTO Estudiante (matricula, nombre, correo, id_carrera, estado)
                VALUES (@matricula, @nombre, @correo, @id_carrera, @estado);
                SELECT SCOPE_IDENTITY() AS id_estudiante;
            `);

        res.status(201).json({
            success: true,
            message: 'Estudiante creado exitosamente',
            id_estudiante: result.recordset[0].id_estudiante
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/estudiantes/:id (actualizar por id numérico)
app.put('/api/estudiantes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo, estado } = req.body;

        const result = await pool.request()
            .input('id', mssql.Int, id)
            .input('nombre', mssql.VarChar(100), nombre)
            .input('correo', mssql.VarChar(100), correo)
            .input('estado', mssql.VarChar(15), estado)
            .query(`
                UPDATE Estudiante
                SET nombre = @nombre, correo = @correo, estado = @estado
                WHERE id_estudiante = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Estudiante no encontrado' });
        }
        res.json({ success: true, message: 'Estudiante actualizado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/estudiantes/matricula/:matricula (eliminar por matrícula)
app.delete('/api/estudiantes/matricula/:matricula', async (req, res) => {
    try {
        const { matricula } = req.params;
        const result = await pool.request()
            .input('matricula', mssql.VarChar(20), matricula)
            .query('DELETE FROM Estudiante WHERE matricula = @matricula');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Estudiante no encontrado' });
        }
        res.json({ success: true, message: 'Estudiante eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENDPOINTS PARA ASIGNATURAS
// ============================================================================

app.get('/api/asignaturas', async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT 
                id_asignatura,
                codigo_asignatura AS codigo,
                nombre_asignatura AS nombre,
                creditos,
                id_pensum,
                estado
            FROM Asignatura
            ORDER BY nombre_asignatura
        `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/asignaturas (crear)
app.post('/api/asignaturas', async (req, res) => {
    try {
        const { codigo, nombre, creditos, estado } = req.body;
        if (!codigo || !nombre || !creditos) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
        }

        const result = await pool.request()
            .input('codigo', mssql.VarChar(20), codigo)
            .input('nombre', mssql.VarChar(100), nombre)
            .input('creditos', mssql.Int, creditos)
            .input('estado', mssql.VarChar(15), estado || 'Activa')
            .query(`
                INSERT INTO Asignatura (codigo_asignatura, nombre_asignatura, creditos, estado)
                VALUES (@codigo, @nombre, @creditos, @estado)
            `);
        res.status(201).json({ success: true, message: 'Asignatura creada' });
    } catch (error) {
        if (error.number === 2627) {
            return res.status(409).json({ success: false, error: 'Ya existe una asignatura con ese código' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENDPOINTS PARA CARRERAS
// ============================================================================

app.get('/api/carreras', async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT 
                id_carrera,
                codigo_carrera AS codigo,
                nombre_carrera AS nombre,
                facultad,
                estado
            FROM Carrera
            ORDER BY nombre_carrera
        `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/carreras', async (req, res) => {
    try {
        const { codigo, nombre, facultad, estado } = req.body;
        if (!codigo || !nombre) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos (codigo, nombre)' });
        }
        await pool.request()
            .input('codigo', mssql.VarChar(20), codigo)
            .input('nombre', mssql.VarChar(100), nombre)
            .input('facultad', mssql.VarChar(100), facultad || null)
            .input('estado', mssql.VarChar(15), estado || 'Activa')
            .query(`
                INSERT INTO Carrera (codigo_carrera, nombre_carrera, facultad, estado)
                VALUES (@codigo, @nombre, @facultad, @estado)
            `);
        res.status(201).json({ success: true, message: 'Carrera creada' });
    } catch (error) {
        if (error.number === 2627) {
            return res.status(409).json({ success: false, error: 'Ya existe una carrera con ese código' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENDPOINTS PARA PROFESORES
// ============================================================================

app.get('/api/profesores', async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT 
                id_profesor,
                codigo_profesor AS codigo,
                nombre,
                correo,
                telefono,
                estado
            FROM Profesor
            ORDER BY nombre
        `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/profesores', async (req, res) => {
    try {
        const { codigo, nombre, correo, telefono, estado } = req.body;
        if (!codigo || !nombre) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos (codigo, nombre)' });
        }
        await pool.request()
            .input('codigo', mssql.VarChar(20), codigo)
            .input('nombre', mssql.VarChar(100), nombre)
            .input('correo', mssql.VarChar(100), correo || null)
            .input('telefono', mssql.VarChar(20), telefono || null)
            .input('estado', mssql.VarChar(15), estado || 'Activo')
            .query(`
                INSERT INTO Profesor (codigo_profesor, nombre, correo, telefono, estado)
                VALUES (@codigo, @nombre, @correo, @telefono, @estado)
            `);
        res.status(201).json({ success: true, message: 'Profesor creado' });
    } catch (error) {
        if (error.number === 2627) {
            return res.status(409).json({ success: false, error: 'Ya existe un profesor con ese código' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENDPOINTS PARA SECCIONES
// ============================================================================

app.get('/api/secciones', async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT 
                s.id_seccion AS id,
                s.numero_seccion AS numero,
                s.id_asignatura,
                s.id_profesor,
                s.id_periodo,
                p.periodo,
                s.estado
            FROM Seccion s
            LEFT JOIN Periodo p ON s.id_periodo = p.id_periodo
            ORDER BY p.periodo, s.id_asignatura, s.numero_seccion
        `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/secciones', async (req, res) => {
    try {
        const { numero, idAsignatura, idProfesor, periodo } = req.body;
        if (!numero || !idAsignatura || !periodo) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
        }

        // Seccion guarda id_periodo (FK), no el texto del periodo, así que lo resolvemos primero
        const periodoResult = await pool.request()
            .input('periodo', mssql.VarChar(20), periodo)
            .query('SELECT id_periodo FROM Periodo WHERE periodo = @periodo');
        if (periodoResult.recordset.length === 0) {
            return res.status(400).json({ success: false, error: 'Periodo no encontrado' });
        }
        const idPeriodo = periodoResult.recordset[0].id_periodo;

        // Los <select> del formulario mandan el código (ej. "INF-101", "PRO-237"),
        // no el id numérico, así que los resolvemos aquí.
        let idAsignaturaNum;
        if (!isNaN(idAsignatura)) {
            idAsignaturaNum = Number(idAsignatura);
        } else {
            const asigResult = await pool.request()
                .input('codigo', mssql.VarChar(20), idAsignatura)
                .query('SELECT id_asignatura FROM Asignatura WHERE codigo_asignatura = @codigo');
            if (asigResult.recordset.length === 0) {
                return res.status(400).json({ success: false, error: `Asignatura no encontrada: ${idAsignatura}` });
            }
            idAsignaturaNum = asigResult.recordset[0].id_asignatura;
        }

        let idProfesorNum = null;
        if (idProfesor) {
            if (!isNaN(idProfesor)) {
                idProfesorNum = Number(idProfesor);
            } else {
                const profResult = await pool.request()
                    .input('codigo', mssql.VarChar(20), idProfesor)
                    .query('SELECT id_profesor FROM Profesor WHERE codigo_profesor = @codigo');
                if (profResult.recordset.length === 0) {
                    return res.status(400).json({ success: false, error: `Profesor no encontrado: ${idProfesor}` });
                }
                idProfesorNum = profResult.recordset[0].id_profesor;
            }
        }

        const result = await pool.request()
            .input('numero', mssql.Int, numero)
            .input('idAsignatura', mssql.Int, idAsignaturaNum)
            .input('idProfesor', mssql.Int, idProfesorNum)
            .input('idPeriodo', mssql.Int, idPeriodo)
            .input('estado', mssql.VarChar(15), 'Activa')
            .query(`
                INSERT INTO Seccion (numero_seccion, id_asignatura, id_profesor, id_periodo, estado)
                VALUES (@numero, @idAsignatura, @idProfesor, @idPeriodo, @estado)
            `);
        res.status(201).json({ success: true, message: 'Sección creada' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENDPOINTS PARA NOTIFICACIONES
// ============================================================================

app.get('/api/notificaciones', async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT 
                id_notificacion,
                id_estudiante,
                asunto,
                mensaje,
                fecha_envio,
                estado
            FROM Notificacion
            ORDER BY fecha_envio DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/notificaciones', async (req, res) => {
    try {
        const { notificaciones } = req.body; // Array
        if (!notificaciones || !Array.isArray(notificaciones) || notificaciones.length === 0) {
            return res.status(400).json({ success: false, error: 'Debe enviar un arreglo de notificaciones' });
        }
        for (const n of notificaciones) {
            const { id_estudiante, asunto, mensaje, fecha_envio, estado } = n;
            await pool.request()
                .input('id_estudiante', mssql.VarChar(20), id_estudiante)
                .input('asunto', mssql.VarChar(200), asunto)
                .input('mensaje', mssql.VarChar(500), mensaje)
                .input('fecha_envio', mssql.Date, fecha_envio || new Date())
                .input('estado', mssql.VarChar(20), estado || 'Enviado')
                .query(`
                    INSERT INTO Notificacion (id_estudiante, asunto, mensaje, fecha_envio, estado)
                    VALUES (@id_estudiante, @asunto, @mensaje, @fecha_envio, @estado)
                `);
        }
        res.json({ success: true, message: `Creadas ${notificaciones.length} notificaciones` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENDPOINTS PARA LOGS (Import/Export)
// ============================================================================

app.get('/api/logs', async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT 
                id_log,
                tipo,
                evento,
                periodo,
                registros,
                archivo,
                fecha
            FROM Log
            ORDER BY fecha DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        // La tabla Log no existe en el script de BD actual.
        // Si quieres persistir logs en la BD, crea la tabla Log y este catch dejará de dispararse.
        // Mientras tanto, no rompemos el dashboard: devolvemos vacío (el frontend ya usa localStorage como respaldo).
        console.warn('⚠️  Tabla Log no encontrada, devolviendo lista vacía:', error.message);
        res.json({ success: true, data: [] });
    }
});

app.post('/api/logs', async (req, res) => {
    try {
        const { tipo, evento, periodo, registros, archivo } = req.body;
        if (!tipo || !evento) {
            return res.status(400).json({ success: false, error: 'Faltan campos' });
        }
        await pool.request()
            .input('tipo', mssql.VarChar(20), tipo)
            .input('evento', mssql.VarChar(50), evento)
            .input('periodo', mssql.VarChar(20), periodo || '')
            .input('registros', mssql.Int, registros || 0)
            .input('archivo', mssql.VarChar(100), archivo || '')
            .input('fecha', mssql.Date, new Date())
            .query(`
                INSERT INTO Log (tipo, evento, periodo, registros, archivo, fecha)
                VALUES (@tipo, @evento, @periodo, @registros, @archivo, @fecha)
            `);
        res.status(201).json({ success: true, message: 'Log registrado' });
    } catch (error) {
        // Igual que en el GET: si la tabla Log no existe todavía, no tumbamos la petición.
        console.warn('⚠️  No se pudo guardar el log en BD (¿existe la tabla Log?):', error.message);
        res.status(200).json({ success: true, message: 'Log no persistido (tabla Log no existe aún)' });
    }
});

// ============================================================================
// ENDPOINTS PARA PENSUM
// ============================================================================

app.get('/api/pensum/:idCarrera', async (req, res) => {
    try {
        const { idCarrera } = req.params;
        // idCarrera puede ser código (CAR-001) o id numérico
        let carreraId = idCarrera;
        if (isNaN(idCarrera)) {
            const carreraResult = await pool.request()
                .input('codigo', mssql.VarChar(20), idCarrera)
                .query('SELECT id_carrera FROM Carrera WHERE codigo_carrera = @codigo');
            if (carreraResult.recordset.length === 0) {
                return res.status(404).json({ success: false, error: 'Carrera no encontrada' });
            }
            carreraId = carreraResult.recordset[0].id_carrera;
        }

        const result = await pool.request()
            .input('idCarrera', mssql.Int, carreraId)
            .query(`
                SELECT 
                    p.id_pensum,
                    p.id_carrera,
                    p.creditos_requeridos,
                    p.estado,
                    a.codigo_asignatura,
                    a.nombre_asignatura,
                    a.creditos
                FROM Pensum p
                INNER JOIN Asignatura a ON p.id_pensum = a.id_pensum
                WHERE p.id_carrera = @idCarrera
                ORDER BY a.nombre_asignatura
            `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// MANEJO DE ERRORES 404 y 500
// ============================================================================

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Error interno' });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

async function start() {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║         🚀 taskUni Backend - Servidor Iniciado        ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`📍 Servidor: http://localhost:${PORT}`);
        console.log(`🗄️  Base de datos: ${process.env.DB_DATABASE}`);
        console.log(`🖥️  Servidor SQL: ${process.env.DB_SERVER}`);
        console.log('');
        console.log('Endpoints disponibles:');
        console.log('  ✅ GET  /api/health');
        console.log('  ✅ GET  /api/db-status');
        console.log('  ✅ GET  /api/estudiantes');
        console.log('  ✅ POST /api/estudiantes');
        console.log('  ✅ DELETE /api/estudiantes/matricula/:matricula');
        console.log('  ✅ GET  /api/asignaturas');
        console.log('  ✅ POST /api/asignaturas');
        console.log('  ✅ GET  /api/carreras');
        console.log('  ✅ GET  /api/profesores');
        console.log('  ✅ GET  /api/periodos');
        console.log('  ✅ POST /api/periodos');
        console.log('  ✅ GET  /api/secciones');
        console.log('  ✅ POST /api/secciones');
        console.log('  ✅ GET  /api/notas');
        console.log('  ✅ POST /api/notas');
        console.log('  ✅ GET  /api/configuracion');
        console.log('  ✅ PUT  /api/configuracion');
        console.log('  ✅ GET  /api/notificaciones');
        console.log('  ✅ POST /api/notificaciones');
        console.log('  ✅ GET  /api/logs');
        console.log('  ✅ POST /api/logs');
        console.log('  ✅ GET  /api/pensum/:idCarrera');
        console.log('');
    });
}

start().catch(error => {
    console.error('Error al iniciar:', error);
    process.exit(1);
});

module.exports = app;