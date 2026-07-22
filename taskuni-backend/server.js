// ============================================================================
// SERVIDOR EXPRESS PARA taskUni
// Base de datos: SQL Server (UniversidadDB)
// ============================================================================

const express = require('express');
const mssql = require('mssql');
const bcrypt = require('bcryptjs');
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
const facultadesRouter = require('./routes/facultades');
const seccionesEstudiantesRouter = require('./routes/secciones-estudiantes');   // NUEVO
const carrerasRouter = require('./routes/carreras'); // NUEVO
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
app.use('/api/facultades', facultadesRouter);
app.use('/api/secciones', seccionesEstudiantesRouter);
app.use('/api/carreras', carrerasRouter); // NUEVO
// ============================================================================
// ENDPOINTS DE AUTENTICACIÓN
// ============================================================================

app.post('/api/login', async (req, res) => {
    try {
        const { correo, password } = req.body;
        if (!correo || !password) {
            return res.status(400).json({ success: false, error: 'Correo y contraseña son requeridos' });
        }

        const result = await pool.request()
            .input('correo', mssql.VarChar(100), correo.toLowerCase().trim())
            .query('SELECT id_usuario, correo, password_hash, rol, id_referencia, estado FROM Usuario WHERE correo = @correo');

        if (result.recordset.length === 0) {
            return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos' });
        }

        const usuario = result.recordset[0];

        if (usuario.estado !== 'Activo') {
            return res.status(403).json({ success: false, error: 'Esta cuenta está inactiva' });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos' });
        }

        res.json({
            success: true,
            data: {
                correo: usuario.correo,
                rol: usuario.rol,
                idReferencia: usuario.id_referencia
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear cuenta (uso administrativo: el panel de admin la usa para dar de alta usuarios)
app.post('/api/usuarios', async (req, res) => {
    try {
        const { correo, password, rol, idReferencia } = req.body;
        if (!correo || !password || !rol) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos (correo, password, rol)' });
        }
        if (!['admin', 'maestro', 'estudiante'].includes(rol)) {
            return res.status(400).json({ success: false, error: 'Rol inválido' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const hash = await bcrypt.hash(password, 10);

        await pool.request()
            .input('correo', mssql.VarChar(100), correo.toLowerCase().trim())
            .input('hash', mssql.VarChar(255), hash)
            .input('rol', mssql.VarChar(20), rol)
            .input('idReferencia', mssql.Int, idReferencia || null)
            .query(`
                INSERT INTO Usuario (correo, password_hash, rol, id_referencia, estado)
                VALUES (@correo, @hash, @rol, @idReferencia, 'Activo')
            `);

        res.status(201).json({ success: true, message: 'Cuenta creada' });
    } catch (error) {
        if (error.number === 2627) {
            return res.status(409).json({ success: false, error: 'Ya existe una cuenta con ese correo' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

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
                e.id_estudiante,
                e.matricula,
                e.nombre,
                e.correo,
                e.id_carrera,
                c.codigo_carrera AS carreraCodigo,
                c.nombre_carrera AS carreraNombre,
                e.estado
            FROM Estudiante e
            LEFT JOIN Carrera c ON e.id_carrera = c.id_carrera
            ORDER BY e.nombre
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
// Acepta crearCuenta=true + password para crear también la cuenta de acceso
// (Usuario con rol 'estudiante' y id_referencia = id_estudiante recién creado).
// Si crearCuenta=true, todo se hace en una transacción: si algo falla, no se guarda nada.
app.post('/api/estudiantes', async (req, res) => {
    try {
        const { matricula, nombre, correo, id_carrera, estado, crearCuenta, password } = req.body;

        if (!matricula || !nombre || !id_carrera) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: matricula, nombre, id_carrera'
            });
        }

        // Si pidió crear cuenta, validar
        if (crearCuenta) {
            if (!correo) {
                return res.status(400).json({ success: false, error: 'Para crear cuenta de acceso se requiere correo' });
            }
            if (!password || password.length < 6) {
                return res.status(400).json({ success: false, error: 'Para crear cuenta de acceso se requiere password (mín. 6 caracteres)' });
            }
        }

        // Convertir id_carrera (que puede ser código) a id numérico
        let carreraId = id_carrera;
        if (isNaN(id_carrera)) {
            const carreraResult = await pool.request()
                .input('codigo', mssql.VarChar(20), id_carrera)
                .query('SELECT id_carrera FROM Carrera WHERE codigo_carrera = @codigo');
            if (carreraResult.recordset.length === 0) {
                return res.status(400).json({ success: false, error: 'Carrera no encontrada' });
            }
            carreraId = carreraResult.recordset[0].id_carrera;
        }

        // ==== Transacción: Estudiante + (opcional) Usuario ====
        const transaction = pool.transaction();
        await transaction.begin();

        let idEstudiante;
        try {
            const resultEst = await transaction.request()
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
            idEstudiante = resultEst.recordset[0].id_estudiante;

            if (crearCuenta) {
                // Verificar que el correo no exista ya en Usuario
                const existeUsuario = await transaction.request()
                    .input('correoUser', mssql.VarChar(100), correo.toLowerCase().trim())
                    .query('SELECT id_usuario FROM Usuario WHERE correo = @correoUser');
                if (existeUsuario.recordset.length > 0) {
                    throw new Error('Ya existe un usuario con ese correo');
                }
                const hash = await bcrypt.hash(password, 10);
                await transaction.request()
                    .input('correoUser', mssql.VarChar(100), correo.toLowerCase().trim())
                    .input('hash', mssql.VarChar(255), hash)
                    .input('idRef', mssql.Int, idEstudiante)
                    .query(`
                        INSERT INTO Usuario (correo, password_hash, rol, id_referencia, estado)
                        VALUES (@correoUser, @hash, 'estudiante', @idRef, 'Activo')
                    `);
            }

            await transaction.commit();
        } catch (e) {
            await transaction.rollback();
            throw e;
        }

        res.status(201).json({
            success: true,
            message: crearCuenta
                ? 'Estudiante y cuenta de acceso creados correctamente'
                : 'Estudiante creado exitosamente',
            id_estudiante: idEstudiante,
            cuenta_creada: !!crearCuenta,
            login: crearCuenta ? correo.toLowerCase().trim() : undefined
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
                a.id_asignatura,
                a.codigo_asignatura AS codigo,
                a.nombre_asignatura AS nombre,
                a.creditos,
                a.id_pensum,
                c.nombre_carrera AS carreraNombre,
                a.estado
            FROM Asignatura a
            LEFT JOIN Pensum p ON a.id_pensum = p.id_pensum
            LEFT JOIN Carrera c ON p.id_carrera = c.id_carrera
            ORDER BY a.nombre_asignatura
        `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/asignaturas', async (req, res) => {
    try {
        const { codigo, nombre, creditos, estado, id_profesor, id_pensum, id_carrera } = req.body;
        if (!codigo || !nombre || !creditos) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
        }

        let targetPensumId = id_pensum || null;

        if (!targetPensumId && id_carrera) {
            const idCarrera = Number(id_carrera);
            // Buscar pensum activo de la carrera
            const pensumResult = await pool.request()
                .input('idCarrera', mssql.Int, idCarrera)
                .query("SELECT id_pensum FROM Pensum WHERE id_carrera = @idCarrera AND estado = 'Activo'");
            
            if (pensumResult.recordset.length > 0) {
                targetPensumId = pensumResult.recordset[0].id_pensum;
            } else {
                // Crear un pensum activo para esta carrera por defecto
                const insertPensum = await pool.request()
                    .input('idCarrera', mssql.Int, idCarrera)
                    .query("INSERT INTO Pensum (id_carrera, creditos_requeridos, estado) VALUES (@idCarrera, 160, 'Activo'); SELECT SCOPE_IDENTITY() AS id_pensum;");
                targetPensumId = insertPensum.recordset[0].id_pensum;
            }
        }

        const result = await pool.request()
            .input('codigo', mssql.VarChar(20), codigo)
            .input('nombre', mssql.VarChar(100), nombre)
            .input('creditos', mssql.Int, creditos)
            .input('estado', mssql.VarChar(15), estado || 'Activa')
            .input('id_profesor', mssql.Int, id_profesor || null)
            .input('id_pensum', mssql.Int, targetPensumId)
            .query(`
                INSERT INTO Asignatura (codigo_asignatura, nombre_asignatura, creditos, estado, id_profesor, id_pensum)
                VALUES (@codigo, @nombre, @creditos, @estado, @id_profesor, @id_pensum)
            `);
        res.status(201).json({ success: true, message: 'Asignatura creada' });
    } catch (error) {
        if (error.number === 2627) {
            return res.status(409).json({ success: false, error: 'Ya existe una asignatura con ese código' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/asignaturas/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const result = await pool.request()
            .input('codigo', mssql.VarChar(20), codigo)
            .query('DELETE FROM Asignatura WHERE codigo_asignatura = @codigo');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Asignatura no encontrada' });
        }
        res.json({ success: true, message: 'Asignatura eliminada' });
    } catch (error) {
        if (error.number === 547) {
            return res.status(409).json({ success: false, error: 'No se puede eliminar: esta asignatura tiene secciones o notas asociadas' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/estudiantes/:idOrMatricula/pensum
// Obtiene la carrera, facultad, pensum y asignaturas correspondientes al estudiante
app.get('/api/estudiantes/:idOrMatricula/pensum', async (req, res) => {
    try {
        const { idOrMatricula } = req.params;

        // 1. Obtener estudiante y datos de su carrera
        const queryEstudiante = `
            SELECT 
                e.id_estudiante,
                e.matricula,
                e.nombre AS estudianteNombre,
                c.id_carrera,
                c.codigo_carrera,
                c.nombre_carrera,
                c.facultad
            FROM Estudiante e
            INNER JOIN Carrera c ON e.id_carrera = c.id_carrera
            WHERE e.id_estudiante = @idParam OR e.matricula = @matriculaParam
        `;

        const requestEst = pool.request();
        if (!isNaN(idOrMatricula)) {
            requestEst.input('idParam', mssql.Int, Number(idOrMatricula));
            requestEst.input('matriculaParam', mssql.VarChar(20), idOrMatricula);
        } else {
            requestEst.input('idParam', mssql.Int, -1);
            requestEst.input('matriculaParam', mssql.VarChar(20), idOrMatricula);
        }

        const resEst = await requestEst.query(queryEstudiante);
        if (resEst.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Estudiante o carrera no encontrados' });
        }

        const estudiante = resEst.recordset[0];

        // 2. Obtener el pensum activo y las asignaturas pertenecientes a esa carrera
        const resAsignaturas = await pool.request()
            .input('idCarrera', mssql.Int, estudiante.id_carrera)
            .query(`
                SELECT 
                    p.id_pensum,
                    p.creditos_requeridos,
                    a.id_asignatura,
                    a.codigo_asignatura AS codigo,
                    a.nombre_asignatura AS nombre,
                    a.creditos,
                    a.estado
                FROM Pensum p
                INNER JOIN Asignatura a ON p.id_pensum = a.id_pensum
                WHERE p.id_carrera = @idCarrera AND p.estado = 'Activo'
                ORDER BY a.codigo_asignatura
            `);

        res.json({
            success: true,
            data: {
                estudiante: {
                    id: estudiante.id_estudiante,
                    matricula: estudiante.matricula,
                    nombre: estudiante.estudianteNombre,
                    carrera: {
                        id: estudiante.id_carrera,
                        codigo: estudiante.codigo_carrera,
                        nombre: estudiante.nombre_carrera,
                        facultad: estudiante.facultad
                    }
                },
                asignaturas: resAsignaturas.recordset
            }
        });
    } catch (error) {
        console.error('Error en GET /estudiantes/:idOrMatricula/pensum:', error);
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

// POST /api/profesores (crear)
// Acepta crearCuenta=true + password para crear también la cuenta de acceso
// (Usuario con rol 'maestro' y id_referencia = id_profesor recién creado).
// Si crearCuenta=true, todo se hace en una transacción: si algo falla, no se guarda nada.
app.post('/api/profesores', async (req, res) => {
    try {
        const { codigo, nombre, correo, telefono, estado, crearCuenta, password } = req.body;
        if (!codigo || !nombre) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos (codigo, nombre)' });
        }
        if (crearCuenta) {
            if (!correo) {
                return res.status(400).json({ success: false, error: 'Para crear cuenta de acceso se requiere correo' });
            }
            if (!password || password.length < 6) {
                return res.status(400).json({ success: false, error: 'Para crear cuenta de acceso se requiere password (mín. 6 caracteres)' });
            }
        }

        // ==== Transacción: Profesor + (opcional) Usuario ====
        const transaction = pool.transaction();
        await transaction.begin();

        let idProfesor;
        try {
            const resultProf = await transaction.request()
                .input('codigo', mssql.VarChar(20), codigo)
                .input('nombre', mssql.VarChar(100), nombre)
                .input('correo', mssql.VarChar(100), correo || null)
                .input('telefono', mssql.VarChar(20), telefono || null)
                .input('estado', mssql.VarChar(15), estado || 'Activo')
                .query(`
                    INSERT INTO Profesor (codigo_profesor, nombre, correo, telefono, estado)
                    VALUES (@codigo, @nombre, @correo, @telefono, @estado);
                    SELECT SCOPE_IDENTITY() AS id_profesor;
                `);
            idProfesor = resultProf.recordset[0].id_profesor;

            if (crearCuenta) {
                const existeUsuario = await transaction.request()
                    .input('correoUser', mssql.VarChar(100), correo.toLowerCase().trim())
                    .query('SELECT id_usuario FROM Usuario WHERE correo = @correoUser');
                if (existeUsuario.recordset.length > 0) {
                    throw new Error('Ya existe un usuario con ese correo');
                }
                const hash = await bcrypt.hash(password, 10);
                await transaction.request()
                    .input('correoUser', mssql.VarChar(100), correo.toLowerCase().trim())
                    .input('hash', mssql.VarChar(255), hash)
                    .input('idRef', mssql.Int, idProfesor)
                    .query(`
                        INSERT INTO Usuario (correo, password_hash, rol, id_referencia, estado)
                        VALUES (@correoUser, @hash, 'maestro', @idRef, 'Activo')
                    `);
            }

            await transaction.commit();
        } catch (e) {
            await transaction.rollback();
            throw e;
        }

        res.status(201).json({
            success: true,
            message: crearCuenta
                ? 'Profesor y cuenta de acceso creados correctamente'
                : 'Profesor creado',
            id_profesor: idProfesor,
            cuenta_creada: !!crearCuenta,
            login: crearCuenta ? correo.toLowerCase().trim() : undefined
        });
    } catch (error) {
        if (error.number === 2627) {
            return res.status(409).json({ success: false, error: 'Ya existe un profesor con ese código' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/profesores/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        await pool.request()
            .input('codigo', mssql.VarChar(20), codigo)
            .query('DELETE FROM Profesor WHERE codigo_profesor = @codigo');
        res.json({ success: true, message: 'Profesor eliminado' });
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
                s.numero_seccion AS numero,
                s.id_asignatura,
                a.codigo_asignatura AS codigoAsignatura,
                a.nombre_asignatura AS nombreAsignatura,
                s.id_profesor,
                pr.codigo_profesor AS codigoProfesor,
                pr.nombre AS nombreProfesor,
                s.id_periodo,
                per.periodo,
                s.estado
            FROM Seccion s
            LEFT JOIN Asignatura a ON s.id_asignatura = a.id_asignatura
            LEFT JOIN Profesor pr ON s.id_profesor = pr.id_profesor
            LEFT JOIN Periodo per ON s.id_periodo = per.id_periodo
            ORDER BY per.periodo, a.codigo_asignatura, s.numero_seccion
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

app.delete('/api/secciones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.request()
            .input('id', mssql.Int, id)
            .query('DELETE FROM Seccion WHERE id_seccion = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Sección no encontrada' });
        }
        res.json({ success: true, message: 'Sección eliminada' });
    } catch (error) {
        if (error.number === 547) {
            return res.status(409).json({ success: false, error: 'No se puede eliminar: esta sección tiene notas asociadas' });
        }
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