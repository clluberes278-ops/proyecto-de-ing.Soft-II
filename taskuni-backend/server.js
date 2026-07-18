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

// NOTA: las rutas de periodos, configuracion y notas están definidas
// directamente más abajo con app.get/app.post, no se usan routers separados.
// const periodosRouter = require('./routes/periodos');
// const configuracionRouter = require('./routes/configuracion');
// const notasRouter = require('./routes/notas');
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
            .input('id', mssql.VarChar(20), id)
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
            .input('estado', mssql.Bit, estado !== undefined ? estado : 1)
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
            .input('estado', mssql.Bit, estado)
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
                id_profesor AS profesor,
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
        const { codigo, nombre, creditos, profesor, estado } = req.body;
        if (!codigo || !nombre || !creditos) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
        }
        const result = await pool.request()
            .input('codigo', mssql.VarChar(20), codigo)
            .input('nombre', mssql.VarChar(100), nombre)
            .input('creditos', mssql.Int, creditos)
            .input('profesor', mssql.VarChar(20), profesor || null)
            .input('estado', mssql.VarChar(20), estado || 'Activa')
            .query(`
                INSERT INTO Asignatura (codigo_asignatura, nombre_asignatura, creditos, id_profesor, estado)
                VALUES (@codigo, @nombre, @creditos, @profesor, @estado)
            `);
        res.status(201).json({ success: true, message: 'Asignatura creada' });
    } catch (error) {
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

// ============================================================================
// ENDPOINTS PARA PERIODOS
// ============================================================================

app.get('/api/periodos', async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT 
                id_periodo,
                periodo,
                fecha_inicio,
                fecha_fin,
                estado
            FROM Periodo
            ORDER BY fecha_inicio DESC
        `);
        // Transformar a camelCase para el frontend
        const periodos = result.recordset.map(p => ({
            id_periodo: p.id_periodo,
            periodo: p.periodo,
            fechaInicio: p.fecha_inicio,
            fechaFin: p.fecha_fin,
            estado: p.estado
        }));
        res.json({ success: true, data: periodos });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/periodos', async (req, res) => {
    try {
        const { periodo, fechaInicio, fechaFin, estado } = req.body;
        if (!periodo || !fechaInicio || !fechaFin) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
        }
        // Si el nuevo período es Activo, desactivar los demás
        if (estado === 'Activo') {
            await pool.request().query("UPDATE Periodo SET estado = 'Cerrado'");
        }
        await pool.request()
            .input('periodo', mssql.VarChar(20), periodo)
            .input('fechaInicio', mssql.Date, fechaInicio)
            .input('fechaFin', mssql.Date, fechaFin)
            .input('estado', mssql.VarChar(20), estado || 'Activo')
            .query(`
                INSERT INTO Periodo (periodo, fecha_inicio, fecha_fin, estado)
                VALUES (@periodo, @fechaInicio, @fechaFin, @estado)
            `);
        res.status(201).json({ success: true, message: 'Período creado' });
    } catch (error) {
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
                s.numero,
                s.id_asignatura,
                s.id_profesor,
                s.id_periodo,
                p.periodo,
                s.estado
            FROM Seccion s
            LEFT JOIN Periodo p ON s.id_periodo = p.id_periodo
            ORDER BY p.periodo, s.id_asignatura, s.numero
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

        const result = await pool.request()
            .input('numero', mssql.VarChar(10), numero)
            .input('idAsignatura', mssql.VarChar(20), idAsignatura)
            .input('idProfesor', mssql.VarChar(20), idProfesor || null)
            .input('idPeriodo', mssql.Int, idPeriodo)
            .input('estado', mssql.VarChar(20), 'Activa')
            .query(`
                INSERT INTO Seccion (numero, id_asignatura, id_profesor, id_periodo, estado)
                VALUES (@numero, @idAsignatura, @idProfesor, @idPeriodo, @estado)
            `);
        res.status(201).json({ success: true, message: 'Sección creada' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENDPOINTS PARA NOTAS
// ============================================================================

app.get('/api/notas', async (req, res) => {
    try {
        const { estudiante, asignatura, seccion, periodo } = req.query;
        let query = `
            SELECT 
                id_nota,
                id_estudiante,
                id_asignatura,
                id_seccion,
                acum1,
                acum2,
                acum3,
                eval_final,
                nota_final,
                nota_literal,
                estado
            FROM Nota
            WHERE 1=1
        `;
        const params = [];
        if (estudiante) {
            query += ' AND id_estudiante = @estudiante';
            params.push({ name: 'estudiante', type: mssql.VarChar(20), value: estudiante });
        }
        if (asignatura) {
            query += ' AND id_asignatura = @asignatura';
            params.push({ name: 'asignatura', type: mssql.VarChar(20), value: asignatura });
        }
        if (seccion) {
            query += ' AND id_seccion = @seccion';
            params.push({ name: 'seccion', type: mssql.VarChar(20), value: seccion });
        }
        if (periodo) {
            // Seccion guarda id_periodo (FK); unimos con Periodo para filtrar por el texto del periodo
            query += ` AND id_seccion IN (
                SELECT s.id_seccion FROM Seccion s
                INNER JOIN Periodo p ON s.id_periodo = p.id_periodo
                WHERE p.periodo = @periodo
            )`;
            params.push({ name: 'periodo', type: mssql.VarChar(20), value: periodo });
        }

        const request = pool.request();
        params.forEach(p => request.input(p.name, p.type, p.value));
        const result = await request.query(query);

        // Transformar a camelCase para el frontend
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
            literal: n.nota_literal,
            estado: n.estado
        }));

        res.json({ success: true, data: notas });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/notas', async (req, res) => {
    try {
        const { notas } = req.body; // Array de objetos nota
        if (!notas || !Array.isArray(notas) || notas.length === 0) {
            return res.status(400).json({ success: false, error: 'Debe enviar un arreglo de notas' });
        }

        // Procesar cada nota (upsert)
        for (const nota of notas) {
            const { idEstudiante, idAsignatura, idSeccion, acum1, acum2, acum3, evalFinal, notaFinal, literal, estado } = nota;
            // Verificar si ya existe
            const check = await pool.request()
                .input('idEstudiante', mssql.VarChar(20), idEstudiante)
                .input('idAsignatura', mssql.VarChar(20), idAsignatura)
                .query('SELECT id_nota FROM Nota WHERE id_estudiante = @idEstudiante AND id_asignatura = @idAsignatura');

            if (check.recordset.length > 0) {
                // Actualizar
                await pool.request()
                    .input('idEstudiante', mssql.VarChar(20), idEstudiante)
                    .input('idAsignatura', mssql.VarChar(20), idAsignatura)
                    .input('idSeccion', mssql.VarChar(20), idSeccion)
                    .input('acum1', mssql.Float, acum1)
                    .input('acum2', mssql.Float, acum2)
                    .input('acum3', mssql.Float, acum3)
                    .input('evalFinal', mssql.Float, evalFinal)
                    .input('notaFinal', mssql.Float, notaFinal)
                    .input('literal', mssql.VarChar(2), literal)
                    .input('estado', mssql.VarChar(20), estado)
                    .query(`
                        UPDATE Nota SET
                            id_seccion = @idSeccion,
                            acum1 = @acum1,
                            acum2 = @acum2,
                            acum3 = @acum3,
                            eval_final = @evalFinal,
                            nota_final = @notaFinal,
                            nota_literal = @literal,
                            estado = @estado
                        WHERE id_estudiante = @idEstudiante AND id_asignatura = @idAsignatura
                    `);
            } else {
                // Insertar
                await pool.request()
                    .input('idEstudiante', mssql.VarChar(20), idEstudiante)
                    .input('idAsignatura', mssql.VarChar(20), idAsignatura)
                    .input('idSeccion', mssql.VarChar(20), idSeccion)
                    .input('acum1', mssql.Float, acum1)
                    .input('acum2', mssql.Float, acum2)
                    .input('acum3', mssql.Float, acum3)
                    .input('evalFinal', mssql.Float, evalFinal)
                    .input('notaFinal', mssql.Float, notaFinal)
                    .input('literal', mssql.VarChar(2), literal)
                    .input('estado', mssql.VarChar(20), estado)
                    .query(`
                        INSERT INTO Nota (id_estudiante, id_asignatura, id_seccion, acum1, acum2, acum3, eval_final, nota_final, nota_literal, estado)
                        VALUES (@idEstudiante, @idAsignatura, @idSeccion, @acum1, @acum2, @acum3, @evalFinal, @notaFinal, @literal, @estado)
                    `);
            }
        }
        res.json({ success: true, message: `Procesadas ${notas.length} notas` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENDPOINTS PARA CONFIGURACIÓN (umbrales)
// ============================================================================

app.get('/api/configuracion', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT TOP 1 riesgo, verde, amarillo FROM ConfiguracionUmbral ORDER BY id_configuracion');
        if (result.recordset.length === 0) {
            // Valores por defecto
            return res.json({ success: true, data: { riesgo: 60.0, verde: 3.2, amarillo: 2.5 } });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/configuracion', async (req, res) => {
    try {
        const { verde, amarillo } = req.body;
        if (verde === undefined || amarillo === undefined) {
            return res.status(400).json({ success: false, error: 'Faltan campos' });
        }
        await pool.request()
            .input('verde', mssql.Float, verde)
            .input('amarillo', mssql.Float, amarillo)
            .query(`
                IF EXISTS (SELECT 1 FROM ConfiguracionUmbral)
                    UPDATE ConfiguracionUmbral SET verde = @verde, amarillo = @amarillo
                ELSE
                    INSERT INTO ConfiguracionUmbral (riesgo, verde, amarillo) VALUES (60.0, @verde, @amarillo)
            `);
        res.json({ success: true, message: 'Configuración actualizada' });
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
        res.status(500).json({ success: false, error: error.message });
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
        res.status(500).json({ success: false, error: error.message });
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
                    a.creditos,
                    a.id_profesor
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