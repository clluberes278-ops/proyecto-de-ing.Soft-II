// ============================================================================
// api-client.js - Cliente para conectar frontend con backend Express
// Colocar en: taskuni/js/api-client.js
// ============================================================================

const API_BASE_URL = 'http://localhost:3000/api';
const API_BASE_URL_LOCAL = 'http://127.0.0.1:5500/api';

// Helper para manejar respuestas
async function handleResponse(res) {
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || `Error ${res.status}: ${res.statusText}`);
    }
    return res.json();
}

// ============================
// ESTUDIANTES
// ============================

export async function getEstudiantes() {
    const res = await fetch(`${API_BASE_URL}/estudiantes`);
    const data = await handleResponse(res);
    return data.data;
}

export async function crearEstudiante(data) {
    const res = await fetch(`${API_BASE_URL}/estudiantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(res);
}

export async function eliminarEstudiante(matricula) {
    const res = await fetch(`${API_BASE_URL}/estudiantes/matricula/${matricula}`, {
        method: 'DELETE'
    });
    return handleResponse(res);
}

// ============================
// ASIGNATURAS
// ============================

export async function getAsignaturas() {
    const res = await fetch(`${API_BASE_URL}/asignaturas`);
    const data = await handleResponse(res);
    return data.data;
}

export async function crearAsignatura(data) {
    const res = await fetch(`${API_BASE_URL}/asignaturas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(res);
}

// ============================
// CARRERAS
// ============================

export async function getCarreras() {
    const res = await fetch(`${API_BASE_URL}/carreras`);
    const data = await handleResponse(res);
    return data.data;
}

// ============================
// PROFESORES
// ============================

export async function getProfesores() {
    const res = await fetch(`${API_BASE_URL}/profesores`);
    const data = await handleResponse(res);
    return data.data;
}

// ============================
// PERIODOS
// ============================

export async function getPeriodos() {
    const res = await fetch(`${API_BASE_URL}/periodos`);
    const data = await handleResponse(res);
    return data.data;
}

export async function createPeriodo(data) {
    const res = await fetch(`${API_BASE_URL}/periodos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(res);
}

// ============================
// SECCIONES
// ============================

export async function getSecciones() {
    const res = await fetch(`${API_BASE_URL}/secciones`);
    const data = await handleResponse(res);
    return data.data;
}

export async function createSeccion(data) {
    const res = await fetch(`${API_BASE_URL}/secciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(res);
}

// ============================
// NOTAS
// ============================

export async function getNotas(filtros = {}) {
    const query = new URLSearchParams(filtros).toString();
    const url = `${API_BASE_URL}/notas${query ? '?' + query : ''}`;
    const res = await fetch(url);
    const data = await handleResponse(res);
    return data.data;
}

export async function saveNotas(notas) {
    const res = await fetch(`${API_BASE_URL}/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas })
    });
    return handleResponse(res);
}

// ============================
// CONFIGURACIÓN (umbrales)
// ============================

export async function getConfiguracion() {
    const res = await fetch(`${API_BASE_URL}/configuracion`);
    const data = await handleResponse(res);
    return data.data;
}

export async function updateConfiguracion(data) {
    const res = await fetch(`${API_BASE_URL}/configuracion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(res);
}

// ============================
// NOTIFICACIONES
// ============================

export async function getNotificaciones() {
    const res = await fetch(`${API_BASE_URL}/notificaciones`);
    const data = await handleResponse(res);
    return data.data;
}

export async function crearNotificaciones(notificaciones) {
    const res = await fetch(`${API_BASE_URL}/notificaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificaciones })
    });
    return handleResponse(res);
}

// ============================
// LOGS
// ============================

export async function getLogs() {
    const res = await fetch(`${API_BASE_URL}/logs`);
    const data = await handleResponse(res);
    return data.data;
}

export async function registrarLog(data) {
    const res = await fetch(`${API_BASE_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(res);
}

// ============================
// PENSUM
// ============================

export async function getPensum(idCarrera) {
    const res = await fetch(`${API_BASE_URL}/pensum/${idCarrera}`);
    const data = await handleResponse(res);
    return data.data;
}

// ============================
// HEALTH / ESTADO
// ============================

export async function health() {
    const res = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(res);
}

export async function dbStatus() {
    const res = await fetch(`${API_BASE_URL}/db-status`);
    return handleResponse(res);
}