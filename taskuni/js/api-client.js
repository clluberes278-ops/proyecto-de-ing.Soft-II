// ============================================================================
// API CLIENT - Conectar Frontend con Backend Node.js
// Colocar este archivo en: js/api-client.js
// ============================================================================

/**
 * Cliente API para taskUni
 * 
 * Uso:
 * const estudiantes = await apiClient.getEstudiantes();
 * await apiClient.crearEstudiante({ matricula, nombre, id_carrera });
 */

const apiClient = (() => {
    // URL base del servidor backend
    const API_BASE_URL = 'http://localhost:3000/api';
    const API_BASE_URL_LOCAL = 'http://127.0.0.1:5500/api';

    // Función auxiliar para hacer requests
    async function makeRequest(endpoint, options = {}) {
        try {
            const url = `${API_BASE_URL}${endpoint}`;
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Error ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - ESTUDIANTES
    // ========================================================================

    // ========================================================================
    // MÉTODOS PÚBLICOS - AUTENTICACIÓN
    // ========================================================================

    /**
     * Iniciar sesión
     * @param {string} correo
     * @param {string} password
     * @returns {Promise<Object>} { correo, rol, idReferencia }
     */
    async function login(correo, password) {
        const response = await makeRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ correo, password })
        });
        return response.data;
    }

    /**
     * Crear una cuenta de usuario (uso administrativo)
     * @param {Object} datos { correo, password, rol, idReferencia }
     */
    async function crearUsuario(datos) {
        return await makeRequest('/usuarios', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    }

    /**
     * Obtener todos los estudiantes
     * @returns {Promise<Array>} Lista de estudiantes
     */
    async function getEstudiantes() {
        const response = await makeRequest('/estudiantes');
        return response.data;
    }

    /**
     * Obtener un estudiante por ID
     * @param {number} id - ID del estudiante
     * @returns {Promise<Object>} Datos del estudiante
     */
    async function getEstudiante(id) {
        const response = await makeRequest(`/estudiantes/${id}`);
        return response.data;
    }

    /**
     * Crear nuevo estudiante
     * @param {Object} data - { matricula, nombre, correo, id_carrera }
     * @returns {Promise<Object>} { success, id_estudiante }
     */
    async function crearEstudiante(data) {
        return await makeRequest('/estudiantes', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Actualizar estudiante
     * @param {number} id - ID del estudiante
     * @param {Object} data - { nombre, correo, estado }
     * @returns {Promise<Object>} { success, message }
     */
    async function actualizarEstudiante(id, data) {
        return await makeRequest(`/estudiantes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * Eliminar estudiante
     * @param {number} id - ID del estudiante
     * @returns {Promise<Object>} { success, message }
     */
    async function eliminarEstudiante(id) {
        return await makeRequest(`/estudiantes/matricula/${id}`, {
            method: 'DELETE'
        });
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - ASIGNATURAS
    // ========================================================================

    /**
     * Obtener todas las asignaturas
     * @returns {Promise<Array>} Lista de asignaturas
     */
    async function getAsignaturas() {
        const response = await makeRequest('/asignaturas');
        return response.data;
    }

    /**
     * Crear una nueva asignatura
     * @param {Object} datos { codigo, nombre, creditos, profesor, estado }
     */
    async function crearAsignatura(datos) {
        const response = await makeRequest('/asignaturas', { method: 'POST', body: JSON.stringify(datos) });
        return response;
    }

    async function eliminarAsignatura(codigo) {
        return await makeRequest(`/asignaturas/${codigo}`, {
            method: 'DELETE'
        });
    }

    /**
     * Obtener asignaturas de un pensum
     * @param {number} idPensum - ID del pensum
     * @returns {Promise<Array>} Asignaturas del pensum
     */
    async function getAsignaturasDelPensum(idPensum) {
        const response = await makeRequest(`/asignaturas/pensum/${idPensum}`);
        return response.data;
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - CARRERAS
    // ========================================================================

    /**
     * Obtener todas las carreras
     * @returns {Promise<Array>} Lista de carreras
     */
    async function getCarreras() {
        const response = await makeRequest('/carreras');
        return response.data;
    }

    /**
     * Crear una nueva carrera
     * @param {Object} datos { codigo, nombre, facultad, estado }
     */
    async function crearCarrera(datos) {
        const response = await makeRequest('/carreras', { method: 'POST', body: JSON.stringify(datos) });
        return response;
    }

    async function getFacultades() {
        const response = await makeRequest('/facultades');
        return response.data;
    }

    async function crearFacultad(datos) {
        const response = await makeRequest('/facultades', { method: 'POST', body: JSON.stringify(datos) });
        return response;
    }

    async function eliminarFacultad(codigo) {
        const response = await makeRequest(`/facultades/${codigo}`, { method: 'DELETE' });
        return response;
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - PROFESORES
    // ========================================================================

    /**
     * Obtener todos los profesores
     * @returns {Promise<Array>} Lista de profesores
     */
    async function getProfesores() {
        const response = await makeRequest('/profesores');
        return response.data;
    }

    /**
     * Crear un nuevo profesor
     * @param {Object} datos { codigo, nombre, correo, telefono, estado }
     */
    async function crearProfesor(datos) {
        const response = await makeRequest('/profesores', { method: 'POST', body: JSON.stringify(datos) });
        return response;
    }

    /**
     * Eliminar un profesor por código
     * @param {string} codigo - Código del profesor (ej: PRO-001)
     * @returns {Promise<Object>} { success, message }
     */
    async function eliminarProfesor(codigo) {
        return await makeRequest(`/profesores/${codigo}`, { method: 'DELETE' });
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - PENSA
    // ========================================================================

    /**
     * Obtener todos los pensa
     * @returns {Promise<Array>} Lista de pensa
     */
    async function getPensa() {
        const response = await makeRequest('/pensa');
        return response.data;
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - ESTADO DEL SERVIDOR
    // ========================================================================

    /**
     * Verificar estado del servidor
     * @returns {Promise<Object>} { status, message }
     */
    async function health() {
        return await makeRequest('/health');
    }

    /**
     * Verificar estado de la BD
     * @returns {Promise<Object>} { status, database, version }
     */
    async function dbStatus() {
        return await makeRequest('/db-status');
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - PERIODOS
    // ========================================================================

    /**
     * Obtener todos los periodos
     * @returns {Promise<Array>} Lista de periodos
     */
    async function getPeriodos() {
        const response = await makeRequest('/periodos');
        return response.data;
    }

    /**
     * Crear nuevo periodo
     * @param {Object} data - { periodo, cuatrimestre, fechaInicio, fechaFin, estado }
     * @returns {Promise<Object>}
     */
    async function createPeriodo(data) {
        return await makeRequest('/periodos', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - SECCIONES
    // ========================================================================

    /**
     * Obtener todas las secciones
     * @returns {Promise<Array>}
     */
    async function getSecciones() {
        const response = await makeRequest('/secciones');
        return response.data;
    }

    /**
     * Crear nueva sección
     * @param {Object} data - { numero, idAsignatura, idProfesor, periodo }
     * @returns {Promise<Object>}
     */
    async function createSeccion(data) {
        return await makeRequest('/secciones', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async function eliminarSeccion(id) {
        return await makeRequest(`/secciones/${id}`, {
            method: 'DELETE'
        });
    }

    async function getEstudiantesDeSeccion(idSeccion) {
        const response = await makeRequest(`/secciones/${idSeccion}/estudiantes`);
        return response.data;
    }

    async function matricularEstudiantes(idSeccion, estudiantes) {
        return await makeRequest(`/secciones/${idSeccion}/estudiantes`, {
            method: 'POST',
            body: JSON.stringify({ estudiantes })
        });
    }

    async function desmatricularEstudiante(idSeccion, idEstudiante) {
        return await makeRequest(`/secciones/${idSeccion}/estudiantes/${idEstudiante}`, {
            method: 'DELETE'
        });
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - NOTAS / CALIFICACIONES
    // ========================================================================

    /**
     * Obtener todas las notas (con filtros opcionales)
     * @param {Object} filtros - { periodo, asignatura, seccion, estudiante }
     * @returns {Promise<Array>}
     */
    async function getNotas(filtros = {}) {
        const query = new URLSearchParams(filtros).toString();
        const response = await makeRequest(`/notas${query ? '?' + query : ''}`);
        return response.data;
    }

    /**
     * Guardar/actualizar notas de un acta
     * @param {Array} notas - Arreglo de objetos nota
     * @returns {Promise<Object>}
     */
    async function saveNotas(notas) {
        return await makeRequest('/notas', {
            method: 'POST',
            body: JSON.stringify({ notas })
        });
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - CONFIGURACIÓN
    // ========================================================================

    /**
     * Obtener configuración (umbrales)
     * @returns {Promise<Object>} { riesgo, verde, amarillo }
     */
    async function getConfiguracion() {
        const response = await makeRequest('/configuracion');
        return response.data;
    }

    /**
     * Actualizar configuración
     * @param {Object} data - { verde, amarillo }
     * @returns {Promise<Object>}
     */
    async function updateConfiguracion(data) {
        return await makeRequest('/configuracion', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - NOTIFICACIONES
    // ========================================================================

    /**
     * Obtener todas las notificaciones
     * @returns {Promise<Array>}
     */
    async function getNotificaciones() {
        const response = await makeRequest('/notificaciones');
        return response.data;
    }

    /**
     * Crear notificaciones masivas
     * @param {Array} notificaciones - Arreglo de objetos notificación
     * @returns {Promise<Object>}
     */
    async function crearNotificaciones(notificaciones) {
        return await makeRequest('/notificaciones', {
            method: 'POST',
            body: JSON.stringify({ notificaciones })
        });
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - LOGS (Import/Export)
    // ========================================================================

    /**
     * Obtener logs de importación/exportación
     * @returns {Promise<Array>}
     */
    async function getLogs() {
        const response = await makeRequest('/logs');
        return response.data;
    }

    /**
     * Registrar un log manualmente
     * @param {Object} data - { tipo, evento, periodo, registros, archivo }
     * @returns {Promise<Object>}
     */
    async function registrarLog(data) {
        return await makeRequest('/logs', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS - PENSUM
    // ========================================================================

    /**
     * Obtener pensum de una carrera
     * @param {string} idCarrera - Código de carrera
     * @returns {Promise<Array>}
     */
    async function getPensum(idCarrera) {
        const response = await makeRequest(`/pensum/${idCarrera}`);
        return response.data;
    }

    /**
    * Obtener el pensum y asignaturas específicas asignadas a un estudiante por su ID o Matrícula
    * @param {number|string} idOrMatricula 
    * @returns {Promise<Object>} { estudiante, asignaturas }
    */
    async function getPensumPorEstudiante(idOrMatricula) {
        const response = await makeRequest(`/estudiantes/${idOrMatricula}/pensum`);
        return response.data;
    }

    // ========================================================================
    // EXPORTAR API PÚBLICA
    // ========================================================================

    return {
        // Autenticación
        login,
        crearUsuario,

        // Estudiantes
        getEstudiantes,
        getEstudiante,
        crearEstudiante,
        actualizarEstudiante,
        eliminarEstudiante,
        getSecciones,
        createSeccion,
        eliminarSeccion,
        getEstudiantesDeSeccion,
        matricularEstudiantes,
        desmatricularEstudiante,

        // Asignaturas
        getAsignaturas,
        crearAsignatura,
        eliminarAsignatura,
        getAsignaturasDelPensum,

        // Carreras
        getCarreras,
        crearCarrera,

        // Facultades
        getFacultades,
        crearFacultad,
        eliminarFacultad,

        // Profesores
        getProfesores,
        crearProfesor,
        eliminarProfesor,

        // Pensa
        getPensa,

        // Estado
        health,
        dbStatus,
        // Periodos
        getPeriodos,
        createPeriodo,
        // Secciones
        getSecciones,
        createSeccion,
        eliminarSeccion,
        // Notas
        getNotas,
        saveNotas,
        // Configuración
        getConfiguracion,
        updateConfiguracion,
        // Notificaciones
        getNotificaciones,
        crearNotificaciones,
        // Logs
        registrarLog,
        getPensum,
        getPensumPorEstudiante,
    };
})();

// ============================================================================
// EJEMPLOS DE USO
// ============================================================================

/*
// Ejemplo 1: Obtener todos los estudiantes
async function verEstudiantes() {
  try {
    const estudiantes = await apiClient.getEstudiantes();
    console.log('Estudiantes:', estudiantes);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Ejemplo 2: Crear un nuevo estudiante
async function crearNuevoEstudiante() {
  try {
    const result = await apiClient.crearEstudiante({
      matricula: '2024001',
      nombre: 'Juan Pérez',
      correo: 'juan@unphu.edu.do',
      id_carrera: 1
    });
    console.log('Estudiante creado:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Ejemplo 3: Verificar conexión con la BD
async function verificarConexion() {
  try {
    const status = await apiClient.dbStatus();
    console.log('Estado de la BD:', status);
  } catch (error) {
    console.error('No hay conexión con la BD:', error.message);
  }
}

// Usar: verEstudiantes();
*/