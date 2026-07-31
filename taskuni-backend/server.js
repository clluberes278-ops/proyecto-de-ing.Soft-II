// ============================================================================
// SERVIDOR EXPRESS PARA taskUni
// Base de datos: SQL Server (UniversidadDB)
// ============================================================================

const express = require('express');
const mssql = require('mssql');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
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
const mailRouter = require('./routes/mail'); // NUEVO
const mantenimientoPensumRouter = require('./routes/mantenimiento-pensum'); // NUEVO

// Envío de correo para las alertas de RPT-04. Si el .env no trae credenciales
// SMTP, el módulo entra en modo simulación en vez de romper el endpoint.
const mailer = require('./mailer');

// Bitácora de actividad (dbo.Log): CRUD + import/export, ver log-helper.js.
const { registrarLog } = require('./log-helper');
// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Usuario');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir el frontend (carpeta taskuni) como archivos estáticos
app.use(express.static(path.join(__dirname, '..', 'taskuni')));

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
        console.log('[OK] Conectado a SQL Server (UniversidadDB)');
    } catch (error) {
        console.error('[ERROR] Error conectando a SQL Server:', error);
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
app.use('/api/mail', mailRouter); // NUEVO
app.use('/api/mantenimiento-pensum', mantenimientoPensumRouter); // NUEVO
// ============================================================================
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
        const usuarioActor = req.headers['x-usuario'] || null;
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

        await registrarLog(pool, mssql, {
            evento: 'USUARIO_CREADO', usuario: usuarioActor, entidad: 'Usuario', accion: 'CREATE',
            descripcion: `Cuenta ${correo} creada con rol ${rol}`
        });

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
        const usuarioActor = req.headers['x-usuario'] || null;
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

        // Convertir id_carrera (que puede ser código o id numérico) y validar que exista
        let carreraId;
        if (isNaN(id_carrera)) {
            const carreraResult = await pool.request()
                .input('codigo', mssql.VarChar(20), id_carrera)
                .query('SELECT id_carrera FROM Carrera WHERE codigo_carrera = @codigo');
            if (carreraResult.recordset.length === 0) {
                return res.status(400).json({ success: false, error: 'Carrera no encontrada' });
            }
            carreraId = carreraResult.recordset[0].id_carrera;
        } else {
            const carreraExist = await pool.request()
                .input('idCarrera', mssql.Int, Number(id_carrera))
                .query('SELECT 1 AS existe FROM Carrera WHERE id_carrera = @idCarrera');
            if (carreraExist.recordset.length === 0) {
                return res.status(400).json({ success: false, error: `Carrera con id ${id_carrera} no existe` });
            }
            carreraId = Number(id_carrera);
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

        await registrarLog(pool, mssql, {
            evento: 'ESTUDIANTE_CREADO', usuario: usuarioActor, entidad: 'Estudiante', accion: 'CREATE',
            descripcion: `Estudiante ${matricula} (${nombre}) creado`
        });

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
        const usuarioActor = req.headers['x-usuario'] || null;
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

        await registrarLog(pool, mssql, {
            evento: 'ESTUDIANTE_ACTUALIZADO', usuario: usuarioActor, entidad: 'Estudiante', accion: 'UPDATE',
            descripcion: `Estudiante id ${id} actualizado`
        });

        res.json({ success: true, message: 'Estudiante actualizado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/estudiantes/matricula/:matricula (eliminar por matrícula)
app.delete('/api/estudiantes/matricula/:matricula', async (req, res) => {
    try {
        const usuarioActor = req.headers['x-usuario'] || null;
        const { matricula } = req.params;
        const result = await pool.request()
            .input('matricula', mssql.VarChar(20), matricula)
            .query('DELETE FROM Estudiante WHERE matricula = @matricula');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Estudiante no encontrado' });
        }

        await registrarLog(pool, mssql, {
            evento: 'ESTUDIANTE_ELIMINADO', usuario: usuarioActor, entidad: 'Estudiante', accion: 'DELETE',
            descripcion: `Estudiante ${matricula} eliminado`
        });

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
        // Filtro opcional: ?idProfesor=X (o ?idProfesor=codigo) restringe a las
        // asignaturas que ese profesor imparte. Lo usa el RPT-11 del rol maestro
        // para que solo vea las materias a su cargo.
        const { idProfesor } = req.query;
        let whereProfesor = '';
        const reqAsig = pool.request();
        if (idProfesor !== undefined && idProfesor !== null && idProfesor !== '') {
            // Resolver id_profesor (acepta id numérico o código_profesor).
            let idProf = null;
            if (!isNaN(idProfesor)) {
                idProf = Number(idProfesor);
            } else {
                const profResult = await pool.request()
                    .input('codigo', mssql.VarChar(20), idProfesor)
                    .query('SELECT id_profesor FROM Profesor WHERE codigo_profesor = @codigo');
                if (profResult.recordset.length > 0) {
                    idProf = profResult.recordset[0].id_profesor;
                }
            }
            if (idProf !== null) {
                reqAsig.input('idProf', mssql.Int, idProf);
                // La relación real profesor-asignatura vive en Seccion.id_profesor
                // (quién imparte esa materia en qué período), no en Asignatura.id_profesor,
                // que en la práctica queda sin poblar. Se incluye también a.id_profesor
                // por si en el futuro se usa como "dueño" de la asignatura.
                whereProfesor = `WHERE a.id_profesor = @idProf OR a.id_asignatura IN (
                    SELECT s.id_asignatura FROM Seccion s WHERE s.id_profesor = @idProf
                )`;
            }
        }

        const result = await reqAsig.query(`
            SELECT
                a.id_asignatura,
                a.codigo_asignatura AS codigo,
                a.nombre_asignatura AS nombre,
                a.creditos,
                a.id_pensum,
                a.id_profesor,
                pr.codigo_profesor AS profesorCodigo,
                -- La relación real profesor-asignatura vive en Seccion.id_profesor;
                -- Asignatura.id_profesor casi nunca está poblado. Se prioriza el
                -- "dueño" de la asignatura si existe y si no se agregan los
                -- profesores que la imparten en alguna sección (pueden ser varios).
                COALESCE(pr.nombre, sec.profesoresSeccion) AS profesorNombre,
                sec.profesoresSeccion,
                c.id_carrera,
                c.nombre_carrera AS carreraNombre,
                a.estado
            FROM Asignatura a
            LEFT JOIN Pensum p ON a.id_pensum = p.id_pensum
            LEFT JOIN Carrera c ON p.id_carrera = c.id_carrera
            LEFT JOIN Profesor pr ON a.id_profesor = pr.id_profesor
            OUTER APPLY (
                SELECT STUFF((
                    SELECT DISTINCT ', ' + pr2.nombre
                    FROM Seccion s2
                    JOIN Profesor pr2 ON pr2.id_profesor = s2.id_profesor
                    WHERE s2.id_asignatura = a.id_asignatura
                    FOR XML PATH(''), TYPE
                ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS profesoresSeccion
            ) sec
            ${whereProfesor}
            ORDER BY a.nombre_asignatura
        `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bitácora de MantenimientoPensum (tabla del diagrama ER): registra cada vez
// que cambia Asignatura.id_pensum (agregar/quitar/actualizar). Se traga sus
// propios errores para no romper el flujo de crear/editar asignaturas si el
// schema de sql/schema.sql todavía no corrió contra la BD.
async function registrarMantenimientoPensum(idPensum, idAsignatura, tipoCambio, descripcion, usuario) {
    try {
        await pool.request()
            .input('id_pensum', mssql.Int, idPensum)
            .input('id_asignatura', mssql.Int, idAsignatura)
            .input('tipo_cambio', mssql.VarChar(30), tipoCambio)
            .input('descripcion', mssql.VarChar(100), descripcion)
            .input('usuario', mssql.VarChar(30), usuario || null)
            .query(`
                INSERT INTO MantenimientoPensum (id_pensum, id_asignatura, tipo_cambio, descripcion, usuario)
                VALUES (@id_pensum, @id_asignatura, @tipo_cambio, @descripcion, @usuario)
            `);
    } catch (error) {
        console.warn('[MantenimientoPensum] No se pudo registrar el cambio (¿corriste sql/mantenimiento_pensum.sql?):', error.message);
    }
}

app.post('/api/asignaturas', async (req, res) => {
    try {
        const { codigo, nombre, creditos, estado, id_profesor, id_pensum, id_carrera, usuario: usuarioBody } = req.body;
        const usuario = usuarioBody || req.headers['x-usuario'] || null;
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
                OUTPUT INSERTED.id_asignatura
                VALUES (@codigo, @nombre, @creditos, @estado, @id_profesor, @id_pensum)
            `);

        if (targetPensumId) {
            const nuevoIdAsignatura = result.recordset[0].id_asignatura;
            await registrarMantenimientoPensum(
                targetPensumId,
                nuevoIdAsignatura,
                'Agregar',
                `Asignatura ${codigo} agregada al pensum`,
                usuario
            );
        }

        await registrarLog(pool, mssql, {
            evento: 'ASIGNATURA_CREADA', usuario, entidad: 'Asignatura', accion: 'CREATE',
            descripcion: `Asignatura ${codigo} (${nombre}) creada`
        });

        res.status(201).json({ success: true, message: 'Asignatura creada' });
    } catch (error) {
        if (error.number === 2627) {
            return res.status(409).json({ success: false, error: 'Ya existe una asignatura con ese código' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/asignaturas/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const { nombre, creditos, estado, id_profesor, id_pensum, id_carrera, usuario: usuarioBody } = req.body;
        const usuario = usuarioBody || req.headers['x-usuario'] || null;

        if (!nombre || !creditos) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
        }

        // Capturamos el id_pensum previo para saber si esta edición
        // agrega/quita/actualiza la asignatura de un pensum (bitácora).
        const previaResult = await pool.request()
            .input('codigo', mssql.VarChar(20), codigo)
            .query('SELECT id_asignatura, id_pensum FROM Asignatura WHERE codigo_asignatura = @codigo');

        if (previaResult.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Asignatura no encontrada' });
        }
        const idAsignatura = previaResult.recordset[0].id_asignatura;
        const idPensumPrevio = previaResult.recordset[0].id_pensum;

        let targetPensumId = id_pensum || null;

        if (!targetPensumId && id_carrera) {
            const idCarrera = Number(id_carrera);
            const pensumResult = await pool.request()
                .input('idCarrera', mssql.Int, idCarrera)
                .query("SELECT id_pensum FROM Pensum WHERE id_carrera = @idCarrera AND estado = 'Activo'");

            if (pensumResult.recordset.length > 0) {
                targetPensumId = pensumResult.recordset[0].id_pensum;
            } else {
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
                UPDATE Asignatura
                SET nombre_asignatura = @nombre,
                    creditos = @creditos,
                    estado = @estado,
                    id_profesor = @id_profesor,
                    id_pensum = @id_pensum
                WHERE codigo_asignatura = @codigo
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Asignatura no encontrada' });
        }

        const pensumViejo = idPensumPrevio || null;
        const pensumNuevo = targetPensumId || null;
        if (pensumViejo !== pensumNuevo) {
            let tipoCambio, descripcion, idPensumParaLog;
            if (!pensumViejo && pensumNuevo) {
                tipoCambio = 'Agregar';
                descripcion = `Asignatura ${codigo} agregada al pensum`;
                idPensumParaLog = pensumNuevo;
            } else if (pensumViejo && !pensumNuevo) {
                tipoCambio = 'Quitar';
                descripcion = `Asignatura ${codigo} quitada del pensum`;
                idPensumParaLog = pensumViejo;
            } else {
                tipoCambio = 'Actualizar';
                descripcion = `Asignatura ${codigo} movida a otro pensum`;
                idPensumParaLog = pensumNuevo;
            }
            await registrarMantenimientoPensum(idPensumParaLog, idAsignatura, tipoCambio, descripcion, usuario);
        }

        await registrarLog(pool, mssql, {
            evento: 'ASIGNATURA_ACTUALIZADA', usuario, entidad: 'Asignatura', accion: 'UPDATE',
            descripcion: `Asignatura ${codigo} actualizada`
        });

        res.json({ success: true, message: 'Asignatura actualizada' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/asignaturas/:codigo', async (req, res) => {
    try {
        const usuarioActor = req.headers['x-usuario'] || null;
        const { codigo } = req.params;
        const result = await pool.request()
            .input('codigo', mssql.VarChar(20), codigo)
            .query('DELETE FROM Asignatura WHERE codigo_asignatura = @codigo');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Asignatura no encontrada' });
        }

        await registrarLog(pool, mssql, {
            evento: 'ASIGNATURA_ELIMINADA', usuario: usuarioActor, entidad: 'Asignatura', accion: 'DELETE',
            descripcion: `Asignatura ${codigo} eliminada`
        });

        res.json({ success: true, message: 'Asignatura eliminada' });
    } catch (error) {
        if (error.number === 547) {
            return res.status(409).json({ success: false, error: 'No se puede eliminar: esta asignatura tiene secciones, notas o historial de pensum asociados' });
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
        const usuarioActor = req.headers['x-usuario'] || null;
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

        await registrarLog(pool, mssql, {
            evento: 'PROFESOR_CREADO', usuario: usuarioActor, entidad: 'Profesor', accion: 'CREATE',
            descripcion: `Profesor ${codigo} (${nombre}) creado`
        });

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
        const usuarioActor = req.headers['x-usuario'] || null;
        const { codigo } = req.params;
        await pool.request()
            .input('codigo', mssql.VarChar(20), codigo)
            .query('DELETE FROM Profesor WHERE codigo_profesor = @codigo');

        await registrarLog(pool, mssql, {
            evento: 'PROFESOR_ELIMINADO', usuario: usuarioActor, entidad: 'Profesor', accion: 'DELETE',
            descripcion: `Profesor ${codigo} eliminado`
        });

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
        // Se unen Pensum y Carrera a través de la asignatura para que el frontend
        // pueda filtrar las secciones por carrera del estudiante (sin esto un
        // estudiante de contabilidad vería secciones de sistemas, etc.).
        const result = await pool.request().query(`
            SELECT
                s.id_seccion AS id,
                s.numero_seccion AS numero,
                s.id_asignatura,
                a.codigo_asignatura AS codigoAsignatura,
                a.nombre_asignatura AS nombreAsignatura,
                a.id_pensum,
                p.id_carrera AS idCarrera,
                c.codigo_carrera AS codigoCarrera,
                c.nombre_carrera AS nombreCarrera,
                s.id_profesor,
                pr.codigo_profesor AS codigoProfesor,
                pr.nombre AS nombreProfesor,
                s.id_periodo,
                per.periodo,
                s.estado
            FROM Seccion s
            LEFT JOIN Asignatura a ON s.id_asignatura = a.id_asignatura
            LEFT JOIN Pensum p ON a.id_pensum = p.id_pensum
            LEFT JOIN Carrera c ON p.id_carrera = c.id_carrera
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
        const usuarioActor = req.headers['x-usuario'] || null;
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

        await registrarLog(pool, mssql, {
            evento: 'SECCION_CREADA', usuario: usuarioActor, entidad: 'Seccion', accion: 'CREATE',
            descripcion: `Sección ${numero} creada para asignatura ${idAsignatura} (periodo ${periodo})`
        });

        res.status(201).json({ success: true, message: 'Sección creada' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/secciones/:id', async (req, res) => {
    try {
        const usuarioActor = req.headers['x-usuario'] || null;
        const { id } = req.params;
        const { numero, idAsignatura, idProfesor, periodo } = req.body;
        if (!numero || !idAsignatura || !periodo) {
            return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
        }

        const periodoResult = await pool.request()
            .input('periodo', mssql.VarChar(20), periodo)
            .query('SELECT id_periodo FROM Periodo WHERE periodo = @periodo');
        if (periodoResult.recordset.length === 0) {
            return res.status(400).json({ success: false, error: 'Periodo no encontrado' });
        }
        const idPeriodo = periodoResult.recordset[0].id_periodo;

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
            .input('id', mssql.Int, id)
            .input('numero', mssql.Int, numero)
            .input('idAsignatura', mssql.Int, idAsignaturaNum)
            .input('idProfesor', mssql.Int, idProfesorNum)
            .input('idPeriodo', mssql.Int, idPeriodo)
            .query(`
                UPDATE Seccion
                SET numero_seccion = @numero,
                    id_asignatura = @idAsignatura,
                    id_profesor = @idProfesor,
                    id_periodo = @idPeriodo
                WHERE id_seccion = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Sección no encontrada' });
        }

        await registrarLog(pool, mssql, {
            evento: 'SECCION_ACTUALIZADA', usuario: usuarioActor, entidad: 'Seccion', accion: 'UPDATE',
            descripcion: `Sección id ${id} actualizada`
        });

        res.json({ success: true, message: 'Sección actualizada' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/secciones/:id', async (req, res) => {
    try {
        const usuarioActor = req.headers['x-usuario'] || null;
        const { id } = req.params;
        const result = await pool.request()
            .input('id', mssql.Int, id)
            .query('DELETE FROM Seccion WHERE id_seccion = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Sección no encontrada' });
        }

        await registrarLog(pool, mssql, {
            evento: 'SECCION_ELIMINADA', usuario: usuarioActor, entidad: 'Seccion', accion: 'DELETE',
            descripcion: `Sección id ${id} eliminada`
        });

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

// Crea notificaciones e intenta enviarlas por correo. El estado guardado
// refleja el resultado real del envío ('Enviada' / 'Fallida' / 'Simulada'),
// no un 'Enviado' optimista como antes. La fila se inserta SIEMPRE, incluso si
// el correo falla, para no perder el rastro de a quién falta avisarle.
app.post('/api/notificaciones', async (req, res) => {
    try {
        const usuarioActor = req.headers['x-usuario'] || null;
        const { notificaciones } = req.body; // Array
        if (!notificaciones || !Array.isArray(notificaciones) || notificaciones.length === 0) {
            return res.status(400).json({ success: false, error: 'Debe enviar un arreglo de notificaciones' });
        }

        const resultados = [];
        for (const n of notificaciones) {
            const { id_estudiante, asunto, mensaje, fecha_envio } = n;
            if (!id_estudiante) {
                return res.status(400).json({ success: false, error: 'Cada notificación requiere id_estudiante' });
            }
            // Resolver matrícula o id numérico al id_estudiante real (la columna
            // es INT) y de paso traer el correo, que hace falta para enviar.
            let idEst;
            let correoEst = null;
            if (!isNaN(id_estudiante)) {
                idEst = Number(id_estudiante);
                const r = await pool.request()
                    .input('id', mssql.Int, idEst)
                    .query('SELECT correo FROM Estudiante WHERE id_estudiante = @id');
                if (r.recordset.length === 0) {
                    return res.status(404).json({ success: false, error: `Estudiante no encontrado: ${id_estudiante}` });
                }
                correoEst = r.recordset[0].correo;
            } else {
                const r = await pool.request()
                    .input('matricula', mssql.VarChar(20), id_estudiante)
                    .query('SELECT id_estudiante, correo FROM Estudiante WHERE matricula = @matricula');
                if (r.recordset.length === 0) {
                    return res.status(404).json({ success: false, error: `Estudiante no encontrado: ${id_estudiante}` });
                }
                idEst = r.recordset[0].id_estudiante;
                correoEst = r.recordset[0].correo;
            }

            // enviarCorreo() nunca lanza: devuelve el estado a registrar.
            const envio = await mailer.enviarCorreo({
                para: correoEst,
                asunto,
                mensaje
            });

            await pool.request()
                .input('id_estudiante', mssql.Int, idEst)
                .input('asunto', mssql.VarChar(200), asunto)
                .input('mensaje', mssql.VarChar(500), mensaje)
                .input('fecha_envio', mssql.Date, fecha_envio || new Date())
                .input('estado', mssql.VarChar(20), envio.estado)
                .query(`
                    INSERT INTO Notificacion (id_estudiante, asunto, mensaje, fecha_envio, estado)
                    VALUES (@id_estudiante, @asunto, @mensaje, @fecha_envio, @estado)
                `);

            resultados.push({
                id_estudiante: idEst,
                correo: correoEst,
                estado: envio.estado,
                detalle: envio.detalle
            });
        }

        const contar = (e) => resultados.filter(r => r.estado === e).length;
        const resumen = {
            enviadas: contar('Enviada'),
            fallidas: contar('Fallida'),
            simuladas: contar('Simulada')
        };

        await registrarLog(pool, mssql, {
            evento: 'NOTIFICACIONES_ENVIADAS', usuario: usuarioActor, entidad: 'Notificacion', accion: 'CREATE',
            registros: resultados.length,
            descripcion: `${resultados.length} notificación(es) procesadas (${resumen.enviadas} enviadas, ${resumen.fallidas} fallidas, ${resumen.simuladas} simuladas)`
        });

        res.json({
            success: true,
            message: `Registradas ${resultados.length} notificaciones`,
            smtpConfigurado: mailer.smtpConfigurado(),
            resumen,
            resultados
        });
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
                usuario,
                entidad,
                accion,
                descripcion,
                periodo,
                registros,
                archivo,
                fecha
            FROM Log
            ORDER BY fecha DESC
        `);
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        // Tolera tanto la tabla Log ausente como las columnas nuevas
        // (usuario/entidad/accion/descripcion) si el ALTER TABLE no ha corrido
        // todavía. Mientras tanto, no rompemos el dashboard: devolvemos vacío.
        console.warn('[WARN] No se pudo leer Log (¿existe la tabla y sus columnas nuevas?):', error.message);
        res.json({ success: true, data: [] });
    }
});

app.post('/api/logs', async (req, res) => {
    try {
        const { tipo, evento, periodo, registros, archivo, entidad, accion, descripcion, usuario: usuarioBody } = req.body;
        if (!evento) {
            return res.status(400).json({ success: false, error: 'Falta el campo evento' });
        }
        const usuario = usuarioBody || req.headers['x-usuario'] || null;
        await registrarLog(pool, mssql, { tipo, evento, usuario, entidad, accion, descripcion, periodo, registros, archivo });
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

    // Avisar temprano del estado del SMTP: es mejor enterarse aquí que cuando
    // alguien pulse "enviar alertas" en RPT-04.
    const estadoMail = await mailer.verificarConexion();
    if (!estadoMail.configurado) {
        console.warn(`[mailer] SMTP no configurado (faltan: ${estadoMail.faltantes.join(', ')}). Las alertas se registrarán como 'Simulada'.`);
    } else if (!estadoMail.ok) {
        console.warn(`[mailer] SMTP configurado pero la conexión falló: ${estadoMail.error}`);
    } else {
        console.log(`[mailer] SMTP listo (${process.env.SMTP_HOST}:${process.env.SMTP_PORT}).`);
    }

    app.listen(PORT, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║         taskUni Backend - Servidor Iniciado           ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`Servidor: http://localhost:${PORT}`);
        console.log(`Base de datos: ${process.env.DB_DATABASE}`);
        console.log(`Servidor SQL: ${process.env.DB_SERVER}`);
        console.log('');
        console.log('Endpoints disponibles:');
        console.log('  [GET]    /api/health');
        console.log('  [GET]    /api/db-status');
        console.log('  [GET]    /api/estudiantes');
        console.log('  [POST]   /api/estudiantes');
        console.log('  [DELETE] /api/estudiantes/matricula/:matricula');
        console.log('  [GET]    /api/asignaturas');
        console.log('  [POST]   /api/asignaturas');
        console.log('  [GET]    /api/carreras');
        console.log('  [GET]    /api/profesores');
        console.log('  [GET]    /api/periodos');
        console.log('  [POST]   /api/periodos');
        console.log('  [GET]    /api/secciones');
        console.log('  [POST]   /api/secciones');
        console.log('  [GET]    /api/notas');
        console.log('  [POST]   /api/notas');
        console.log('  [GET]    /api/configuracion');
        console.log('  [PUT]    /api/configuracion');
        console.log('  [GET]    /api/notificaciones');
        console.log('  [POST]   /api/notificaciones');
        console.log('  [GET]    /api/mail/estado');
        console.log('  [GET]    /api/logs');
        console.log('  [POST]   /api/logs');
        console.log('  [GET]    /api/pensum/:idCarrera');
        console.log('');
    });
}

start().catch(error => {
    console.error('Error al iniciar:', error);
    process.exit(1);
});

module.exports = app;