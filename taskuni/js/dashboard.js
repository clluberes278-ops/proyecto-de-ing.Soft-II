// ============ ESTADO Y VARIABLES GLOBALES ============
let currentUser = null;
let selectedStudentIndex = '';
let activeFilter = { periodo: '', asignatura: '', seccion: '', estudiante: '' };

// ============ SIDEBAR RESPONSIVE ============
function openSidebar() {
  document.getElementById('sidebar').classList.add('sidebar-open');
  document.getElementById('sidebar-overlay').classList.add('overlay-visible');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('sidebar-open');
  document.getElementById('sidebar-overlay').classList.remove('overlay-visible');
  document.body.style.overflow = '';
}

function closeSidebarOnMobile() {
  if (window.innerWidth < 768) closeSidebar();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSidebar();
});

// ============ MODO OSCURO ============
const toggleBtn = document.getElementById('dark-mode-toggle');
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');

if (localStorage.getItem('dark_mode') === 'enabled') {
  document.body.classList.add('dark-mode');
  sunIcon.classList.remove('hidden');
  moonIcon.classList.add('hidden');
}

toggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('dark_mode', isDark ? 'enabled' : 'disabled');
  sunIcon.classList.toggle('hidden', !isDark);
  moonIcon.classList.toggle('hidden', isDark);
});

// ============ TOAST ============
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800';
  const icon = type === 'success'
    ? `<span class="material-symbols-outlined text-emerald-600">check_circle</span>`
    : `<span class="material-symbols-outlined text-rose-600">warning</span>`;

  toast.className = `toast-anim flex items-center gap-3 p-4 border rounded-xl shadow-lg ${bgColor} bg-white`;
  toast.innerHTML = `
    ${icon}
    <span class="text-xs font-semibold">${message}</span>
    <button class="ml-auto text-slate-400 hover:text-slate-600 focus:outline-none" onclick="this.parentElement.remove()">
      <span class="material-symbols-outlined text-sm">close</span>
    </button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'scale(0.9)';
    toast.style.transition = 'all 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ============ EXPORTACIONES ============
function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Guardar log local (opcional)
  let logs = JSON.parse(localStorage.getItem('import_export_logs') || '[]');
  logs.unshift({
    id_log: 'LOG-' + Math.floor(Math.random() * 10000),
    tipo: 'EXPORTACIÓN',
    evento: 'EXPORTACION_COMPLETADA',
    periodo: 'desconocido',
    registros: csvContent.split('\n').length - 1,
    archivo: filename,
    fecha: new Date().toISOString().split('T')[0]
  });
  localStorage.setItem('import_export_logs', JSON.stringify(logs));
}

function downloadJSON(filename, jsonObject) {
  const blob = new Blob([JSON.stringify(jsonObject, null, 2)], { type: 'application/json' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  let logs = JSON.parse(localStorage.getItem('import_export_logs') || '[]');
  logs.unshift({
    id_log: 'LOG-' + Math.floor(Math.random() * 10000),
    tipo: 'EXPORTACIÓN',
    evento: 'EXPORTACION_COMPLETADA',
    periodo: 'desconocido',
    registros: 1,
    archivo: filename,
    fecha: new Date().toISOString().split('T')[0]
  });
  localStorage.setItem('import_export_logs', JSON.stringify(logs));
}

// ============ REINICIO (desactivado) ============
function confirmarReiniciarBase() {
  showToast('El reinicio de la base de datos debe hacerse desde el backend.', 'error');
}

// ============ CÁLCULOS ============
function calcularLiteralYEstado(notaFinal) {
  let literal = 'F';
  if (notaFinal >= 90) literal = 'A';
  else if (notaFinal >= 80) literal = 'B';
  else if (notaFinal >= 70) literal = 'C';
  else if (notaFinal >= 60) literal = 'D';
  const estado = notaFinal >= 60 ? 'Aprobado' : 'Reprobado';
  return { literal, estado };
}

function literalAPuntos(literal) {
  switch (literal) {
    case 'A': return 4.0;
    case 'B': return 3.0;
    case 'C': return 2.0;
    case 'D': return 1.0;
    default: return 0.0;
  }
}

function calcularIndiceEstudiante(matricula, notas, asignaturas) {
  const notasEst = notas.filter(n => n.matriculaEstudiante === matricula);
  if (notasEst.length === 0) return 0.0;
  let totalPts = 0, totalCred = 0;
  notasEst.forEach(nota => {
    const asig = asignaturas.find(a => a.id_asignatura === nota.idAsignatura);
    const creditos = asig ? asig.creditos : 0;
    const pts = literalAPuntos(nota.literal);
    totalPts += pts * creditos;
    totalCred += creditos;
  });
  return totalCred > 0 ? totalPts / totalCred : 0.0;
}

function obtenerEstadoSemaforo(indice, config) {
  if (indice >= config.verde) return { label: 'Verde (Alto)', color: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50' };
  if (indice >= config.amarillo) return { label: 'Amarillo (Alerta)', color: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-200', bg: 'bg-amber-50' };
  return { label: 'Rojo (Riesgo)', color: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-200', bg: 'bg-rose-50' };
}

// Devuelve el set de matrículas de los estudiantes inscritos en secciones
// que imparte el maestro autenticado (por id_profesor === currentUser.idReferencia).
// Se usa para acotar reportes (semáforo, alertas de riesgo) a sus propias
// materias en lugar de mostrar la población completa de estudiantes.
// Devuelve null si no aplica (no es maestro), para que el llamador sepa que
// no debe filtrar.
async function obtenerMatriculasEstudiantesDeMaestro() {
  if (!currentUser || currentUser.rol !== 'maestro' || !currentUser.idReferencia) return null;
  const secciones = await apiClient.getSecciones();
  const misSecciones = secciones.filter(s => s.id_profesor === currentUser.idReferencia);
  const listas = await Promise.all(misSecciones.map(s => apiClient.getEstudiantesDeSeccion(s.id)));
  const matriculas = new Set();
  listas.forEach(lista => (lista || []).forEach(e => matriculas.add(e.matricula)));
  return matriculas;
}

// ============ VISTAS Y RENDERIZADO ============
const contenedor = document.getElementById('contenedor-modulo');
const tituloModulo = document.getElementById('titulo-modulo');

async function renderView(viewName) {
  document.querySelectorAll('.menu-item').forEach(el => {
    el.classList.remove('bg-slate-800', 'text-white', 'border-l-4', 'border-emerald-500');
    el.classList.add('text-slate-400');
  });
  const activeEl = document.getElementById(`menu-${viewName}`);
  if (activeEl) {
    activeEl.classList.add('bg-slate-800', 'text-white', 'border-l-4', 'border-emerald-500');
    activeEl.classList.remove('text-slate-400');
  }

  switch (viewName) {
    case 'inicio': await renderInicio(); break;
    case 'ent01': await renderENT01(); break;
    case 'ent02': await renderENT02(); break;
    case 'ent03': await renderENT03(); break;
    case 'ent04': await renderENT04(); break;
    case 'ent05': await renderENT05(); break;
    case 'ent06': await renderENT06(); break;
    case 'ent07': await renderENT07(); break;
    case 'ent08': await renderENT08(); break;
    case 'ent09': await renderENT09(); break;
    case 'ent10': await renderENT10(); break;
    case 'ent11': await renderENT11(); break;
    case 'rpt01': await renderRPT01(); break;
    case 'rpt04': await renderRPT04(); break;
    case 'rpt05': await renderRPT05(); break;
    case 'rpt06': await renderRPT06(); break;
    case 'rpt07': await renderRPT07(); break;
    case 'rpt11': await renderRPT11(); break;
    case 'rpt12': await renderRPT12(); break;
    case 'rpt13': await renderRPT13(); break;
    default: await renderInicio();
  }
  document.getElementById('print-area').scrollTop = 0;
  closeSidebarOnMobile();
}

// ============================================================
// 1. INICIO
// ============================================================
async function renderInicio() {
  tituloModulo.textContent = 'Panel General';
  try {
    const [estudiantes, asignaturas, config, notas] = await Promise.all([
      apiClient.getEstudiantes(),
      apiClient.getAsignaturas(),
      apiClient.getConfiguracion(),
      apiClient.getNotas()
    ]);

    // Si la cuenta es de un estudiante, todo el panel refleja SOLO sus datos:
    // semáforo, contadores, promedio, etc. Si es admin/maestro, mantenemos
    // la vista global previa.
    let listaEstudiantes = estudiantes;
    if (currentUser.rol === 'estudiante') {
      listaEstudiantes = estudiantes.filter(e => e.correo === currentUser.usuario);
    }

    const totalEstudiantes = listaEstudiantes.filter(e => !e.estado || e.estado === 'Activo').length;
    const totalAsignaturas = asignaturas.length;

    let sumIndices = 0, totalConIndice = 0, estudiantesEnRojo = 0;
    listaEstudiantes.forEach(est => {
      if (est.estado && est.estado !== 'Activo') return;
      const ind = calcularIndiceEstudiante(est.matricula, notas, asignaturas);
      if (notas.some(n => n.matriculaEstudiante === est.matricula)) {
        sumIndices += ind;
        totalConIndice++;
      }
      if (ind < config.amarillo) estudiantesEnRojo++;
    });
    const promedioGeneral = totalConIndice > 0 ? sumIndices / totalConIndice : 0;
    const pctRojo = totalEstudiantes > 0 ? (estudiantesEnRojo / totalEstudiantes) * 100 : 0;

    contenedor.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div class="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex items-center">
            <span class="material-symbols-outlined text-3xl">group</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Total Estudiantes</span>
            <span class="font-title text-2xl font-extrabold text-slate-800">${totalEstudiantes}</span>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div class="p-3 bg-indigo-50 text-indigo-600 rounded-xl flex items-center">
            <span class="material-symbols-outlined text-3xl">school</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Índice Promedio</span>
            <span class="font-title text-2xl font-extrabold text-slate-800">${promedioGeneral.toFixed(2)}</span>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div class="p-3 ${estudiantesEnRojo > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'} rounded-xl flex items-center">
            <span class="material-symbols-outlined text-3xl">warning</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Alerta de Riesgo</span>
            <span class="font-title text-2xl font-extrabold text-slate-800">${estudiantesEnRojo} <span class="text-xs font-normal text-slate-500 font-sans">(${pctRojo.toFixed(0)}%)</span></span>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div class="p-3 bg-amber-50 text-amber-600 rounded-xl flex items-center">
            <span class="material-symbols-outlined text-3xl">library_books</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Materias Activas</span>
            <span class="font-title text-2xl font-extrabold text-slate-800">${totalAsignaturas}</span>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="welcome-banner lg:col-span-2 text-white rounded-3xl p-8 shadow-sm flex flex-col justify-between relative overflow-hidden" style="background: linear-gradient(135deg, #0f766e 0%, #0f766e 35%, #14b8a6 100%);">
          <div class="absolute w-40 h-40 rounded-full bg-white/5 -right-10 -bottom-10"></div>
          <div>
            <span class="welcome-badge inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">SISTEMA INFORMATIVO</span>
            <h3 class="welcome-title font-title text-3xl font-extrabold mb-2 text-white">Bienvenido, ${currentUser.usuario}</h3>
            <p class="welcome-text text-white text-sm max-w-lg leading-relaxed font-sans">
              Estás conectado con el rol de <strong class="text-white capitalize">${currentUser.rol}</strong>. 
              Utiliza el menú lateral para gestionar la información académica, cargar calificaciones o generar reportes de rendimiento estudiantil bajo la norma de semaforización de taskUni.
            </p>
          </div>
          <div class="welcome-actions mt-6 flex flex-wrap gap-3">
            ${currentUser.rol === 'admin' ? `
              <button onclick="renderView('ent01')" class="px-4 py-2 bg-white text-emerald-800 font-bold text-xs rounded-xl shadow hover:bg-emerald-50 transition flex items-center gap-1.5 font-title">
                <span class="material-symbols-outlined text-sm">person_add</span> Registrar Estudiante
              </button>
              <button onclick="renderView('ent06')" class="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 border border-emerald-600 font-bold text-xs rounded-xl transition text-white flex items-center gap-1.5 font-title">
                <span class="material-symbols-outlined text-sm">filter_alt</span> Filtro de Reportes
              </button>
            ` : currentUser.rol === 'maestro' ? `
              <button onclick="renderView('ent07')" class="px-4 py-2 bg-white text-emerald-800 font-bold text-xs rounded-xl shadow hover:bg-emerald-50 transition flex items-center gap-1.5 font-title">
                <span class="material-symbols-outlined text-sm">grade</span> Cargar Acta de Notas
              </button>
              <button onclick="renderView('ent06')" class="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 border border-emerald-600 font-bold text-xs rounded-xl transition text-white flex items-center gap-1.5 font-title">
                <span class="material-symbols-outlined text-sm">filter_alt</span> Generar Reporte
              </button>
            ` : `
              <button onclick="renderView('rpt12')" class="px-4 py-2 bg-white text-emerald-800 font-bold text-xs rounded-xl shadow hover:bg-emerald-50 transition flex items-center gap-1.5 font-title">
                <span class="material-symbols-outlined text-sm">donut_large</span> Ver Mi Pensum
              </button>
              <button onclick="renderView('rpt13')" class="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 border border-emerald-600 font-bold text-xs rounded-xl transition text-white flex items-center gap-1.5 font-title">
                <span class="material-symbols-outlined text-sm">monitoring</span> Simular Mi Índice
              </button>
            `}
          </div>
        </div>
        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 class="font-title text-lg font-bold text-slate-800 mb-2">Distribución de Riesgo</h4>
            <p class="text-xs text-slate-400">Estado de riesgo académico global de acuerdo a los umbrales configurados.</p>
          </div>
          <div class="my-6 space-y-3">
            ${renderMiniGraficoSemaforo(listaEstudiantes, notas, config)}
          </div>
          <button onclick="renderView('rpt05')" class="w-full text-center py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition font-title flex items-center justify-center gap-1">
            <span class="material-symbols-outlined text-sm">traffic</span> Ver Detalle del Semáforo
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    showToast('Error al cargar el panel: ' + error.message, 'error');
  }
}

function renderMiniGraficoSemaforo(estudiantes, notas, config) {
  // Si la sesión es de un estudiante, sólo mostramos su semáforo, no el global.
  let lista = estudiantes;
  if (currentUser && currentUser.rol === 'estudiante') {
    lista = estudiantes.filter(e => e.correo === currentUser.usuario);
  }
  let verde = 0, amarillo = 0, rojo = 0;
  lista.forEach(est => {
    const ind = calcularIndiceEstudiante(est.matricula, notas, []);
    if (!notas.some(n => n.matriculaEstudiante === est.matricula)) return;
    if (ind >= config.verde) verde++;
    else if (ind >= config.amarillo) amarillo++;
    else rojo++;
  });
  const total = lista.length || 1;
  const pVerde = (verde / total) * 100;
  const pAmarillo = (amarillo / total) * 100;
  const pRojo = (rojo / total) * 100;

  return `
    <div>
      <div class="flex justify-between text-xs font-semibold mb-1">
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Verde (Alto)</span>
        <span class="text-slate-500 font-bold">${verde}</span>
      </div>
      <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div class="h-full bg-emerald-500 rounded-full" style="width: ${pVerde}%"></div>
      </div>
    </div>
    <div>
      <div class="flex justify-between text-xs font-semibold mb-1">
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Amarillo (Alerta)</span>
        <span class="text-slate-500 font-bold">${amarillo}</span>
      </div>
      <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div class="h-full bg-amber-500 rounded-full" style="width: ${pAmarillo}%"></div>
      </div>
    </div>
    <div>
      <div class="flex justify-between text-xs font-semibold mb-1">
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Rojo (Riesgo)</span>
        <span class="text-slate-500 font-bold">${rojo}</span>
      </div>
      <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div class="h-full bg-rose-500 rounded-full" style="width: ${pRojo}%"></div>
      </div>
    </div>
  `;
}

// ============================================================
// 2. ENT-01: REGISTRO DE ESTUDIANTES
// ============================================================
async function renderENT01() {
  tituloModulo.textContent = 'ENT-01 · Registro de Estudiantes';
  const carreras = await apiClient.getCarreras();

  contenedor.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm self-start">
        <h3 class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-emerald-600">person_add</span> Nuevo Estudiante
        </h3>
        <form id="form-ent01" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Matrícula (7 dígitos)</label>
            <input type="text" id="ent01-matricula" maxlength="7" placeholder="ej: 99-9999" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre Completo</label>
            <input type="text" id="ent01-nombre" placeholder="ej: María Pérez" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Correo Institucional</label>
            <input type="email" id="ent01-correo" placeholder="ej: maria@unphu.edu.do" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Carrera</label>
            <select id="ent01-carrera" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
              <option value="">Seleccione Carrera</option>
              ${carreras.map(c => `<option value="${c.codigo}">${c.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="pt-2 border-t border-slate-100">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" id="ent01-crear-cuenta" class="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500">
              <span class="text-xs font-semibold text-slate-700">También crear cuenta de acceso al sistema</span>
            </label>
            <div id="ent01-passwrap" class="mt-2 hidden">
              <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Contraseña inicial (mín. 6 caracteres)</label>
              <input type="password" id="ent01-password" placeholder="ej: Maria123" minlength="6" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <p class="text-[10px] text-slate-400 mt-1 italic">El estudiante podrá cambiarla después de su primer login.</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition shadow shadow-emerald-600/10 font-title">Guardar</button>
            <button type="button" onclick="renderView('inicio')" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title">Cancelar</button>
          </div>
        </form>
      </div>
      <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
          <h3 class="font-title text-lg font-bold text-slate-800">Listado General</h3>
          <div class="relative w-full sm:w-64">
            <input type="text" id="search-estudiante" placeholder="Buscar..." class="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <span class="material-symbols-outlined text-sm">search</span>
            </span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                <th class="p-3">Matrícula</th>
                <th class="p-3">Nombre</th>
                <th class="p-3">Carrera</th>
                <th class="p-3">Estatus</th>
                <th class="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="tbl-estudiantes"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  await actualizarTablaEstudiantes();

  document.getElementById('search-estudiante').addEventListener('input', e => {
    actualizarTablaEstudiantes(e.target.value.trim());
  });

  // Toggle mostrar/ocultar input de contraseña según checkbox
  document.getElementById('ent01-crear-cuenta').addEventListener('change', e => {
    document.getElementById('ent01-passwrap').classList.toggle('hidden', !e.target.checked);
  });

  document.getElementById('form-ent01').addEventListener('submit', async function (e) {
    e.preventDefault();
    const mat = document.getElementById('ent01-matricula').value.trim();
    const nom = document.getElementById('ent01-nombre').value.trim();
    const cor = document.getElementById('ent01-correo').value.trim().toLowerCase();
    const car = document.getElementById('ent01-carrera').value;
    const crearCuenta = document.getElementById('ent01-crear-cuenta').checked;
    const password = document.getElementById('ent01-password').value;

    const formatoMatricula = /^\d{2}-\d{4}$/;
    if (!formatoMatricula.test(mat)) {
      showToast('Error: La matrícula debe tener el formato 24-0404 (2 dígitos - 4 dígitos).', 'error');
      return;
    }
    const nombreLimpio = nom.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-']/g, '');
    if (nombreLimpio !== nom) {
      showToast('El nombre solo puede contener letras, espacios, guiones o apóstrofes.', 'error');
      return;
    }
    if (!cor.endsWith('@unphu.edu.do')) {
      showToast('Debe ingresar un correo institucional (@unphu.edu.do).', 'error');
      return;
    }
    if (crearCuenta && password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    try {
      const resp = await apiClient.crearEstudiante({ matricula: mat, nombre: nom, correo: cor, id_carrera: car, estado: 'Activo', crearCuenta, password });
      showToast(resp.message || (crearCuenta ? `Estudiante y cuenta creados. Login: ${cor}` : 'Estudiante registrado con éxito.'), 'success');
      this.reset();
      document.getElementById('ent01-passwrap').classList.add('hidden');
      await actualizarTablaEstudiantes();
    } catch (error) {
      showToast('Error al guardar: ' + error.message, 'error');
    }
  });
}

async function actualizarTablaEstudiantes(filtro = '') {
  const tbody = document.getElementById('tbl-estudiantes');
  if (!tbody) return;
  try {
    const estudiantes = await apiClient.getEstudiantes();
    const carreras = await apiClient.getCarreras();
    const filtrados = estudiantes.filter(est => {
      const q = filtro.toLowerCase();
      return est.nombre.toLowerCase().includes(q) || est.matricula.includes(q);
    });
    if (filtrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">No se encontraron registros.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtrados.map(est => {
      // FIX: backend ya devuelve carreraNombre / carreraCodigo vía JOIN.
      // Antes hacía lookup por est.carrera (campo inexistente) y mostraba vacío.
      const carrera = est.carreraNombre || est.carreraCodigo || '— sin carrera —';
      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
          <td class="p-3 font-semibold font-mono text-slate-700">${est.matricula}</td>
          <td class="p-3 font-semibold text-slate-800">${est.nombre}<span class="block text-[10px] text-slate-400 font-normal">${est.correo || ''}</span></td>
          <td class="p-3 text-slate-500 font-medium">${carrera}</td>
          <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">${est.estado || 'Activo'}</span></td>
          <td class="p-3 text-right">
            <button onclick="eliminarEstudiante('${est.matricula}')" class="p-1 text-slate-400 hover:text-rose-500 rounded transition">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showToast('Error al cargar estudiantes: ' + error.message, 'error');
  }
}

async function eliminarEstudiante(matricula) {
  if (confirm(`¿Eliminar al estudiante ${matricula}? Sus notas se borrarán.`)) {
    try {
      await apiClient.eliminarEstudiante(matricula);
      showToast('Estudiante eliminado.');
      await actualizarTablaEstudiantes();
    } catch (error) {
      showToast('Error al eliminar: ' + error.message, 'error');
    }
  }
}

// ============================================================
// ============================================================
// 3. ENT-02: REGISTRO DE ASIGNATURAS
// ============================================================
let asignaturaEditandoCodigo = null;

async function renderENT02() {
  tituloModulo.textContent = 'ENT-02 · Registro de Asignaturas';
  asignaturaEditandoCodigo = null;

  let carreras = [];
  try {
    carreras = await apiClient.getCarreras();
  } catch (error) {
    console.error('Error al cargar carreras:', error);
  }

  const selectOptions = carreras.map(c => `<option value="${c.id_carrera}">${c.nombre}</option>`).join('');

  contenedor.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm self-start">
        <h3 id="ent02-form-titulo" class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-emerald-600">book</span> Nueva Asignatura
        </h3>
        <form id="form-ent02" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Código (ej: INF-101)</label>
            <input type="text" id="ent02-codigo" placeholder="XXX-000" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre Materia</label>
            <input type="text" id="ent02-nombre" placeholder="ej: Programación Avanzada" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Créditos</label>
            <input type="number" id="ent02-creditos" min="1" max="99" placeholder="1-99" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Carrera / Pensum</label>
            <select id="ent02-carrera" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              <option value="">Seleccione Carrera</option>
              ${selectOptions}
            </select>
          </div>
          <div class="flex gap-2">
            <button type="submit" id="ent02-btn-guardar" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition font-title">Guardar</button>
            <button type="button" id="ent02-btn-cancelar" onclick="cancelarEdicionAsignatura()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title">Cancelar</button>
          </div>
          <button type="button" id="btn-buscar-asignatura" class="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 font-semibold text-xs rounded-lg transition font-title">Buscar</button>
        </form>
      </div>
      <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 class="font-title text-lg font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4">Catálogo General</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                <th class="p-3">Código</th>
                <th class="p-3">Nombre</th>
                <th class="p-3">Créditos</th>
                <th class="p-3">Carrera</th>
                <th class="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="tbl-asignaturas"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  await actualizarTablaAsignaturas();

  document.getElementById('form-ent02').addEventListener('submit', async function (e) {
    e.preventDefault();
    const cod = document.getElementById('ent02-codigo').value.trim().toUpperCase();
    const nom = document.getElementById('ent02-nombre').value.trim();
    const cred = parseInt(document.getElementById('ent02-creditos').value);
    const carId = document.getElementById('ent02-carrera').value;

    const regexCod = /^[A-Z]{3}-\d{3}$/;
    if (!regexCod.test(cod)) {
      showToast('El código debe tener el formato XXX-000 (ej: INF-101).', 'error');
      return;
    }
    try {
      if (asignaturaEditandoCodigo) {
        await apiClient.actualizarAsignatura(asignaturaEditandoCodigo, { nombre: nom, creditos: cred, id_carrera: carId, estado: 'Activa' });
        showToast('Asignatura actualizada con éxito.');
        cancelarEdicionAsignatura();
      } else {
        await apiClient.crearAsignatura({ codigo: cod, nombre: nom, creditos: cred, id_carrera: carId, estado: 'Activa' });
        showToast('Asignatura guardada con éxito.');
        this.reset();
      }
      await actualizarTablaAsignaturas();
    } catch (error) {
      showToast('Error al guardar: ' + error.message, 'error');
    }
  });

  document.getElementById('btn-buscar-asignatura').addEventListener('click', () => {
    const query = prompt('Ingresa el código o nombre a buscar:');
    if (query) actualizarTablaAsignaturas(query.trim());
  });
}

function editarAsignatura(codigo) {
  const asig = asignaturasCache.find(a => a.codigo === codigo);
  if (!asig) return;

  asignaturaEditandoCodigo = codigo;
  const codigoInput = document.getElementById('ent02-codigo');
  codigoInput.value = asig.codigo;
  codigoInput.disabled = true;
  document.getElementById('ent02-nombre').value = asig.nombre || '';
  document.getElementById('ent02-creditos').value = asig.creditos || '';
  document.getElementById('ent02-carrera').value = asig.id_carrera || '';

  document.getElementById('ent02-form-titulo').innerHTML =
    '<span class="material-symbols-outlined text-emerald-600">edit</span> Editar Asignatura';
  document.getElementById('ent02-btn-guardar').textContent = 'Actualizar';
  document.getElementById('ent02-btn-cancelar').textContent = 'Cancelar edición';

  document.getElementById('form-ent02').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelarEdicionAsignatura() {
  asignaturaEditandoCodigo = null;
  const form = document.getElementById('form-ent02');
  if (form) form.reset();

  const codigoInput = document.getElementById('ent02-codigo');
  if (codigoInput) codigoInput.disabled = false;

  const titulo = document.getElementById('ent02-form-titulo');
  const btnGuardar = document.getElementById('ent02-btn-guardar');
  const btnCancelar = document.getElementById('ent02-btn-cancelar');
  if (titulo) titulo.innerHTML = '<span class="material-symbols-outlined text-emerald-600">book</span> Nueva Asignatura';
  if (btnGuardar) btnGuardar.textContent = 'Guardar';
  if (btnCancelar) btnCancelar.textContent = 'Cancelar';
}

let asignaturasCache = [];

async function actualizarTablaAsignaturas(filtro = '') {
  const tbody = document.getElementById('tbl-asignaturas');
  if (!tbody) return;
  try {
    const asignaturas = await apiClient.getAsignaturas();
    asignaturasCache = asignaturas;
    const filtradas = asignaturas.filter(a => {
      const q = filtro.toLowerCase();
      return a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q);
    });
    if (filtradas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">No se encontraron asignaturas.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtradas.map(asig => {
      const carreraStr = asig.carreraNombre || '—';
      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
          <td class="p-3 font-semibold font-mono text-slate-700">${asig.codigo}</td>
          <td class="p-3 font-semibold text-slate-800">${asig.nombre}</td>
          <td class="p-3 text-slate-500 font-medium">${asig.creditos} CR</td>
          <td class="p-3 text-slate-500">${carreraStr}</td>
          <td class="p-3 text-right whitespace-nowrap">
            <button onclick="editarAsignatura('${asig.codigo}')" class="p-1 text-slate-400 hover:text-emerald-600 rounded transition">
              <span class="material-symbols-outlined text-base">edit</span>
            </button>
            <button onclick="eliminarAsignatura('${asig.codigo}')" class="p-1 text-slate-400 hover:text-rose-500 rounded transition">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showToast('Error al cargar asignaturas: ' + error.message, 'error');
  }
}

async function eliminarAsignatura(codigo) {
  if (confirm(`¿Eliminar la asignatura ${codigo}?`)) {
    try {
      await apiClient.eliminarAsignatura(codigo);
      showToast('Asignatura eliminada.', 'success');
      if (asignaturaEditandoCodigo === codigo) cancelarEdicionAsignatura();
      await actualizarTablaAsignaturas();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  }
}

// ============================================================
// 4. ENT-03: REGISTRO DE PERÍODOS
// ============================================================
let periodoEditandoId = null;
let periodosCache = [];

async function renderENT03() {
  tituloModulo.textContent = 'ENT-03 · Registro de Periodos';

  contenedor.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm self-start">
        <h3 id="ent03-form-titulo" class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-emerald-600">calendar_today</span> Nuevo Período
        </h3>
        <form id="form-ent03" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Período (ej: 9-2026)</label>
            <input type="text" id="ent03-periodo" placeholder="9-9999" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Cuatrimestre</label>
            <input type="text" id="ent03-cuatrimestre" placeholder="ej. Septiembre-Diciembre" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha Inicio</label>
              <input type="date" id="ent03-inicio" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha Fin</label>
              <input type="date" id="ent03-fin" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Estado</label>
            <select id="ent03-estado" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              <option value="Activo">Activo</option>
              <option value="Cerrado">Cerrado</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button type="submit" id="ent03-btn-guardar" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition font-title">Guardar</button>
            <button type="button" id="ent03-btn-cancelar" onclick="cancelarEdicionPeriodo()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title">Cancelar</button>
          </div>
        </form>
      </div>
      <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
        <h3 class="font-title text-lg font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4">Listado de Períodos</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                <th class="p-3">Código</th>
                <th class="p-3">Descripción</th>
                <th class="p-3">Inicio</th>
                <th class="p-3">Fin</th>
                <th class="p-3">Estado</th>
                <th class="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="tbl-periodos"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  periodoEditandoId = null;
  await actualizarTablaPeriodos();

  document.getElementById('form-ent03').addEventListener('submit', async function (e) {
    e.preventDefault();
    const per = document.getElementById('ent03-periodo').value.trim();
    const cuat = document.getElementById('ent03-cuatrimestre').value.trim();
    const ini = document.getElementById('ent03-inicio').value;
    const fin = document.getElementById('ent03-fin').value;
    const est = document.getElementById('ent03-estado').value;

    if (new Date(ini) >= new Date(fin)) {
      showToast('La fecha fin debe ser posterior a la inicio.', 'error');
      return;
    }
    try {
      if (periodoEditandoId) {
        await apiClient.actualizarPeriodo(periodoEditandoId, { periodo: per, cuatrimestre: cuat, fechaInicio: ini, fechaFin: fin, estado: est });
        showToast('Período actualizado correctamente.');
        cancelarEdicionPeriodo();
      } else {
        await apiClient.createPeriodo({ periodo: per, cuatrimestre: cuat, fechaInicio: ini, fechaFin: fin, estado: est });
        showToast('Período registrado correctamente.');
        this.reset();
      }
      await actualizarTablaPeriodos();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  });
}

function editarPeriodo(id) {
  const p = periodosCache.find(x => x.id_periodo === id);
  if (!p) return;

  periodoEditandoId = id;
  document.getElementById('ent03-periodo').value = p.periodo || '';
  document.getElementById('ent03-cuatrimestre').value = p.cuatrimestre || '';
  document.getElementById('ent03-inicio').value = (p.fechaInicio || '').substring(0, 10);
  document.getElementById('ent03-fin').value = (p.fechaFin || '').substring(0, 10);
  document.getElementById('ent03-estado').value = p.estado || 'Activo';

  document.getElementById('ent03-form-titulo').innerHTML =
    '<span class="material-symbols-outlined text-emerald-600">edit_calendar</span> Editar Período';
  document.getElementById('ent03-btn-guardar').textContent = 'Actualizar';
  document.getElementById('ent03-btn-cancelar').textContent = 'Cancelar edición';

  document.getElementById('form-ent03').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelarEdicionPeriodo() {
  periodoEditandoId = null;
  const form = document.getElementById('form-ent03');
  if (form) form.reset();

  const titulo = document.getElementById('ent03-form-titulo');
  const btnGuardar = document.getElementById('ent03-btn-guardar');
  const btnCancelar = document.getElementById('ent03-btn-cancelar');
  if (titulo) titulo.innerHTML = '<span class="material-symbols-outlined text-emerald-600">calendar_today</span> Nuevo Período';
  if (btnGuardar) btnGuardar.textContent = 'Guardar';
  if (btnCancelar) btnCancelar.textContent = 'Cancelar';
}

async function eliminarPeriodo(id, codigo) {
  if (!confirm(`¿Eliminar el período ${codigo}? Esta acción no se puede deshacer.`)) return;
  try {
    await apiClient.eliminarPeriodo(id);
    showToast('Período eliminado.');
    if (periodoEditandoId === id) cancelarEdicionPeriodo();
    await actualizarTablaPeriodos();
  } catch (error) {
    showToast('Error al eliminar: ' + error.message, 'error');
  }
}

async function actualizarTablaPeriodos() {
  const tbody = document.getElementById('tbl-periodos');
  if (!tbody) return;
  try {
    const periodos = await apiClient.getPeriodos();
    periodosCache = periodos;
    if (periodos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">No hay períodos registrados.</td></tr>`;
      return;
    }
    tbody.innerHTML = periodos.map(p => {
      const badgeColor = p.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500';
      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
          <td class="p-3 font-semibold font-mono text-slate-700">${p.periodo}</td>
          <td class="p-3 text-slate-800 font-semibold">${p.cuatrimestre || ''}</td>
          <td class="p-3 text-slate-500 font-mono">${p.fechaInicio}</td>
          <td class="p-3 text-slate-500 font-mono">${p.fechaFin}</td>
          <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${p.estado}</span></td>
          <td class="p-3 text-right whitespace-nowrap">
            <button onclick="editarPeriodo(${p.id_periodo})" class="p-1 text-slate-400 hover:text-emerald-600 rounded transition">
              <span class="material-symbols-outlined text-base">edit</span>
            </button>
            <button onclick="eliminarPeriodo(${p.id_periodo}, '${p.periodo}')" class="p-1 text-slate-400 hover:text-rose-500 rounded transition">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showToast('Error al cargar períodos: ' + error.message, 'error');
  }
}

// ============================================================
// 5. ENT-04: REGISTRO DE PROFESORES
// ============================================================
async function renderENT04() {
  tituloModulo.textContent = 'ENT-04 · Registro de Profesores';

  contenedor.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm self-start">
        <h3 class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-emerald-600">co_present</span> Nuevo Profesor
        </h3>
        <form id="form-ent04" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Código Profesor (ej: PRO-001)</label>
            <input type="text" id="ent04-codigo" placeholder="PRO-000" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre Completo</label>
            <input type="text" id="ent04-nombre" placeholder="Nombre completo" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Correo Electrónico</label>
            <input type="email" id="ent04-correo" placeholder="correo@unphu.edu.do" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Estatus</label>
            <select id="ent04-estado" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
          <div class="pt-2 border-t border-slate-100">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" id="ent04-crear-cuenta" class="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500">
              <span class="text-xs font-semibold text-slate-700">También crear cuenta de acceso al sistema</span>
            </label>
            <div id="ent04-passwrap" class="mt-2 hidden">
              <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Contraseña inicial (mín. 6 caracteres)</label>
              <input type="password" id="ent04-password" placeholder="ej: Maestro123" minlength="6" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <p class="text-[10px] text-slate-400 mt-1 italic">El profesor podrá cambiarla después de su primer login.</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition font-title">Guardar</button>
            <button type="button" id="btn-buscar-profesor" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title">Buscar</button>
          </div>
        </form>
      </div>
      <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
        <h3 class="font-title text-lg font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4">Cuerpo Académico</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="grid-profesores"></div>
      </div>
    </div>
  `;

  await actualizarGridProfesores();

  // Toggle mostrar/ocultar input de contraseña según checkbox
  document.getElementById('ent04-crear-cuenta').addEventListener('change', e => {
    document.getElementById('ent04-passwrap').classList.toggle('hidden', !e.target.checked);
  });

  document.getElementById('form-ent04').addEventListener('submit', async function (e) {
    e.preventDefault();
    const cod = document.getElementById('ent04-codigo').value.trim().toUpperCase();
    const nom = document.getElementById('ent04-nombre').value.trim();
    const cor = document.getElementById('ent04-correo').value.trim().toLowerCase();
    const est = document.getElementById('ent04-estado').value;
    const crearCuenta = document.getElementById('ent04-crear-cuenta').checked;
    const password = document.getElementById('ent04-password').value;

    const regexCod = /^PRO-\d{3}$/;
    if (!regexCod.test(cod)) {
      showToast('El código debe tener el formato PRO-000.', 'error');
      return;
    }
    if (crearCuenta && password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    try {
      const resp = await apiClient.crearProfesor({ codigo: cod, nombre: nom, correo: cor, estado: est, crearCuenta, password });
      showToast(resp.message || (crearCuenta ? `Profesor y cuenta creados. Login: ${cor}` : 'Profesor guardado correctamente.'), 'success');
      this.reset();
      document.getElementById('ent04-passwrap').classList.add('hidden');
      await actualizarGridProfesores();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  });

  document.getElementById('btn-buscar-profesor').addEventListener('click', () => {
    const query = prompt('Nombre o código a buscar:');
    if (query) actualizarGridProfesores(query.trim());
  });
}

async function actualizarGridProfesores(filtro = '') {
  const grid = document.getElementById('grid-profesores');
  if (!grid) return;
  try {
    const profesores = await apiClient.getProfesores();
    const asignaturas = await apiClient.getAsignaturas();
    const filtrados = profesores.filter(p => {
      const q = filtro.toLowerCase();
      return p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
    });
    if (filtrados.length === 0) {
      grid.innerHTML = `<div class="col-span-2 text-center text-slate-400 italic py-6">No se encontraron profesores.</div>`;
      return;
    }
    grid.innerHTML = filtrados.map(p => {
      const materias = asignaturas.filter(a => a.profesor === p.codigo).map(a => a.codigo);
      const materiasBadge = materias.length > 0
        ? materias.map(m => `<span class="px-1.5 py-0.5 bg-slate-100 border text-slate-600 rounded text-[9px] font-mono">${m}</span>`).join(' ')
        : `<span class="text-[10px] text-slate-400 italic">Sin materias</span>`;
      return `
        <div class="p-4 border border-slate-150 rounded-xl hover:shadow-sm transition flex gap-3 relative bg-white">
          <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 font-title">
            ${p.nombre.split(' ').pop().charAt(0) || 'P'}
          </div>
          <div class="overflow-hidden flex-1">
            <h4 class="font-bold text-sm text-slate-800 truncate">${p.nombre}</h4>
            <p class="text-xs text-slate-500 truncate">${p.correo}</p>
            <div class="mt-2 flex flex-wrap gap-1 items-center">${materiasBadge}</div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="px-1.5 py-0.5 rounded text-[8px] font-bold ${p.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'} font-title">${p.estado}</span>
            <button type="button" onclick="eliminarProfesor('${p.codigo}')" title="Eliminar profesor" class="mt-1 p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition">
              <span class="material-symbols-outlined text-base leading-none">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    showToast('Error al cargar profesores: ' + error.message, 'error');
  }
}

async function eliminarProfesor(codigo) {
  if (confirm(`¿Eliminar al profesor ${codigo}? Esta acción no se puede deshacer.`)) {
    try {
      await apiClient.eliminarProfesor(codigo);
      showToast('Profesor eliminado.', 'success');
      await actualizarGridProfesores();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  }
}

// ============================================================
// 6. ENT-05: REGISTRO DE CARRERAS
// ============================================================
async function renderENT05() {
  tituloModulo.textContent = 'ENT-05 · Registro de Carreras';

  let selectOptions = '';
  try {
    const facultades = await apiClient.getFacultades();
    selectOptions = facultades.map(f => `<option value="${f.id_facultad}">${f.nombre}</option>`).join('');
  } catch (error) {
    console.error('Error al cargar facultades:', error);
  }

  contenedor.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm self-start">
        <h3 class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-emerald-600">account_balance</span> Nueva Carrera
        </h3>
        <form id="form-ent05" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Código Carrera (ej: CAR-001)</label>
            <input type="text" id="ent05-codigo" placeholder="CAR-000" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre Carrera</label>
            <input type="text" id="ent05-nombre" placeholder="Nombre de carrera" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Facultad</label>
            <select id="ent05-facultad" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              <option value="">Seleccione Facultad</option>
              ${selectOptions}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Estatus</label>
            <select id="ent05-estado" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              <option value="Activa">Activa</option>
              <option value="Inactiva">Inactiva</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition font-title">Guardar</button>
            <button type="button" id="btn-buscar-carrera" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title">Buscar</button>
          </div>
        </form>
      </div>
      <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
        <h3 class="font-title text-lg font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4">Carreras Ofertadas</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                <th class="p-3">Código</th>
                <th class="p-3">Nombre</th>
                <th class="p-3">Facultad</th>
                <th class="p-3">Estatus</th>
              </tr>
            </thead>
            <tbody id="tbl-carreras"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  await actualizarTablaCarreras();

  document.getElementById('form-ent05').addEventListener('submit', async function (e) {
    e.preventDefault();
    const cod = document.getElementById('ent05-codigo').value.trim().toUpperCase();
    const nom = document.getElementById('ent05-nombre').value.trim();
    const facId = document.getElementById('ent05-facultad').value;
    const est = document.getElementById('ent05-estado').value;

    const regexCod = /^CAR-\d{3}$/;
    if (!regexCod.test(cod)) {
      showToast('El código debe tener el formato CAR-000.', 'error');
      return;
    }
    try {
      await apiClient.crearCarrera({ codigo: cod, nombre: nom, id_facultad: facId, estado: est });
      showToast('Carrera guardada correctamente.', 'success');
      this.reset();
      await actualizarTablaCarreras();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  });

  document.getElementById('btn-buscar-carrera').addEventListener('click', () => {
    const query = prompt('Buscar carrera:');
    if (query) actualizarTablaCarreras(query.trim());
  });
}

async function actualizarTablaCarreras(filtro = '') {
  const tbody = document.getElementById('tbl-carreras');
  if (!tbody) return;
  try {
    const carreras = await apiClient.getCarreras();
    const filtradas = carreras.filter(c => {
      const q = filtro.toLowerCase();
      return c.nombre.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q);
    });
    if (filtradas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400 italic">No se encontraron carreras.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtradas.map(c => `
      <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
        <td class="p-3 font-semibold font-mono text-slate-700">${c.codigo}</td>
        <td class="p-3 text-slate-800 font-semibold">${c.nombre}</td>
        <td class="p-3 text-slate-500">${c.facultad}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.estado === 'Activa' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}">${c.estado}</span></td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error al cargar carreras: ' + error.message, 'error');

  }
}

// ============================================================
// ENT-10: REGISTRO DE FACULTADES
// ============================================================
async function renderENT10() {
  tituloModulo.textContent = 'ENT-10 · Registro de Facultades';

  contenedor.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm self-start">
        <h3 class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-emerald-600">apartment</span> Nueva Facultad
        </h3>
        <form id="form-ent10" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Código Facultad (ej: FAC-001)</label>
            <input type="text" id="ent10-codigo" placeholder="FAC-000" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre Facultad</label>
            <input type="text" id="ent10-nombre" placeholder="Nombre de la facultad" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Estatus</label>
            <select id="ent10-estado" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              <option value="Activa">Activa</option>
              <option value="Inactiva">Inactiva</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition font-title">Guardar</button>
            <button type="button" id="btn-buscar-facultad" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title">Buscar</button>
          </div>
        </form>
      </div>
      <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
        <h3 class="font-title text-lg font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4">Facultades Registradas</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                <th class="p-3">Código</th>
                <th class="p-3">Nombre</th>
                <th class="p-3">Estatus</th>
                <th class="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody id="tbl-facultades"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  await actualizarTablaFacultades();

  document.getElementById('form-ent10').addEventListener('submit', async function (e) {
    e.preventDefault();
    const cod = document.getElementById('ent10-codigo').value.trim().toUpperCase();
    const nom = document.getElementById('ent10-nombre').value.trim();
    const est = document.getElementById('ent10-estado').value;

    const regexCod = /^FAC-\d{3}$/;
    if (!regexCod.test(cod)) {
      showToast('El código debe tener el formato FAC-000.', 'error');
      return;
    }
    try {
      await apiClient.crearFacultad({ codigo: cod, nombre: nom, estado: est });
      showToast('Facultad guardada correctamente.', 'success');
      this.reset();
      await actualizarTablaFacultades();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  });

  document.getElementById('btn-buscar-facultad').addEventListener('click', () => {
    const query = prompt('Buscar facultad:');
    if (query) actualizarTablaFacultades(query.trim());
  });
}

async function actualizarTablaFacultades(filtro = '') {
  const tbody = document.getElementById('tbl-facultades');
  if (!tbody) return;
  try {
    const facultades = await apiClient.getFacultades();
    const filtradas = facultades.filter(f => {
      const q = filtro.toLowerCase();
      return f.nombre.toLowerCase().includes(q) || f.codigo.toLowerCase().includes(q);
    });
    if (filtradas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400 italic">No se encontraron facultades.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtradas.map(f => `
      <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
        <td class="p-3 font-semibold font-mono text-slate-700">${f.codigo}</td>
        <td class="p-3 text-slate-800 font-semibold">${f.nombre}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${f.estado === 'Activa' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}">${f.estado}</span></td>
        <td class="p-3">
          <button onclick="eliminarFacultadUI('${f.codigo}')" class="text-rose-600 hover:underline text-xs font-semibold">Eliminar</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error al cargar facultades: ' + error.message, 'error');
  }
}

async function eliminarFacultadUI(codigo) {
  if (!confirm(`¿Eliminar la facultad ${codigo}?`)) return;
  try {
    await apiClient.eliminarFacultad(codigo);
    showToast('Facultad eliminada.', 'success');
    await actualizarTablaFacultades();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

// ============================================================
// 7. ENT-06: FILTROS PARA REPORTES
// ============================================================
async function renderENT06() {
  tituloModulo.textContent = 'ENT-06 · Filtros para Reportes';

  const periodos = await apiClient.getPeriodos();

  // For teachers, only show subjects they teach
  let asignaturas;
  if (currentUser.rol === 'maestro') {
    // Get only subjects taught by this teacher
    asignaturas = await apiClient.getAsignaturas({ idProfesor: currentUser.idReferencia });
  } else {
    // For admin and students, show all subjects
    asignaturas = await apiClient.getAsignaturas();
  }

  // Para el maestro, las secciones del select deben restringirse a las que
  // pertenecen a SUS materias. De lo contrario, podría elegir una sección que
  // no imparte y ver estudiantes ajenos.
  let secciones = await apiClient.getSecciones();
  if (currentUser.rol === 'maestro') {
    const codigosDelProfesor = new Set(asignaturas.map(a => a.codigo));
    secciones = secciones.filter(s => codigosDelProfesor.has(s.codigo_asignatura || s.codigoAsignatura));
  }

  // Para el maestro, los estudiantes del combo se restringen a los que
  // están inscritos en secciones de sus materias (a través de
  // repoblarEstudiantes). Cargamos el catálogo completo aquí y filtramos
  // más adelante según la sección seleccionada.
  const estudiantes = await apiClient.getEstudiantes();

  // Secciones filtrables segun el periodo seleccionado; empieza con todas
  // para que el select no quede vacio antes de elegir periodo.
  const periodoActivo = (periodos.find(p => p.estado === 'Activo') || {}).periodo || '';

  contenedor.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm self-start">
        <h3 class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-emerald-600">filter_alt</span> Parámetros
        </h3>
        <form id="form-ent06" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Período (Obligatorio)</label>
            <select id="ent06-periodo" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              <option value="">Seleccione Período</option>
              ${periodos.map(p => `<option value="${p.periodo}" ${activeFilter.periodo === p.periodo ? 'selected' : ''} data-id="${p.id_periodo || ''}">${p.periodo}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Asignatura (Obligatorio)</label>
            <select id="ent06-asignatura" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              <option value="">Seleccione Asignatura</option>
              ${asignaturas.map(a => `<option value="${a.codigo}" ${activeFilter.asignatura === a.codigo ? 'selected' : ''}>${a.codigo} - ${a.nombre}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Sección (Obligatorio)</label>
            <select id="ent06-seccion" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              <option value="">Seleccione Sección</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Estudiante (Opcional)</label>
            <select id="ent06-estudiante" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
              <option value="">Todos los Estudiantes</option>
            </select>
            <p id="ent06-estudiante-hint" class="text-[10px] text-slate-400 mt-1 italic">Selecciona una asignatura y sección para acotar la lista.</p>
          </div>
          <div class="flex gap-2 pt-2">
            <button type="submit" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition font-title">Generar Reporte</button>
            <button type="button" id="btn-limpiar-ent06" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title">Limpiar</button>
          </div>
        </form>
      </div>
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 class="font-title text-lg font-bold text-slate-800 pb-3 border-b border-slate-100 mb-4">Estatus del Filtro</h3>
          <div id="ent06-status" class="space-y-3 font-sans text-xs"></div>
        </div>
        <div id="ent06-menu-reportes" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4"></div>
      </div>
    </div>
  `;

  // Funcion para repoblar el select de secciones cuando cambia periodo o asignatura
  function repoblarSecciones() {
    const selPeriodo = document.getElementById('ent06-periodo');
    const selAsig = document.getElementById('ent06-asignatura');
    const selSeccion = document.getElementById('ent06-seccion');
    if (!selPeriodo || !selAsig || !selSeccion) return;

    const idPeriodoSel = Number(selPeriodo.options[selPeriodo.selectedIndex]?.dataset.id);
    const codAsigSel = selAsig.value;

    const filtradas = secciones.filter(s => {
      // Si no se reconoce idPeriodoSel (NaN o 0), no filtramos por periodo
      const matchPeriodo = !idPeriodoSel || s.id_periodo === idPeriodoSel;
      const matchAsig = !codAsigSel || (s.codigo_asignatura && s.codigo_asignatura === codAsigSel)
        || (s.id_asignatura && asignaturas.find(a => a.codigo === codAsigSel)?.id_asignatura === s.id_asignatura);
      return matchPeriodo && matchAsig;
    });

    selSeccion.innerHTML = '<option value="">Seleccione Sección</option>'
      + filtradas.map(s => {
        const num = s.numero_seccion != null ? String(s.numero_seccion).padStart(2, '0') : (s.numero || '');
        const label = num ? `Sección ${num}` : `Sección ${s.id}`;
        return `<option value="${s.id}" ${activeFilter.seccion == s.id ? 'selected' : ''}>${label}</option>`;
      }).join('');

    if (filtradas.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No hay secciones para este periodo';
      opt.disabled = true;
      selSeccion.appendChild(opt);
    }
  }

  // Repoblar el select de estudiantes segun la seccion seleccionada.
  // Solo se muestran los estudiantes matriculados en esa seccion.
  // Si no hay seccion, para profesores mostramos solo estudiantes de sus materias,
  // para otros roles mostramos todos los estudiantes activos (modo global).
  async function repoblarEstudiantes() {
    const selSeccion = document.getElementById('ent06-seccion');
    const selEstudiante = document.getElementById('ent06-estudiante');
    const hint = document.getElementById('ent06-estudiante-hint');
    if (!selSeccion || !selEstudiante) return;

    const idSeccion = Number(selSeccion.value);
    if (!idSeccion) {
      // Sin seccion -> modo especial para profesores: solo estudiantes de sus materias
      if (currentUser.rol === 'maestro') {
        try {
          // Get sections for the current period and teacher's subjects
          const periodoSel = document.getElementById('ent06-periodo').value;
          if (!periodoSel) {
            // No period selected, show empty list
            selEstudiante.innerHTML = '<option value="">Seleccione un período primero</option>';
            if (hint) hint.textContent = 'Seleccione un período para ver los estudiantes de sus materias.';
            return;
          }

          // Get all sections for the current period
          const seccionesPeriodo = secciones.filter(s => s.periodo === periodoSel);

          // Get sections that belong to the teacher's subjects
          const seccionesDeMisMaterias = seccionesPeriodo.filter(s =>
            asignaturas.some(a => a.codigo === s.codigoAsignatura)
          );

          // Get unique student IDs from these sections
          const estudianteIds = new Set();
          const estudiantesPromises = seccionesDeMisMaterias.map(s =>
            apiClient.getEstudiantesDeSeccion(s.id)
          );

          const estudiantesArrays = await Promise.all(estudiantesPromises);
          estudiantesArrays.forEach(estudiantesArray => {
            if (estudiantesArray) {
              estudiantesArray.forEach(est => estudianteIds.add(est.matricula));
            }
          });

          // Filter the master student list to only include these students
          const lista = estudiantes.filter(e => estudianteIds.has(e.matricula) &&
                                              (!e.estado || e.estado === 'Activo'));

          if (lista.length === 0) {
            selEstudiante.innerHTML = '<option value="">No hay estudiantes activos en sus materias</option>';
            if (hint) hint.textContent = 'No hay estudiantes activos matriculados en sus materias para el período seleccionado.';
            return;
          }

          selEstudiante.innerHTML = '<option value="">Todos los Estudiantes</option>'
            + lista.map(e => `<option value="${e.matricula}" ${activeFilter.estudiante === e.matricula ? 'selected' : ''}>${e.matricula} - ${e.nombre}</option>`).join('');
          if (hint) hint.textContent = `Mostrando solo los ${lista.length} estudiante(s) activo(s) de sus materias.`;
        } catch (error) {
          console.error('Error al cargar estudiantes de materias del profesor:', error);
          // Fallback to showing all active students
          const lista = (estudiantes || []).filter(e => !e.estado || e.estado === 'Activo');
          selEstudiante.innerHTML = '<option value="">Todos los Estudiantes</option>'
            + lista.map(e => `<option value="${e.matricula}" ${activeFilter.estudiante === e.matricula ? 'selected' : ''}>${e.matricula} - ${e.nombre}</option>`).join('');
          if (hint) hint.textContent = 'Error al cargar datos. Mostrando todos los estudiantes activos.';
        }
      } else {
        // For non-teachers (admin, student), show all active students
        const lista = (estudiantes || []).filter(e => !e.estado || e.estado === 'Activo');
        selEstudiante.innerHTML = '<option value="">Todos los Estudiantes</option>'
          + lista.map(e => `<option value="${e.matricula}" ${activeFilter.estudiante === e.matricula ? 'selected' : ''}>${e.matricula} - ${e.nombre}</option>`).join('');
        if (hint) hint.textContent = 'Mostrando todos los estudiantes activos (sin sección seleccionada).';
      }
      return;
    }

    try {
      const matriculados = await apiClient.getEstudiantesDeSeccion(idSeccion);
      if (!matriculados || matriculados.length === 0) {
        selEstudiante.innerHTML = '<option value="">No hay estudiantes matriculados en esta sección</option>';
        if (hint) hint.textContent = `La sección ${idSeccion} no tiene estudiantes matriculados.`;
        return;
      }

      // No hace falta re-filtrar aquí: idSeccion viene del select de "Sección",
      // que ya está acotado a las secciones del maestro (ver "secciones" más
      // arriba, filtrado por codigosDelProfesor). Todo estudiante que devuelva
      // getEstudiantesDeSeccion para esa sección ya pertenece a su materia.
      const estudiantesParaMostrar = matriculados;

      if (estudiantesParaMostrar.length === 0) {
        selEstudiante.innerHTML = '<option value="">No hay estudiantes matriculados en esta sección</option>';
        if (hint) hint.textContent = `La sección ${idSeccion} no tiene estudiantes matriculados.`;
        return;
      }

      selEstudiante.innerHTML = '<option value="">Todos los Estudiantes</option>'
        + estudiantesParaMostrar.map(e => `<option value="${e.matricula}" ${activeFilter.estudiante === e.matricula ? 'selected' : ''}>${e.matricula} - ${e.nombre}</option>`).join('');
      if (hint) hint.textContent = `Mostrando solo los ${estudiantesParaMostrar.length} estudiante(s) matriculado(s) en esta sección.`;
    } catch (error) {
      selEstudiante.innerHTML = '<option value="">Error al cargar estudiantes</option>';
      if (hint) hint.textContent = 'Error al cargar estudiantes de la sección: ' + error.message;
    }
  }

  // Poblar inicialmente y enlazar cambios
  document.getElementById('ent06-periodo').addEventListener('change', () => { repoblarSecciones(); repoblarEstudiantes(); });
  document.getElementById('ent06-asignatura').addEventListener('change', () => { repoblarSecciones(); repoblarEstudiantes(); });
  document.getElementById('ent06-seccion').addEventListener('change', repoblarEstudiantes);
  repoblarSecciones();
  repoblarEstudiantes();

  actualizarEstatusFiltro();

  document.getElementById('form-ent06').addEventListener('submit', function (e) {
    e.preventDefault();
    activeFilter.periodo = document.getElementById('ent06-periodo').value;
    activeFilter.asignatura = document.getElementById('ent06-asignatura').value;
    activeFilter.seccion = document.getElementById('ent06-seccion').value;
    activeFilter.estudiante = document.getElementById('ent06-estudiante').value;
    showToast('Filtro configurado. Reportes desbloqueados.');
    actualizarEstatusFiltro();
  });

  document.getElementById('btn-limpiar-ent06').addEventListener('click', () => {
    activeFilter = { periodo: '', asignatura: '', seccion: '', estudiante: '' };
    document.getElementById('form-ent06').reset();
    repoblarSecciones();
    repoblarEstudiantes();
    showToast('Filtros limpiados.');
    actualizarEstatusFiltro();
  });
}

function actualizarEstatusFiltro() {
  const statusDiv = document.getElementById('ent06-status');
  const menuRep = document.getElementById('ent06-menu-reportes');
  if (!activeFilter.periodo || !activeFilter.asignatura || !activeFilter.seccion) {
    statusDiv.innerHTML = `
      <div class="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex gap-2">
        <span class="material-symbols-outlined text-base">warning</span>
        <span>Establece los filtros obligatorios (Periodo, Asignatura y Sección) para activar reportes.</span>
      </div>
    `;
    menuRep.classList.add('hidden');
    return;
  }
  const estText = activeFilter.estudiante ? `Estudiante: <strong class="text-slate-800">${activeFilter.estudiante}</strong>` : 'Todos los estudiantes';
  statusDiv.innerHTML = `
    <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs space-y-2">
      <div class="font-bold flex items-center gap-1.5 font-title">
        <span class="material-symbols-outlined text-emerald-600 text-sm">check_circle</span> Filtros Activos
      </div>
      <div class="grid grid-cols-2 gap-2 text-slate-600 font-semibold">
        <div>Período: <strong class="text-slate-800">${activeFilter.periodo}</strong></div>
        <div>Materia: <strong class="text-slate-800">${activeFilter.asignatura}</strong></div>
        <div>Sección: <strong class="text-slate-800">${activeFilter.seccion}</strong></div>
        <div>${estText}</div>
      </div>
    </div>
  `;
  menuRep.classList.remove('hidden');

  const selectStudentBtn = activeFilter.estudiante
    ? `
      <button onclick="verBoletinEstudianteDesdeRojo('${activeFilter.estudiante}')" class="w-full text-left p-4 bg-white border border-slate-150 rounded-2xl hover:shadow-md hover:border-emerald-500 transition group flex flex-col justify-between">
        <div>
          <span class="text-[9px] text-emerald-600 font-bold uppercase block font-title">RPT-01</span>
          <h4 class="font-bold text-sm text-slate-800 mt-1 font-title">Boletín Oficial de Calificaciones</h4>
          <p class="text-[11px] text-slate-400 mt-1 font-sans">Impresión formal y exportación JSON del expediente del estudiante.</p>
        </div>
        <span class="text-emerald-600 group-hover:translate-x-1 transition duration-200 text-xs font-bold mt-3 block font-title flex items-center gap-1">Generar Reporte <span class="material-symbols-outlined text-sm">arrow_forward</span></span>
      </button>
      <button onclick="verPensumEstudianteDesdeRojo('${activeFilter.estudiante}')" class="w-full text-left p-4 bg-white border border-slate-150 rounded-2xl hover:shadow-md hover:border-indigo-500 transition group flex flex-col justify-between">
        <div>
          <span class="text-[9px] text-indigo-600 font-bold uppercase block font-title">RPT-12</span>
          <h4 class="font-bold text-sm text-slate-800 mt-1 font-title">Estado de Avance del Pensum</h4>
          <p class="text-[11px] text-slate-400 mt-1 font-sans">Avance curricular de créditos y roadmap gráfico.</p>
        </div>
        <span class="text-indigo-600 group-hover:translate-x-1 transition duration-200 text-xs font-bold mt-3 block font-title flex items-center gap-1">Generar Reporte <span class="material-symbols-outlined text-sm">arrow_forward</span></span>
      </button>
      <button onclick="verIndiceEstudianteDesdeRojo('${activeFilter.estudiante}')" class="w-full text-left p-4 bg-white border border-slate-150 rounded-2xl hover:shadow-md hover:border-indigo-500 transition group flex flex-col justify-between">
        <div>
          <span class="text-[9px] text-indigo-600 font-bold uppercase block font-title">RPT-13</span>
          <h4 class="font-bold text-sm text-slate-800 mt-1 font-title">Índice Académico y Simulador</h4>
          <p class="text-[11px] text-slate-400 mt-1 font-sans">Cálculo detallado de puntos de honor y proyecciones.</p>
        </div>
        <span class="text-indigo-600 group-hover:translate-x-1 transition duration-200 text-xs font-bold mt-3 block font-title flex items-center gap-1">Generar Reporte <span class="material-symbols-outlined text-sm">arrow_forward</span></span>
      </button>
    `
    : '';

  menuRep.innerHTML = `
    ${selectStudentBtn}
    <button onclick="renderView('rpt04')" class="w-full text-left p-4 bg-white border border-slate-150 rounded-2xl hover:shadow-md hover:border-rose-500 transition group flex flex-col justify-between">
      <div>
        <span class="text-[9px] text-rose-600 font-bold uppercase block font-title">RPT-04</span>
        <h4 class="font-bold text-sm text-slate-800 mt-1 font-title">Alertas de Riesgo Académico</h4>
        <p class="text-[11px] text-slate-400 mt-1 font-sans">Estudiantes reprobados con promedio menor a 60.0 e inducción de alertas.</p>
      </div>
      <span class="text-rose-600 group-hover:translate-x-1 transition duration-200 text-xs font-bold mt-3 block font-title flex items-center gap-1">Generar Reporte <span class="material-symbols-outlined text-sm">arrow_forward</span></span>
    </button>
    <button onclick="renderView('rpt05')" class="w-full text-left p-4 bg-white border border-slate-150 rounded-2xl hover:shadow-md hover:border-amber-500 transition group flex flex-col justify-between">
      <div>
        <span class="text-[9px] text-amber-600 font-bold uppercase block font-title">RPT-05</span>
        <h4 class="font-bold text-sm text-slate-800 mt-1 font-title">Dashboard Semáforo</h4>
        <p class="text-[11px] text-slate-400 mt-1 font-sans">Vista del índice general y estado semafórico del grupo.</p>
      </div>
      <span class="text-amber-600 group-hover:translate-x-1 transition duration-200 text-xs font-bold mt-3 block font-title flex items-center gap-1">Generar Reporte <span class="material-symbols-outlined text-sm">arrow_forward</span></span>
    </button>
  `;
}

function verPensumEstudianteDesdeRojo(mat) {
  selectedStudentIndex = mat;
  renderView('rpt12');
}

function verIndiceEstudianteDesdeRojo(mat) {
  selectedStudentIndex = mat;
  renderView('rpt13');
}

// ============================================================
// 8. ENT-09: REGISTRO DE SECCIÓN
// ============================================================
let seccionEditandoId = null;
let seccionesCache = [];

async function renderENT09() {
  tituloModulo.textContent = 'ENT-09 · Registro de Secciones';
  seccionEditandoId = null;

  const periodos = await apiClient.getPeriodos();
  const asignaturas = await apiClient.getAsignaturas();
  const profesores = await apiClient.getProfesores();

  contenedor.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm self-start">
        <h3 id="ent09-form-titulo" class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-emerald-600">room_preferences</span> Nueva Sección
        </h3>
        <form id="form-ent09" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Período Académico</label>
            <select id="ent09-periodo" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              ${periodos.map(p => `<option value="${p.periodo}">${p.periodo} ${p.estado === 'Activo' ? '(Activo)' : ''}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Asignatura</label>
            <select id="ent09-asignatura" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              <option value="">Seleccione</option>
              ${asignaturas.map(a => `<option value="${a.codigo}">${a.codigo} - ${a.nombre}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Número de Sección</label>
            <input type="text" id="ent09-numero" placeholder="ej. 01" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Profesor Asignado</label>
            <select id="ent09-profesor" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required>
              <option value="">Seleccione</option>
              ${profesores.map(p => `<option value="${p.codigo}">${p.nombre}</option>`).join('')}
            </select>
          </div>
          <button type="submit" id="ent09-btn-guardar" class="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition shadow font-title">Guardar Sección</button>
          <button type="button" id="ent09-btn-cancelar" onclick="cancelarEdicionSeccion()" class="w-full mt-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title hidden">Cancelar edición</button>
        </form>
      </div>
      <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
        <h3 class="font-title text-lg font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4">Secciones Registradas</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                <th class="p-3">Periodo</th>
                <th class="p-3">Materia</th>
                <th class="p-3">Sección</th>
                <th class="p-3">Profesor</th>
                <th class="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="tbl-secciones"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  await actualizarTablaSecciones();

  document.getElementById('form-ent09').addEventListener('submit', async function (e) {
    e.preventDefault();
    const per = document.getElementById('ent09-periodo').value;
    const asig = document.getElementById('ent09-asignatura').value;
    const num = document.getElementById('ent09-numero').value.trim();
    const prof = document.getElementById('ent09-profesor').value;

    try {
      if (seccionEditandoId) {
        await apiClient.actualizarSeccion(seccionEditandoId, { numero: num, idAsignatura: asig, idProfesor: prof, periodo: per });
        showToast('Sección actualizada correctamente.');
        cancelarEdicionSeccion();
      } else {
        await apiClient.createSeccion({ numero: num, idAsignatura: asig, idProfesor: prof, periodo: per });
        showToast('Sección registrada correctamente.');
        this.reset();
      }
      await actualizarTablaSecciones();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  });
}

function editarSeccion(id) {
  const sec = seccionesCache.find(s => String(s.id) === String(id));
  if (!sec) return;

  seccionEditandoId = id;
  document.getElementById('ent09-periodo').value = sec.periodo || '';
  document.getElementById('ent09-asignatura').value = sec.codigoAsignatura || '';
  document.getElementById('ent09-numero').value = sec.numero || '';
  document.getElementById('ent09-profesor').value = sec.codigoProfesor || '';

  document.getElementById('ent09-form-titulo').innerHTML =
    '<span class="material-symbols-outlined text-emerald-600">edit</span> Editar Sección';
  document.getElementById('ent09-btn-guardar').textContent = 'Actualizar Sección';
  document.getElementById('ent09-btn-cancelar').classList.remove('hidden');

  document.getElementById('form-ent09').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelarEdicionSeccion() {
  seccionEditandoId = null;
  const form = document.getElementById('form-ent09');
  if (form) form.reset();

  const titulo = document.getElementById('ent09-form-titulo');
  const btnGuardar = document.getElementById('ent09-btn-guardar');
  const btnCancelar = document.getElementById('ent09-btn-cancelar');
  if (titulo) titulo.innerHTML = '<span class="material-symbols-outlined text-emerald-600">room_preferences</span> Nueva Sección';
  if (btnGuardar) btnGuardar.textContent = 'Guardar Sección';
  if (btnCancelar) btnCancelar.classList.add('hidden');
}

async function actualizarTablaSecciones() {
  const tbody = document.getElementById('tbl-secciones');
  if (!tbody) return;
  try {
    const secciones = await apiClient.getSecciones();
    seccionesCache = secciones;
    if (secciones.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">No hay secciones registradas.</td></tr>`;
      return;
    }
    tbody.innerHTML = secciones.map(sec => {
      const prof = sec.nombreProfesor || 'Sin asignar';
      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
          <td class="p-3 font-semibold font-mono text-slate-700">${sec.periodo}</td>
          <td class="p-3 text-slate-800 font-semibold font-mono">${sec.codigoAsignatura}</td>
          <td class="p-3 font-bold text-slate-600">${sec.numero}</td>
          <td class="p-3 text-slate-500">${prof}</td>
          <td class="p-3 text-right whitespace-nowrap">
            <button onclick="editarSeccion('${sec.id}')" class="p-1 text-slate-400 hover:text-emerald-600 rounded transition">
              <span class="material-symbols-outlined text-base">edit</span>
            </button>
            <button onclick="eliminarSeccion('${sec.id}')" class="p-1 text-slate-400 hover:text-rose-500 rounded transition">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showToast('Error al cargar secciones: ' + error.message, 'error');
  }
}


async function eliminarSeccion(id) {
  if (confirm('¿Deseas eliminar esta sección?')) {
    try {
      await apiClient.eliminarSeccion(id);
      showToast('Sección eliminada.', 'success');
      await actualizarTablaSecciones();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  }
}

// ============================================================
// 9. ENT-07: CARGA DE NOTAS
// ============================================================
async function renderENT07() {
  tituloModulo.textContent = 'ENT-07 · Carga de Calificaciones';

  const asignaturas = await apiClient.getAsignaturas();
  const profesores = await apiClient.getProfesores();
  const secciones = await apiClient.getSecciones();

  let materiasFiltradas = asignaturas;
  if (currentUser.rol === 'maestro') {
    const prof = profesores.find(p => p.correo === currentUser.usuario);
    if (prof) {
      const codigosDelProfesor = new Set(
        secciones.filter(s => s.codigoProfesor === prof.codigo).map(s => s.codigoAsignatura)
      );
      materiasFiltradas = asignaturas.filter(a => codigosDelProfesor.has(a.codigo));
    } else {
      materiasFiltradas = [];
    }
  }

  if (materiasFiltradas.length === 0) {
    contenedor.innerHTML = `
      <div class="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-500">
        <p class="font-semibold font-title">No tienes asignaturas a tu cargo asignadas en el sistema.</p>
        <p class="text-xs text-slate-400 mt-1">Asigna tu código en el catálogo de asignaturas.</p>
      </div>
    `;
    return;
  }

  contenedor.innerHTML = `
    <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
      <div class="flex flex-col md:flex-row md:items-end gap-4 pb-4 border-b border-slate-100">
        <div class="w-full md:w-80">
          <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Seleccionar Asignatura</label>
          <select id="ent07-select-asignatura" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
            <option value="">Seleccione Asignatura</option>
            ${materiasFiltradas.map(a => `<option value="${a.codigo}">${a.codigo} - ${a.nombre} (${a.creditos} CR)</option>`).join('')}
          </select>
        </div>
        <div class="w-full md:w-48">
          <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Sección</label>
          <select id="ent07-select-seccion" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" disabled>
            <option value="">Seleccione Asignatura primero</option>
          </select>
        </div>
        <button onclick="cargarTablaCalificacionesActa()" class="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition shrink-0 shadow shadow-emerald-600/10 font-title flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">grade</span> Cargar Listado
        </button>
      </div>
      <div id="ent07-contenedor-tabla" class="hidden space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
          <div class="text-[10px] text-slate-500 font-semibold">Normativa: Rango de calificaciones de 0 a 100.</div>
          <div class="flex flex-wrap gap-2">
            <button onclick="guardarActaNotas()" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-xl shadow transition font-title flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">save</span> [ PROCESAR NOTAS ]
            </button>
            <button onclick="exportarExcelActa()" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-xl shadow transition font-title flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">download</span> [ EXPORTAR EXCEL ]
            </button>
            <button onclick="simularEnviarAlertas()" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-xl shadow transition font-title flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">mail</span> [ ENVIAR ALERTAS ]
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <th class="p-3">Matrícula</th>
                <th class="p-3">Estudiante</th>
                <th class="p-3 w-20">AC1</th>
                <th class="p-3 w-20">AC2</th>
                <th class="p-3 w-20">AC3</th>
                <th class="p-3 w-20">Ex. Final</th>
                <th class="p-3">Nota Final</th>
                <th class="p-3">Literal</th>
                <th class="p-3">Estado</th>
              </tr>
            </thead>
            <tbody id="tbl-acta-estudiantes"></tbody>
          </table>
        </div>
      </div>
      <div id="ent07-mensaje-vacio" class="text-center py-8 text-slate-400 italic">Selecciona una asignatura y presiona "Cargar Listado" para calificar.</div>
    </div>
  `;

  document.getElementById('ent07-select-asignatura').addEventListener('change', function () {
    const selSeccion = document.getElementById('ent07-select-seccion');
    const codAsig = this.value;
    if (!codAsig) {
      selSeccion.innerHTML = '<option value="">Seleccione Asignatura primero</option>';
      selSeccion.disabled = true;
      return;
    }
    const seccionesDeLaAsignatura = secciones.filter(s => s.codigoAsignatura === codAsig);
    if (seccionesDeLaAsignatura.length === 0) {
      selSeccion.innerHTML = '<option value="">Sin secciones creadas</option>';
      selSeccion.disabled = true;
      return;
    }
    selSeccion.innerHTML = seccionesDeLaAsignatura
      .map(s => `<option value="${s.id}">Sección ${s.numero}</option>`)
      .join('');
    selSeccion.disabled = false;
  });
}

async function cargarTablaCalificacionesActa() {
  const codAsig = document.getElementById('ent07-select-asignatura').value;
  const idSeccion = document.getElementById('ent07-select-seccion').value;
  if (!codAsig) return;
  if (!idSeccion) {
    showToast('Selecciona una sección antes de cargar el listado.', 'error');
    return;
  }

  try {
    const estudiantes = await apiClient.getEstudiantesDeSeccion(idSeccion);
    const notasDB = await apiClient.getNotas({ asignatura: codAsig, seccion: idSeccion });

    const tbody = document.getElementById('tbl-acta-estudiantes');
    document.getElementById('ent07-contenedor-tabla').classList.remove('hidden');
    document.getElementById('ent07-mensaje-vacio').classList.add('hidden');

    if (estudiantes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-slate-400 italic">Esta sección todavía no tiene estudiantes inscritos.</td></tr>`;
      return;
    }

    tbody.innerHTML = estudiantes.map(est => {
      const notaExistente = notasDB.find(n => n.matriculaEstudiante === est.matricula) || {
        acum1: '', acum2: '', acum3: '', evalFinal: '', notaFinal: 0, literal: '-', estado: '-'
      };
      const finalVal = notaExistente.notaFinal ? notaExistente.notaFinal.toFixed(2) : '0.00';
      const finalColor = notaExistente.estado === 'Aprobado' ? 'text-emerald-600 font-bold' : (notaExistente.estado === 'Reprobado' ? 'text-rose-600 font-bold' : '');
      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition align-middle" data-matricula="${est.matricula}">
          <td class="p-3 font-mono font-bold text-slate-700">${est.matricula}</td>
          <td class="p-3 text-slate-800 font-bold">${est.nombre}</td>
          <td class="p-3">
            <input type="number" min="0" max="100" placeholder="0" value="${notaExistente.acum1}" 
              class="w-16 px-1.5 py-1 border border-slate-200 rounded text-center text-xs font-semibold focus:ring-1 focus:ring-emerald-500" 
              oninput="recalcularNotaFila(this)" data-campo="ac1">
          </td>
          <td class="p-3">
            <input type="number" min="0" max="100" placeholder="0" value="${notaExistente.acum2}" 
              class="w-16 px-1.5 py-1 border border-slate-200 rounded text-center text-xs font-semibold focus:ring-1 focus:ring-emerald-500" 
              oninput="recalcularNotaFila(this)" data-campo="ac2">
          </td>
          <td class="p-3">
            <input type="number" min="0" max="100" placeholder="0" value="${notaExistente.acum3}" 
              class="w-16 px-1.5 py-1 border border-slate-200 rounded text-center text-xs font-semibold focus:ring-1 focus:ring-emerald-500" 
              oninput="recalcularNotaFila(this)" data-campo="ac3">
          </td>
          <td class="p-3">
            <input type="number" min="0" max="100" placeholder="0" value="${notaExistente.evalFinal}" 
              class="w-16 px-1.5 py-1 border border-slate-200 rounded text-center text-xs font-semibold focus:ring-1 focus:ring-emerald-500" 
              oninput="recalcularNotaFila(this)" data-campo="final">
          </td>
          <td class="p-3 text-sm font-semibold text-slate-700"><span class="nota-final-span ${finalColor}">${finalVal}</span></td>
          <td class="p-3 text-sm font-bold text-slate-850"><span class="literal-span">${notaExistente.literal}</span></td>
          <td class="p-3"><span class="estado-badge-span px-2 py-0.5 rounded-full text-[10px] font-bold ${notaExistente.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' : (notaExistente.estado === 'Reprobado' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500')}">${notaExistente.estado || '-'}</span></td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showToast('Error al cargar acta: ' + error.message, 'error');
  }
}

function recalcularNotaFila(input) {
  const fila = input.closest('tr');
  const ac1 = parseInt(fila.querySelector('[data-campo="ac1"]').value) || 0;
  const ac2 = parseInt(fila.querySelector('[data-campo="ac2"]').value) || 0;
  const ac3 = parseInt(fila.querySelector('[data-campo="ac3"]').value) || 0;
  const exFinal = parseInt(fila.querySelector('[data-campo="final"]').value) || 0;
  const promedio = (ac1 + ac2 + ac3 + exFinal) / 4;
  const { literal, estado } = calcularLiteralYEstado(promedio);
  const spanFinal = fila.querySelector('.nota-final-span');
  const spanLiteral = fila.querySelector('.literal-span');
  const spanBadge = fila.querySelector('.estado-badge-span');
  spanFinal.textContent = promedio.toFixed(2);
  spanLiteral.textContent = literal;
  spanBadge.textContent = estado;
  spanFinal.className = `nota-final-span font-bold ${estado === 'Aprobado' ? 'text-emerald-600' : 'text-rose-600'}`;
  spanBadge.className = `estado-badge-span px-2 py-0.5 rounded-full text-[10px] font-bold ${estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`;
}

async function guardarActaNotas() {
  const codAsig = document.getElementById('ent07-select-asignatura').value;
  const idSeccionSel = document.getElementById('ent07-select-seccion').value;
  if (!codAsig) return;
  if (!idSeccionSel) {
    showToast('Selecciona una sección antes de guardar.', 'error');
    return;
  }

  const filas = document.querySelectorAll('#tbl-acta-estudiantes tr');
  const notas = [];
  let errorRango = false;

  filas.forEach(fila => {
    const matricula = fila.getAttribute('data-matricula');
    if (!matricula) return;
    const ac1 = parseInt(fila.querySelector('[data-campo="ac1"]').value) || 0;
    const ac2 = parseInt(fila.querySelector('[data-campo="ac2"]').value) || 0;
    const ac3 = parseInt(fila.querySelector('[data-campo="ac3"]').value) || 0;
    const fin = parseInt(fila.querySelector('[data-campo="final"]').value) || 0;
    if (ac1 < 0 || ac1 > 100 || ac2 < 0 || ac2 > 100 || ac3 < 0 || ac3 > 100 || fin < 0 || fin > 100) {
      errorRango = true;
      return;
    }
    const promedio = (ac1 + ac2 + ac3 + fin) / 4;
    const { literal, estado } = calcularLiteralYEstado(promedio);
    notas.push({
      idEstudiante: matricula,
      idAsignatura: codAsig,
      idSeccion: idSeccionSel,
      acum1: ac1, acum2: ac2, acum3: ac3,
      evalFinal: fin,
      notaFinal: promedio,
      literal, estado
    });
  });

  if (errorRango) {
    showToast('Las notas deben estar entre 0 y 100.', 'error');
    return;
  }

  try {
    await apiClient.saveNotas(notas);
    showToast(`Se guardó el acta. Total de registros: ${notas.length}`);
    cargarTablaCalificacionesActa();
  } catch (error) {
    showToast('Error al guardar notas: ' + error.message, 'error');
  }
}

function acStr(val) { return val === '' ? 0 : parseInt(val); }

function exportarExcelActa() {
  const codAsig = document.getElementById('ent07-select-asignatura').value;
  if (!codAsig) return;
  const filas = document.querySelectorAll('#tbl-acta-estudiantes tr');
  let csvContent = "Matricula,Estudiante,AC1,AC2,AC3,Final,NotaFinal,Literal,Estado\n";
  filas.forEach(fila => {
    const mat = fila.getAttribute('data-matricula');
    if (!mat) return;
    const nom = fila.cells[1].textContent;
    const ac1 = fila.querySelector('[data-campo="ac1"]').value || '0';
    const ac2 = fila.querySelector('[data-campo="ac2"]').value || '0';
    const ac3 = fila.querySelector('[data-campo="ac3"]').value || '0';
    const fin = fila.querySelector('[data-campo="final"]').value || '0';
    const notaF = fila.querySelector('.nota-final-span').textContent;
    const lit = fila.querySelector('.literal-span').textContent;
    const est = fila.querySelector('.estado-badge-span').textContent;
    csvContent += `"${mat}","${nom}",${ac1},${ac2},${ac3},${fin},${notaF},"${lit}","${est}"\n`;
  });
  downloadCSV(`acta_${codAsig}.csv`, csvContent);
  showToast('Calificaciones exportadas en formato CSV.');
}

async function simularEnviarAlertas() {
  const codAsig = document.getElementById('ent07-select-asignatura').value;
  if (!codAsig) return;
  const filas = document.querySelectorAll('#tbl-acta-estudiantes tr');
  const estudiantes = await apiClient.getEstudiantes();
  const notificaciones = [];
  filas.forEach(fila => {
    const mat = fila.getAttribute('data-matricula');
    if (!mat) return;
    const notaF = parseFloat(fila.querySelector('.nota-final-span').textContent) || 0;
    const est = estudiantes.find(e => e.matricula === mat);
    if (notaF < 60.0 && est) {
      notificaciones.push({
        id_estudiante: mat,
        asunto: `Alerta Académica: ${codAsig}`,
        mensaje: `Riesgo detectado en ${codAsig}. Calificación actual de ${notaF.toFixed(1)}. Acuda a consejería.`,
        fecha_envio: new Date().toISOString().split('T')[0],
        estado: 'Enviado'
      });
    }
  });
  if (notificaciones.length > 0) {
    try {
      await apiClient.crearNotificaciones(notificaciones);
      showToast(`Se han enviado ${notificaciones.length} alertas de correo.`);
    } catch (error) {
      showToast('Error al enviar alertas: ' + error.message, 'error');
    }
  } else {
    showToast('No se encontraron estudiantes reprobados (calificación < 60.0).');
  }
}

// ============================================================
// 10. ENT-08: CONFIGURACIÓN DE UMBRALES
// ============================================================
async function renderENT08() {
  tituloModulo.textContent = 'ENT-08 · Configuración de Umbrales';
  const config = await apiClient.getConfiguracion();

  contenedor.innerHTML = `
    <div class="max-w-2xl bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
      <div class="pb-3 border-b border-slate-100">
        <h3 class="font-title text-lg font-bold text-slate-800">Parámetros de Semáforo</h3>
        <p class="text-xs text-slate-400 mt-1">Ajusta los umbrales requeridos de índice acumulado.</p>
      </div>
      <form id="form-ent08" class="space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Riesgo (Reprobado general)</label>
            <input type="number" id="ent08-riesgo" value="${config.riesgo}" class="w-full px-3 py-2 border rounded-lg text-sm" readonly>
            <span class="text-[9px] text-slate-400">Equivale a nota reprobatoria de 60.0</span>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Rojo Automático</label>
            <input type="text" value="Menor que Amarillo (< 2.5)" class="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50" readonly disabled>
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label class="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-emerald-500 block"></span> Índice Mínimo Verde
            </label>
            <span class="text-sm font-extrabold text-emerald-600 font-mono" id="val-verde">${config.verde.toFixed(2)}</span>
          </div>
          <input type="range" id="ent08-verde" min="0" max="4" step="0.1" value="${config.verde}" class="w-full accent-emerald-500 cursor-pointer" oninput="document.getElementById('val-verde').textContent = parseFloat(this.value).toFixed(2)">
        </div>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label class="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-amber-500 block"></span> Índice Mínimo Amarillo
            </label>
            <span class="text-sm font-extrabold text-amber-600 font-mono" id="val-amarillo">${config.amarillo.toFixed(2)}</span>
          </div>
          <input type="range" id="ent08-amarillo" min="0" max="4" step="0.1" value="${config.amarillo}" class="w-full accent-amber-500 cursor-pointer" oninput="document.getElementById('val-amarillo').textContent = parseFloat(this.value).toFixed(2)">
        </div>
        <div class="flex gap-2">
          <button type="submit" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition font-title">[ GUARDAR CONFIG ]</button>
          <button type="button" onclick="restaurarConfigUmbrales()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title">[ RESTAURAR ]</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('form-ent08').addEventListener('submit', async function (e) {
    e.preventDefault();
    const verde = parseFloat(document.getElementById('ent08-verde').value);
    const amarillo = parseFloat(document.getElementById('ent08-amarillo').value);
    if (verde <= amarillo) {
      showToast('El verde debe ser mayor al amarillo.', 'error');
      return;
    }
    try {
      await apiClient.updateConfiguracion({ verde, amarillo });
      showToast('Umbrales de semaforización guardados.');
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  });
}

async function restaurarConfigUmbrales() {
  try {
    await apiClient.updateConfiguracion({ verde: 3.2, amarillo: 2.5 });
    showToast('Configuración restaurada.');
    renderENT08();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

// ============================================================
// ENT-11: INSCRIPCIÓN DE MATERIAS (AUTO-SERVICIO ESTUDIANTE)
// El estudiante elige sus propias secciones; el profesor ya viene
// asignado desde ENT-09 (Registro de Sección), hecho por el admin.
// ============================================================
async function renderENT11() {
  tituloModulo.textContent = 'ENT-11 · Inscripción de Materias';

  if (currentUser.rol !== 'estudiante') {
    contenedor.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400 italic">Este módulo es de autoservicio para estudiantes.</div>`;
    return;
  }

  contenedor.innerHTML = `<div class="text-center text-slate-400 italic py-10">Cargando tus datos...</div>`;

  let estudiantes, periodos;
  try {
    [estudiantes, periodos] = await Promise.all([
      apiClient.getEstudiantes(),
      apiClient.getPeriodos()
    ]);
  } catch (error) {
    contenedor.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-rose-100 text-rose-500 text-center">Error al cargar datos: ${error.message}</div>`;
    return;
  }

  const yo = estudiantes.find(e => e.correo === currentUser.usuario);
  if (!yo) {
    contenedor.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400 italic">No encontramos tu registro de estudiante asociado a este correo. Contacta a administración.</div>`;
    return;
  }

  const periodoActivo = periodos.find(p => p.estado === 'Activo') || periodos[0];

  contenedor.innerHTML = `
    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <label class="text-xs font-semibold text-slate-500 uppercase shrink-0">Periodo</label>
      <select id="ent11-periodo" class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
        ${periodos.map(p => `<option value="${p.periodo}" ${periodoActivo && p.periodo === periodoActivo.periodo ? 'selected' : ''}>${p.periodo}${p.estado === 'Activo' ? ' (Activo)' : ''}</option>`).join('')}
      </select>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-emerald-600">school</span> Mis Materias Inscritas
        </h3>
        <div id="ent11-mis-materias" class="space-y-2 text-sm text-slate-400 italic">Cargando...</div>
      </div>
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span class="material-symbols-outlined text-emerald-600">list_alt</span> Secciones Disponibles
        </h3>
        <div id="ent11-disponibles" class="space-y-2 text-sm text-slate-400 italic">Cargando...</div>
      </div>
    </div>
  `;

  document.getElementById('ent11-periodo').addEventListener('change', () => cargarInscripcion(yo));
  await cargarInscripcion(yo);
}

async function cargarInscripcion(yo) {
  const periodoSel = document.getElementById('ent11-periodo').value;
  const contMisMaterias = document.getElementById('ent11-mis-materias');
  const contDisponibles = document.getElementById('ent11-disponibles');
  contMisMaterias.innerHTML = 'Cargando...';
  contDisponibles.innerHTML = 'Cargando...';

  try {
    const [misSecciones, todasLasSecciones, pensumData] = await Promise.all([
      apiClient.getSeccionesDeEstudiante(yo.matricula),
      apiClient.getSecciones(),
      // Necesitamos la carrera del estudiante para mostrar solo secciones
      // que pertenezcan a su plan de estudios (de lo contrario un estudiante
      // de contabilidad vería materias de sistemas).
      apiClient.getPensumPorEstudiante(yo.matricula)
    ]);
    // El endpoint /estudiantes/:idOrMatricula/pensum devuelve la estructura
    // anidada { estudiante: { carrera: { id, ... } }, asignaturas: [...] }.
    // Soportamos ambas formas por si cambia la forma en el futuro.
    const carreraEstudiante =
      pensumData?.estudiante?.carrera?.id ??
      pensumData?.carrera?.id ??
      null;

    const misSeccionesDelPeriodo = misSecciones.filter(s => s.periodo === periodoSel);
    const idsInscritos = new Set(misSeccionesDelPeriodo.map(s => s.id));
    const asignaturasInscritas = new Set(misSeccionesDelPeriodo.map(s => s.codigoAsignatura));

    // --- Mis materias inscritas ---
    if (misSeccionesDelPeriodo.length === 0) {
      contMisMaterias.innerHTML = `<p class="text-center text-slate-400 italic py-4">Todavía no te has inscrito en ninguna materia este periodo.</p>`;
    } else {
      contMisMaterias.innerHTML = misSeccionesDelPeriodo.map(s => `
        <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
          <div>
            <p class="font-bold text-slate-700 text-sm">${s.codigoAsignatura} · ${s.nombreAsignatura}</p>
            <p class="text-xs text-slate-400">Sección ${s.numero} · Prof. ${s.nombreProfesor || 'Sin asignar'} · ${s.creditos} CR</p>
          </div>
          <button onclick="darseDeBaja(${s.id}, '${yo.matricula}')" class="p-1.5 text-slate-400 hover:text-rose-500 rounded transition shrink-0" title="Darme de baja">
            <span class="material-symbols-outlined text-base">remove_circle</span>
          </button>
        </div>
      `).join('');
    }

    // --- Secciones disponibles del periodo seleccionado ---
    // Filtramos por carrera del estudiante: si la sección no tiene id_carrera
    // (caso común: asignaturas creadas antes de que se setee id_pensum) las
    // mostramos con una advertencia para que el admin sepa que debe corregirlas.
    const seccionesDelPeriodo = todasLasSecciones.filter(s =>
      s.periodo === periodoSel && s.estado !== 'Inactiva'
    );

    if (!carreraEstudiante) {
      console.warn('[ENT-11] No se pudo determinar la carrera del estudiante. Respuesta del pensum:', pensumData);
      contDisponibles.innerHTML = `<p class="text-center text-amber-600 italic py-4">No se pudo determinar tu carrera. Contacta a administración.</p>`;
      return;
    }
    if (seccionesDelPeriodo.length === 0) {
      contDisponibles.innerHTML = `<p class="text-center text-slate-400 italic py-4">No hay secciones creadas para este periodo todavía.</p>`;
      return;
    }

    // Diagnóstico: avisar cuando las secciones existen pero las asignaturas
    // no tienen pensum/carrera asociados (dato que viene como null/undefined
    // desde el JOIN). Esto casi siempre significa que las asignaturas se
    // crearon antes de que se seteara id_pensum correctamente.
    const seccionesSinCarrera = seccionesDelPeriodo.filter(s => s.idCarrera == null);

    const disponibles = seccionesDelPeriodo.filter(s => s.idCarrera === carreraEstudiante);

    if (disponibles.length === 0) {
      if (seccionesSinCarrera.length > 0) {
        // Listamos los nombres de las asignaturas huérfanas para que se entienda
        // exactamente cuáles son y se pueda pedir al admin que las corrija.
        const nombresHuerfanas = seccionesSinCarrera.map(s =>
          `${s.codigoAsignatura || 'sin-código'} · ${s.nombreAsignatura || 'sin nombre'}`
        ).join(', ');
        console.warn('[ENT-11] Sin secciones para carrera', carreraEstudiante, '. Periodo:', periodoSel, '. Total secciones del periodo:', seccionesDelPeriodo.length, '. Sin idCarrera:', seccionesSinCarrera.length, seccionesSinCarrera);
        contDisponibles.innerHTML = `<p class="text-center text-amber-600 italic py-4 text-xs">Las secciones abiertas este periodo (${nombresHuerfanas}) no pertenecen al plan de estudios de tu carrera. Pide a administración que revise ENT-02 (Asignaturas) y les asigne el pensum correcto.</p>`;
        return;
      }
      contDisponibles.innerHTML = `<p class="text-center text-slate-400 italic py-4">No hay secciones disponibles para tu carrera en este periodo todavía.</p>`;
      return;
    }

    contDisponibles.innerHTML = disponibles.map(s => {
      const yaInscritoAqui = idsInscritos.has(s.id);
      const yaInscritoEnOtraSeccionDeEstaMateria = asignaturasInscritas.has(s.codigoAsignatura) && !yaInscritoAqui;
      let boton;
      if (yaInscritoAqui) {
        boton = `<span class="px-3 py-1.5 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg">Inscrito</span>`;
      } else if (yaInscritoEnOtraSeccionDeEstaMateria) {
        boton = `<span class="px-3 py-1.5 bg-slate-100 text-slate-400 font-semibold text-xs rounded-lg" title="Ya estás inscrito en otra sección de esta materia">No disponible</span>`;
      } else {
        boton = `<button onclick="inscribirme(${s.id}, '${yo.matricula}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition">Inscribirme</button>`;
      }
      return `
        <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
          <div>
            <p class="font-bold text-slate-700 text-sm">${s.codigoAsignatura} · ${s.nombreAsignatura || ''}</p>
            <p class="text-xs text-slate-400">Sección ${s.numero} · Prof. ${s.nombreProfesor || 'Sin asignar'}</p>
          </div>
          ${boton}
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('[ENT-11] Error cargando inscripción:', error);
    contMisMaterias.innerHTML = `<p class="text-rose-500">Error: ${error.message}</p>`;
    contDisponibles.innerHTML = '';
  }
}

async function inscribirme(idSeccion, matricula) {
  try {
    await apiClient.inscribirseEnSeccion(idSeccion, matricula);
    showToast('¡Inscripción realizada con éxito!', 'success');
    await cargarInscripcion({ matricula });
  } catch (error) {
    showToast('Error al inscribirte: ' + error.message, 'error');
  }
}

async function darseDeBaja(idSeccion, matricula) {
  if (!confirm('¿Deseas darte de baja de esta materia?')) return;
  try {
    await apiClient.desmatricularEstudiante(idSeccion, matricula);
    showToast('Te diste de baja de la materia.', 'success');
    await cargarInscripcion({ matricula });
  } catch (error) {
    showToast('Error al darte de baja: ' + error.message, 'error');
  }
}


async function renderRPT01() {
  tituloModulo.textContent = 'RPT-01 · Reporte de Progreso Académico';

  // El maestro no tiene acceso al boletín del estudiante: ya no aparece en su menú,
  // pero si alguien llega a esta vista por URL se bloquea aquí también.
  if (currentUser.rol === 'maestro') {
    contenedor.innerHTML = `
      <div class="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm text-center">
        <span class="material-symbols-outlined text-5xl text-slate-300 block mb-3">lock</span>
        <h3 class="font-title text-lg font-bold text-slate-700">Acceso restringido</h3>
        <p class="text-slate-400 text-sm mt-2 max-w-md mx-auto">El Boletín Oficial de Calificaciones no está disponible para cuentas de maestro. Esta vista es exclusiva de administradores y del propio estudiante.</p>
      </div>
    `;
    return;
  }

  const estudiantes = await apiClient.getEstudiantes();
  let menuSeleccion = '';

  if (currentUser.rol === 'estudiante') {
    const estActual = estudiantes.find(e => e.correo === currentUser.usuario);
    selectedStudentIndex = estActual ? estActual.matricula : '';
  }

  if (currentUser.rol !== 'estudiante') {
    menuSeleccion = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-end gap-4 no-print mb-6">
        <div class="flex-1">
          <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Seleccionar Estudiante</label>
          <select id="rpt01-select-estudiante" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
            <option value="">Seleccione Estudiante</option>
            ${estudiantes.map(e => `<option value="${e.matricula}" ${selectedStudentIndex === e.matricula ? 'selected' : ''}>${e.matricula} - ${e.nombre}</option>`).join('')}
          </select>
        </div>
        <button onclick="cargarBoletinEstudiante()" class="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition shrink-0 font-title">Generar Boletín</button>
      </div>
    `;
  }

  contenedor.innerHTML = `
    ${menuSeleccion}
    <div id="rpt01-contenedor-boletin"></div>
  `;

  if (selectedStudentIndex !== '') {
    await cargarBoletinEstudiante();
  } else {
    document.getElementById('rpt01-contenedor-boletin').innerHTML = `
      <div class="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400 italic">Selecciona un estudiante y presiona "Generar Boletín" para ver el informe.</div>
    `;
  }
}

async function cargarBoletinEstudiante() {
  const select = document.getElementById('rpt01-select-estudiante');
  if (select) selectedStudentIndex = select.value;
  if (!selectedStudentIndex) return;

  try {
    const [estudiantes, carreras, asignaturas, notas] = await Promise.all([
      apiClient.getEstudiantes(),
      apiClient.getCarreras(),
      apiClient.getAsignaturas(),
      apiClient.getNotas({ estudiante: selectedStudentIndex })
    ]);
    const est = estudiantes.find(e => e.matricula === selectedStudentIndex);
    if (!est) return;

    // FIX: backend ya devuelve carreraNombre / carreraCodigo vía JOIN.
    // Antes hacía lookup por est.carrera (campo inexistente) y mostraba vacío.
    const carreraNombre = est.carreraNombre || est.carreraCodigo || '— sin carrera —';
    const indice = calcularIndiceEstudiante(est.matricula, notas, asignaturas);

    let listadoNotasHTML = '';
    if (notas.length === 0) {
      listadoNotasHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">No registra materias cursadas.</td></tr>`;
    } else {
      listadoNotasHTML = notas.map(n => {
        const asig = asignaturas.find(a => a.id_asignatura === n.idAsignatura) || { codigo: n.idAsignatura, nombre: n.nombreAsignatura || n.idAsignatura, creditos: 0 };
        return `
          <tr class="border-b border-slate-100 text-xs">
            <td class="p-3 font-mono font-bold text-slate-700">${asig.codigo}</td>
            <td class="p-3 text-slate-800 font-bold">${asig.nombre}</td>
            <td class="p-3 text-center text-slate-500 font-mono">${asig.creditos}</td>
            <td class="p-3 text-center font-semibold text-slate-500 font-mono">${n.notaFinal.toFixed(1)}</td>
            <td class="p-3 text-center font-bold text-slate-850 font-title">${n.literal}</td>
            <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${n.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${n.estado || '-'}</span></td>
          </tr>
        `;
      }).join('');
    }

    document.getElementById('rpt01-contenedor-boletin').innerHTML = `
      <div class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div class="bg-slate-900 p-8 text-white">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <span class="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px] uppercase font-bold tracking-wider font-title">Boletín Oficial</span>
              <h3 class="font-title text-2xl font-extrabold mt-2 text-white">${est.nombre}</h3>
              <p class="text-slate-400 text-xs mt-1">Matrícula: <strong class="font-mono text-white">${est.matricula}</strong> | Carrera: <strong class="text-white">${carreraNombre}</strong></p>
            </div>
            <div class="text-right bg-white/5 p-4 rounded-2xl border border-white/10 shrink-0">
              <span class="text-[10px] text-slate-400 uppercase font-bold block font-title">Índice Acumulado</span>
              <span class="font-title text-3xl font-extrabold text-white">${indice.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div class="p-8">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th class="p-3">Código</th>
                  <th class="p-3">Asignatura</th>
                  <th class="p-3 text-center">Créditos</th>
                  <th class="p-3 text-center">Nota Final</th>
                  <th class="p-3 text-center">Literal</th>
                  <th class="p-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>${listadoNotasHTML}</tbody>
            </table>
          </div>
          <div class="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center gap-6">
            <div class="text-[10px] text-slate-400 font-title font-bold">taskUni · Universidad Nacional Pedro Henríquez Ureña</div>
            <div class="flex gap-2 no-print">
              <button onclick="window.print()" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow font-title">[ GENERAR PDF ]</button>
              <button onclick="exportarJSONBoletin()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow font-title">[ EXPORTAR JSON ]</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast('Error al cargar boletín: ' + error.message, 'error');
  }
}

function exportarJSONBoletin() {
  // Función similar a la original pero sin localStorage
  showToast('Función de exportación JSON activa, pero los datos se obtienen de la API.', 'success');
}

// ============================================================
// 12. RPT-04: ALERTAS DE RIESGO ACADÉMICO
// ============================================================
async function renderRPT04() {
  tituloModulo.textContent = 'RPT-04 · Alertas de Riesgo Académico';

  try {
    const [notas, estudiantes, asignaturas, misMatriculas] = await Promise.all([
      apiClient.getNotas(),
      apiClient.getEstudiantes(),
      apiClient.getAsignaturas(),
      obtenerMatriculasEstudiantesDeMaestro()
    ]);

    const reprobados = [];
    notas.forEach(nota => {
      if (misMatriculas && !misMatriculas.has(nota.matriculaEstudiante)) return;
      if (nota.notaFinal < 60.0) {
        const est = estudiantes.find(e => e.matricula === nota.matriculaEstudiante);
        const asig = asignaturas.find(a => a.id_asignatura === nota.idAsignatura);
        if (est && asig) {
          reprobados.push({
            matricula: est.matricula,
            nombre: est.nombre,
            correo: est.correo,
            asignatura: asig.codigo,
            nombreAsig: asig.nombre,
            promedio: nota.notaFinal,
            puntos: literalAPuntos(nota.literal),
            umbral: 60.0,
            diferencia: nota.notaFinal - 60.0
          });
        }
      }
    });

    let tbodyHTML = '';
    if (reprobados.length === 0) {
      tbodyHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400 italic">No se detectaron alertas de riesgo académico en el período actual.</td></tr>`;
    } else {
      tbodyHTML = reprobados.map(r => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
          <td class="p-3 font-mono font-bold text-slate-700">${r.matricula}</td>
          <td class="p-3 font-bold text-slate-800">${r.nombre}</td>
          <td class="p-3 font-mono font-bold text-slate-700">${r.asignatura} - ${r.nombreAsig}</td>
          <td class="p-3 font-semibold text-rose-600 text-center font-mono">${r.promedio.toFixed(1)}</td>
          <td class="p-3 text-center font-bold text-slate-500 font-mono">${r.puntos.toFixed(1)}</td>
          <td class="p-3 text-center font-mono font-semibold text-slate-500">${r.umbral.toFixed(1)}</td>
          <td class="p-3 text-center font-mono font-bold text-rose-700">${r.diferencia.toFixed(1)}</td>
        </tr>
      `).join('');
    }

    contenedor.innerHTML = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div class="pb-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 class="font-title text-lg font-bold text-slate-800">Detección de Riesgo Académico</h3>
            <p class="text-xs text-slate-400 mt-1">Estudiantes reprobados con calificaciones de asignatura menores al umbral de 60.0</p>
          </div>
          <button onclick="enviarAlertasRPT04()" class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow shadow-rose-600/10 font-title flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">mail</span> [ ENVIAR ALERTAS POR CORREO ]
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th class="p-3">ID Est.</th>
                <th class="p-3">Estudiante</th>
                <th class="p-3">Asignatura</th>
                <th class="p-3 text-center">Promedio</th>
                <th class="p-3 text-center">Pts Honor</th>
                <th class="p-3 text-center">Umbral</th>
                <th class="p-3 text-center">Diferencia</th>
              </tr>
            </thead>
            <tbody>${tbodyHTML}</tbody>
          </table>
        </div>
        <div class="p-4 bg-rose-50 border border-rose-150 rounded-2xl flex gap-3 text-rose-800 text-xs">
          <span class="material-symbols-outlined text-rose-600">warning</span>
          <div>
            <h5 class="font-bold">Mensaje Informativo de Alerta</h5>
            <p class="mt-1">"Riesgo académico detectado. Consulte con su asesor de carrera para evaluar plan de tutoría académica."</p>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast('Error al cargar alertas: ' + error.message, 'error');
  }
}

async function enviarAlertasRPT04() {
  try {
    const [notas, estudiantes, asignaturas, misMatriculas] = await Promise.all([
      apiClient.getNotas(),
      apiClient.getEstudiantes(),
      apiClient.getAsignaturas(),
      obtenerMatriculasEstudiantesDeMaestro()
    ]);
    const notificaciones = [];
    notas.forEach(nota => {
      if (misMatriculas && !misMatriculas.has(nota.matriculaEstudiante)) return;
      if (nota.notaFinal < 60.0) {
        const est = estudiantes.find(e => e.matricula === nota.matriculaEstudiante);
        const asig = asignaturas.find(a => a.id_asignatura === nota.idAsignatura);
        if (est && asig) {
          notificaciones.push({
            id_estudiante: est.id_estudiante,
            asunto: 'Alerta Académica: Riesgo Detectado',
            mensaje: `Se ha detectado riesgo académico en la materia ${asig.codigo} (${asig.nombre}) con un promedio de ${nota.notaFinal.toFixed(1)}. Consulte con su asesor.`,
            fecha_envio: new Date().toISOString().split('T')[0],
            estado: 'Enviado'
          });
        }
      }
    });
    if (notificaciones.length > 0) {
      await apiClient.crearNotificaciones(notificaciones);
      showToast(`Se han enviado exitosamente ${notificaciones.length} correos de alerta.`);
    } else {
      showToast('No hay alertas que enviar.', 'error');
    }
  } catch (error) {
    showToast('Error al enviar alertas: ' + error.message, 'error');
  }
}

// ============================================================
// 13. RPT-07: BITÁCORA DE CORREOS
// ============================================================
async function renderRPT07() {
  tituloModulo.textContent = 'RPT-07 · Notificaciones de Correo';
  try {
    const [notificacionesAll, estudiantes, misMatriculas] = await Promise.all([
      apiClient.getNotificaciones(),
      apiClient.getEstudiantes(),
      obtenerMatriculasEstudiantesDeMaestro()
    ]);

    // n.id_estudiante es el id_estudiante numérico (columna INT en Notificacion),
    // por lo que el cruce con Estudiante debe ser por id, no por matrícula.
    let notificaciones = notificacionesAll;
    if (currentUser.rol === 'estudiante') {
      const yo = estudiantes.find(e => e.correo === currentUser.usuario);
      notificaciones = yo ? notificacionesAll.filter(n => n.id_estudiante === yo.id_estudiante) : [];
    } else if (currentUser.rol === 'maestro' && misMatriculas) {
      const idsDeMisEstudiantes = new Set(
        estudiantes.filter(e => misMatriculas.has(e.matricula)).map(e => e.id_estudiante)
      );
      notificaciones = notificacionesAll.filter(n => idsDeMisEstudiantes.has(n.id_estudiante));
    }

    let filasHTML = '';
    if (notificaciones.length === 0) {
      filasHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">No se han registrado correos enviados.</td></tr>`;
    } else {
      filasHTML = notificaciones.map(n => {
        const est = estudiantes.find(e => e.id_estudiante === n.id_estudiante);
        const email = est ? est.correo : `id_estudiante ${n.id_estudiante} (no encontrado)`;
        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
            <td class="p-3 font-mono font-bold text-slate-700">${n.id_notificacion}</td>
            <td class="p-3 font-semibold text-slate-800">${email}</td>
            <td class="p-3 font-bold text-slate-700">${n.asunto}</td>
            <td class="p-3 text-slate-500 font-medium">${n.mensaje}</td>
            <td class="p-3 font-mono text-slate-500">${n.fecha_envio}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 font-title">${n.estado}</span></td>
          </tr>
        `;
      }).join('');
    }
    contenedor.innerHTML = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 class="font-title text-lg font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4">Bitácora de Notificaciones por Correo</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th class="p-3">ID Correo</th>
                <th class="p-3">Destinatario</th>
                <th class="p-3">Asunto</th>
                <th class="p-3">Mensaje / Tarea</th>
                <th class="p-3">Vencimiento / Fecha</th>
                <th class="p-3">Estatus</th>
              </tr>
            </thead>
            <tbody>${filasHTML}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    showToast('Error al cargar notificaciones: ' + error.message, 'error');
  }
}

async function getPeriodoActivo() {
  try {
    const periodos = await apiClient.getPeriodos();
    const activo = periodos.find(p => p.estado === 'Activo');
    return activo ? activo.periodo : '9-2026';
  } catch {
    return '9-2026';
  }
}

// ============================================================
// 15. RPT-05: DASHBOARD SEMÁFORO
// ============================================================
async function renderRPT05() {
  tituloModulo.textContent = 'RPT-05 · Dashboard Semáforo';

  contenedor.innerHTML = `
    <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 class="font-title text-lg font-bold text-slate-800">Semáforo de Alertas</h3>
          <p class="text-xs text-slate-400 mt-1">Clasificación de alumnos según rango académico.</p>
        </div>
        <div class="flex gap-2 w-full md:w-auto">
          <select id="rpt05-filter-color" class="px-3 py-1.5 border rounded-lg text-xs font-title font-bold focus:ring-1 focus:ring-emerald-500">
            <option value="">Todos los Estados</option>
            <option value="verde">Verde (>= 3.2)</option>
            <option value="amarillo">Amarillo (2.5 - 3.2)</option>
            <option value="rojo">Rojo (< 2.5)</option>
          </select>
          <input type="text" id="rpt05-search" placeholder="Buscar alumno..." class="px-3 py-1.5 border rounded-lg text-xs w-full sm:w-56">
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="rpt05-grid-estudiantes"></div>
    </div>
  `;

  await actualizarGridSemaforo();

  document.getElementById('rpt05-filter-color').addEventListener('change', actualizarGridSemaforo);
  document.getElementById('rpt05-search').addEventListener('input', actualizarGridSemaforo);
}

async function actualizarGridSemaforo() {
  const grid = document.getElementById('rpt05-grid-estudiantes');
  const filterColor = document.getElementById('rpt05-filter-color').value;
  const searchVal = document.getElementById('rpt05-search').value.trim().toLowerCase();

  try {
    // Get all students data
    const [estudiantesAll, carreras, config, notas, asignaturas] = await Promise.all([
      apiClient.getEstudiantes(),
      apiClient.getCarreras(),
      apiClient.getConfiguracion(),
      apiClient.getNotas(),
      apiClient.getAsignaturas()
    ]);

    // Si la sesión es de un estudiante, mostramos solo su tarjeta de semáforo.
    // Antes se hacía con mutación del array (length=0, push) que era confuso y
    // propenso a errores; aquí hacemos un filtro inmutable.
    let estudiantes = estudiantesAll;
    if (currentUser.rol === 'estudiante') {
      estudiantes = estudiantesAll.filter(e => e.correo === currentUser.usuario);
    } else if (currentUser.rol === 'maestro') {
      // Un maestro solo debe ver el semáforo de los estudiantes inscritos en
      // secciones que él imparte, no la población completa de la universidad.
      const misMatriculas = await obtenerMatriculasEstudiantesDeMaestro();
      if (misMatriculas) {
        estudiantes = estudiantesAll.filter(e => misMatriculas.has(e.matricula));
      }
    }

    let filtrados = estudiantes.filter(est => {
      const matchesSearch = est.nombre.toLowerCase().includes(searchVal) || est.matricula.includes(searchVal);
      if (!matchesSearch) return false;
      const notasEst = notas.filter(n => n.matriculaEstudiante === est.matricula);
      const tieneNotas = notasEst.length > 0;
      let colorSemaforo = 'sin';
      if (tieneNotas) {
        const ind = calcularIndiceEstudiante(est.matricula, notas, asignaturas);
        if (ind >= config.verde) colorSemaforo = 'verde';
        else if (ind >= config.amarillo) colorSemaforo = 'amarillo';
        else colorSemaforo = 'rojo';
      }
      if (filterColor !== '' && colorSemaforo !== filterColor) return false;
      return true;
    });

    if (filtrados.length === 0) {
      grid.innerHTML = `<div class="col-span-3 text-center text-slate-400 italic py-12">No hay estudiantes.</div>`;
      return;
    }

    grid.innerHTML = filtrados.map(est => {
      const ind = calcularIndiceEstudiante(est.matricula, notas, asignaturas);
      const notasEst = notas.filter(n => n.matriculaEstudiante === est.matricula);
      const tieneNotas = notasEst.length > 0;

      let colorBadge = 'bg-slate-100 text-slate-500 border-slate-200';
      let semIcon = 'O';
      let semText = 'Sin Notas';
      let progBarColor = 'bg-slate-300';

      if (tieneNotas) {
        if (ind >= config.verde) {
          colorBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          semIcon = 'V';
          semText = 'Verde (Alto)';
          progBarColor = 'bg-emerald-500';
        } else if (ind >= config.amarillo) {
          colorBadge = 'bg-amber-50 text-amber-700 border-amber-200';
          semIcon = 'A';
          semText = 'Amarillo (Alerta)';
          progBarColor = 'bg-amber-500';
        } else {
          colorBadge = 'bg-rose-50 text-rose-700 border-rose-200';
          semIcon = 'R';
          semText = 'Rojo (Riesgo)';
          progBarColor = 'bg-rose-500';
        }
      }

      const carreraNombre = est.carreraNombre || est.carreraCodigo || '— sin carrera —';
      const indexPorcentaje = (ind / 4.0) * 100;

      return `
        <div class="border rounded-2xl shadow-sm p-5 hover:shadow-md transition bg-white flex flex-col justify-between space-y-4">
          <div class="flex justify-between items-start gap-2">
            <div>
              <span class="text-[9px] font-mono text-slate-400 font-bold block uppercase">${est.matricula}</span>
              <h4 class="font-bold text-sm text-slate-800 truncate font-title" title="${est.nombre}">${est.nombre}</h4>
              <span class="text-[10px] text-slate-500 truncate block">${carreraNombre}</span>
            </div>
            <span class="px-2 py-0.5 border rounded-full text-[9px] font-extrabold flex items-center gap-1 ${colorBadge} font-title">
              <span>${semIcon}</span> <span>${semText}</span>
            </span>
          </div>
          <div class="space-y-1.5">
            <div class="flex justify-between items-center text-[10px] font-semibold">
              <span class="text-slate-400">Índice Académico</span>
              <span class="text-slate-800 font-extrabold font-mono">${tieneNotas ? ind.toFixed(2) : '0.00'} / 4.00</span>
            </div>
            <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full ${progBarColor} rounded-full" style="width: ${tieneNotas ? indexPorcentaje : 0}%"></div>
            </div>
          </div>
          <div class="flex justify-between items-center text-[10px] font-semibold text-slate-500 pt-2 border-t border-slate-100">
            <span>Materias: <strong class="text-slate-700">${notasEst.length}</strong></span>
            <button onclick="verBoletinEstudianteDesdeRojo('${est.matricula}')" class="text-emerald-600 hover:text-emerald-700 font-bold transition flex items-center gap-0.5 font-title">Ver Boletín</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    showToast('Error al cargar semáforo: ' + error.message, 'error');
  }
}

// ============================================================
// 16. RPT-06: TABLA DE CONVERSIÓN (estática)
// ============================================================
function renderRPT06() {
  tituloModulo.textContent = 'RPT-06 · Tabla de Conversión';
  contenedor.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
        <div>
          <h3 class="font-title text-lg font-bold text-slate-800">Equivalencias de Calificación</h3>
          <p class="text-xs text-slate-400 mt-1">Escala en puntos de honor para promedios acumulados.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th class="p-4">Rango</th>
                <th class="p-4 text-center">Literal</th>
                <th class="p-4 text-center">Puntos</th>
                <th class="p-4">Equivalencia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr><td class="p-4">90 - 100</td><td class="p-4 text-center font-bold">A</td><td class="p-4 text-center font-bold text-emerald-600 text-sm font-mono">4.0</td><td class="p-4 text-slate-500">Excelente</td></tr>
              <tr><td class="p-4">80 - 89</td><td class="p-4 text-center font-bold">B</td><td class="p-4 text-center font-bold text-indigo-600 text-sm font-mono">3.0</td><td class="p-4 text-slate-500">Bueno</td></tr>
              <tr><td class="p-4">70 - 79</td><td class="p-4 text-center font-bold">C</td><td class="p-4 text-center font-bold text-slate-600 text-sm font-mono">2.0</td><td class="p-4 text-slate-500">Satisfactorio</td></tr>
              <tr><td class="p-4">60 - 69</td><td class="p-4 text-center font-bold">D</td><td class="p-4 text-center font-bold text-amber-600 text-sm font-mono">1.0</td><td class="p-4 text-slate-500">Mínimo Aprobatorio</td></tr>
              <tr><td class="p-4">&lt; 60</td><td class="p-4 text-center font-bold">F</td><td class="p-4 text-center font-bold text-rose-600 text-sm font-mono">0.0</td><td class="p-4 text-slate-500">Reprobado</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 self-start">
        <h4 class="font-title text-sm font-bold text-slate-800">Fórmula de Cálculo</h4>
        <div class="p-4 bg-slate-50 border rounded-xl font-mono text-[11px] text-center text-slate-700 leading-normal">
          Índice = SUM(Pts × Créditos) / SUM(Créditos Totales)
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// 17. RPT-11: LISTADO GENERAL DE ASIGNATURAS
// Para el rol maestro se filtran solo las materias a su cargo y se ocultan
// la columna "Profesor" y los contadores globales (siempre sería él mismo).
// ============================================================
async function renderRPT11() {
  const esMaestro = currentUser.rol === 'maestro';
  tituloModulo.textContent = esMaestro
    ? 'RPT-11 · Mis Materias'
    : 'RPT-11 · Listado General de Asignaturas';

  try {
    // Para el maestro pedimos sus asignaturas filtradas al backend;
    // para admin/estudiante (que ya no entra a esta vista) se mantiene igual.
    const filtrosAsig = esMaestro && currentUser.idReferencia
      ? { idProfesor: currentUser.idReferencia }
      : {};

    const [asignaturas, profesores] = await Promise.all([
      apiClient.getAsignaturas(filtrosAsig),
      apiClient.getProfesores()
    ]);

    const totalAsig = asignaturas.length;
    const activas = asignaturas.filter(a => a.estado === 'Activa').length;
    const inactivas = totalAsig - activas;

    const contadoresHTML = esMaestro ? '' : `
        <div class="grid grid-cols-3 gap-4 p-4 bg-slate-50 border rounded-2xl text-xs font-semibold text-slate-500 text-center font-title">
          <div>Total Asignaturas: <strong class="text-slate-800 text-sm block font-mono">${totalAsig}</strong></div>
          <div>Activas: <strong class="text-emerald-600 text-sm block font-mono">${activas}</strong></div>
          <div>Inactivas: <strong class="text-slate-400 text-sm block font-mono">${inactivas}</strong></div>
        </div>`;

    // El maestro no necesita ver "Profesor": el backend ya le devolvió solo
    // las suyas, y la columna no aporta información nueva.
    const columnaProfesorHeader = esMaestro ? '' : '<th class="p-3">Profesor</th>';

    contenedor.innerHTML = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        ${contadoresHTML}
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <h3 class="font-title text-md font-bold text-slate-800">${esMaestro ? 'Asignaturas a mi cargo' : 'Listado General'}</h3>
          <div class="flex flex-wrap gap-2 w-full sm:w-auto">
            <button onclick="filtrarAsignaturasPrompt()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition font-title">[ FILTRAR ]</button>
            <button onclick="window.print()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition font-title">[ EXPORTAR PDF ]</button>
            <button onclick="exportarExcelAsignaturas()" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition font-title">[ EXPORTAR EXCEL ]</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th class="p-3">Código</th>
                <th class="p-3">Nombre Asignatura</th>
                <th class="p-3 text-center">Créditos</th>
                <th class="p-3">Estado</th>
                ${columnaProfesorHeader}
              </tr>
            </thead>
            <tbody id="tbl-rpt11"></tbody>
          </table>
        </div>
      </div>
    `;

    actualizarTablaRPT11(asignaturas, profesores, esMaestro);
  } catch (error) {
    showToast('Error al cargar asignaturas: ' + error.message, 'error');
  }
}

function actualizarTablaRPT11(asignaturas, profesores, esMaestro = false, filtro = '') {
  const tbody = document.getElementById('tbl-rpt11');
  if (!tbody) return;
  const filtradas = asignaturas.filter(a => {
    const q = filtro.toLowerCase();
    return a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q);
  });
  const colspan = esMaestro ? 4 : 5;
  if (filtradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="p-6 text-center text-slate-400 italic">${esMaestro ? 'No tienes asignaturas asignadas actualmente.' : 'No se encontraron asignaturas.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = filtradas.map(a => {
    // El backend ya trae profesorNombre/profesorCodigo cuando hay JOIN; caemos
    // al lookup antiguo por compatibilidad con respuestas sin esos campos.
    const prof = a.profesorNombre
      || profesores.find(p => p.codigo === (a.profesor || a.profesorCodigo))?.nombre
      || 'Sin asignar';
    const columnaProfesor = esMaestro ? '' : `<td class="p-3 text-slate-500 font-medium">${prof}</td>`;
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
        <td class="p-3 font-mono font-bold text-slate-700">${a.codigo}</td>
        <td class="p-3 text-slate-800 font-bold">${a.nombre}</td>
        <td class="p-3 text-center font-bold text-slate-500 font-mono">${a.creditos}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${a.estado === 'Activa' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'} font-title">${a.estado}</span></td>
        ${columnaProfesor}
      </tr>
    `;
  }).join('');
}

function filtrarAsignaturasPrompt() {
  const q = prompt('Ingrese término de filtro para asignaturas (Código o Nombre):');
  if (q !== null) {
    // Recargar la vista con el filtro (se puede mejorar)
    renderRPT11();
  }
}

function exportarExcelAsignaturas() {
  showToast('Exportación de asignaturas pendiente de implementación.', 'error');
}

// ============================================================
// 18. RPT-12: ESTADO DEL PENSUM
// ============================================================
async function renderRPT12() {
  tituloModulo.textContent = 'RPT-12 · Estado del Pensum';

  const estudiantes = await apiClient.getEstudiantes();
  let menuSeleccion = '';

  if (currentUser.rol === 'estudiante') {
    const estActual = estudiantes.find(e => e.correo === currentUser.usuario);
    selectedStudentIndex = estActual ? estActual.matricula : '';
  }

  if (currentUser.rol !== 'estudiante') {
    menuSeleccion = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-end gap-4 no-print mb-6">
        <div class="flex-1">
          <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Seleccionar Estudiante</label>
          <select id="rpt12-select-estudiante" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
            <option value="">Seleccione Estudiante</option>
            ${estudiantes.map(e => `<option value="${e.matricula}" ${selectedStudentIndex === e.matricula ? 'selected' : ''}>${e.matricula} - ${e.nombre}</option>`).join('')}
          </select>
        </div>
        <button onclick="cargarPensumEstudiante()" class="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition shrink-0 font-title">Generar Mapa</button>
      </div>
    `;
  }

  contenedor.innerHTML = `
    ${menuSeleccion}
    <div id="rpt12-contenedor-pensum"></div>
  `;

  if (selectedStudentIndex !== '') {
    await cargarPensumEstudiante();
  } else {
    document.getElementById('rpt12-contenedor-pensum').innerHTML = `
      <div class="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400 italic">Selecciona un estudiante y presiona "Generar Mapa" para ver el plan de estudios.</div>
    `;
  }
}

async function cargarPensumEstudiante() {
  const select = document.getElementById('rpt12-select-estudiante');
  if (select) selectedStudentIndex = select.value;
  if (!selectedStudentIndex) return;

  try {
    const [estudiantes, asignaturas, notas] = await Promise.all([
      apiClient.getEstudiantes(),
      apiClient.getAsignaturas(),
      apiClient.getNotas({ estudiante: selectedStudentIndex })
    ]);

    const est = estudiantes.find(e => e.matricula === selectedStudentIndex);
    if (!est) return;
    if (!est.id_carrera) {
      showToast('Este estudiante no tiene una carrera asignada.', 'error');
      return;
    }
    const carreraNombre = est.carreraNombre || est.carreraCodigo || '—';

    // Usamos el endpoint dedicado que ya combina estudiante + carrera + pensum
    // y devuelve tanto creditos_requeridos como las asignaturas del pensum.
    // Es más robusto que armar el query a mano y devuelve 404 si la carrera
    // no existe.
    const pensumResp = await apiClient.getPensumPorEstudiante(selectedStudentIndex);
    const pensumRaw = pensumResp?.asignaturas || (Array.isArray(pensumResp) ? pensumResp : []);
    // El backend usa alias 'codigo' y 'nombre' en este endpoint; normalizamos
    // para que el resto del código siga funcionando con codigo_asignatura /
    // nombre_asignatura como en el resto de endpoints.
    const pensumCarrera = pensumRaw.map(p => ({
      ...p,
      codigo_asignatura: p.codigo || p.codigo_asignatura,
      nombre_asignatura: p.nombre || p.nombre_asignatura
    }));
    // creditos_requeridos viene como id_pensum.creditos_requeridos; lo
    // buscamos en la primera fila del JOIN (cada asignatura del pensum trae
    // el campo) o lo leemos de pensumResp.pensum si el backend lo expone.
    let totalCreditosRequeridos =
      pensumCarrera[0]?.creditos_requeridos ||
      pensumResp?.pensum?.creditos_requeridos ||
      0;

    // FALLBACK: si el endpoint dedicado no devolvió asignaturas (típicamente
    // porque la carrera aún no tiene un Pensum activo con asignaturas
    // asociadas), caemos al endpoint /api/asignaturas filtrado por la carrera
    // del estudiante. Esto evita que RPT-12 se quede en blanco cuando el
    // pensum no se ha configurado todavía.
    let listaAsignaturasParaMostrar = pensumCarrera;
    if (listaAsignaturasParaMostrar.length === 0) {
      console.warn('[RPT-12] Pensum vacío, usando fallback de asignaturas por carrera.');
      listaAsignaturasParaMostrar = asignaturas
        .filter(a => String(a.id_carrera) === String(est.id_carrera))
        .map(a => ({
          id_asignatura: a.id_asignatura,
          codigo_asignatura: a.codigo,
          nombre_asignatura: a.nombre,
          creditos: a.creditos
        }));
      // Si tampoco hay fallback, totalizamos por lo que sumen las asignaturas
      if (totalCreditosRequeridos === 0) {
        totalCreditosRequeridos = listaAsignaturasParaMostrar.reduce((acc, p) => acc + (p.creditos || 0), 0);
      }
    }

    let creditosAprobados = 0;
    let creditosPendientes = 0;

    let asignaturasPensumHTML = '';
    let pendientesListHTML = '';

    listaAsignaturasParaMostrar.forEach(p => {
      const asig = asignaturas.find(a => a.codigo === p.codigo_asignatura) || { codigo: p.codigo_asignatura, nombre: p.nombre_asignatura, creditos: p.creditos };
      const nota = notas.find(n => n.idAsignatura === p.id_asignatura);

      let stateColor = 'bg-slate-50 border-slate-200 text-slate-500';
      let stateLabel = 'Pendiente';
      let notaFinalHTML = '';

      if (nota) {
        if (nota.estado === 'Aprobado') {
          stateColor = 'bg-emerald-50/70 border-emerald-200 text-emerald-800';
          stateLabel = 'Aprobada';
          creditosAprobados += asig.creditos;
          notaFinalHTML = `<span class="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">Nota: ${nota.notaFinal.toFixed(0)} (${nota.literal})</span>`;
        } else {
          stateColor = 'bg-rose-50/70 border-rose-200 text-rose-800';
          stateLabel = 'Reprobada';
          creditosPendientes += asig.creditos;
          notaFinalHTML = `<span class="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">Nota: ${nota.notaFinal.toFixed(0)} (${nota.literal})</span>`;
        }
      } else {
        creditosPendientes += asig.creditos;
        pendientesListHTML += `<div class="p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-700">${asig.codigo} - ${asig.nombre} (${asig.creditos} CR)</div>`;
      }

      const iconSymbol = asig.fontSymbol || 'book';
      asignaturasPensumHTML += `
        <div class="border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition hover:shadow-sm ${stateColor}">
          <div>
            <div class="flex justify-between items-center mb-1">
              <span class="text-[9px] font-mono font-bold tracking-wider">${asig.codigo}</span>
              <span class="text-[9px] font-bold uppercase tracking-wider font-title">${stateLabel}</span>
            </div>
            <h5 class="text-xs font-bold text-slate-800 leading-snug line-clamp-2" title="${asig.nombre}">
              <span class="material-symbols-outlined text-xs mr-0.5">${iconSymbol}</span> ${asig.nombre}
            </h5>
          </div>
          <div class="flex justify-between items-center text-[10px] pt-2 border-t border-dashed border-slate-200">
            <span class="font-semibold text-slate-400">Créditos: <strong class="text-slate-600 font-mono">${asig.creditos}</strong></span>
            ${notaFinalHTML}
          </div>
        </div>
      `;
    });

    const porcAprobados = totalCreditosRequeridos > 0 ? (creditosAprobados / totalCreditosRequeridos) * 100 : 0;

    document.getElementById('rpt12-contenedor-pensum').innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 self-start">
          <div class="pb-3 border-b border-slate-100">
            <h3 class="font-title text-lg font-bold text-slate-800">${est.nombre}</h3>
            <p class="text-xs text-slate-400">${carreraNombre}</p>
          </div>
          <div class="space-y-4">
            <span class="text-xs font-bold text-slate-600 uppercase block font-title">Progreso Curricular</span>
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-slate-500">Aprobados:</span>
              <span class="text-emerald-600 font-mono">${creditosAprobados} / ${totalCreditosRequeridos} CR</span>
            </div>
            <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-emerald-500" style="width: ${porcAprobados}%"></div>
            </div>
            <div class="flex items-center justify-between text-xs font-bold">
              <span class="text-slate-500">Pendientes:</span>
              <span class="text-slate-700 font-mono">${totalCreditosRequeridos - creditosAprobados} CR</span>
            </div>
          </div>
          <div class="flex flex-col gap-2 pt-4 border-t border-slate-100 no-print">
            <button onclick="window.print()" class="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition font-title">[ GENERAR PDF ]</button>
            <button onclick="exportarExcelPensum()" class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition font-title">[ EXPORTAR EXCEL ]</button>
            <button onclick="alert('Mostrando pensum completo oficial de la Universidad Nacional Pedro Henríquez Ureña.')" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition font-title">[ VER PENSUM COMPLETO ]</button>
          </div>
        </div>
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h4 class="font-title text-md font-bold text-slate-800 pb-3 border-b border-slate-100 mb-6">Mapa del Plan de Estudios</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">${asignaturasPensumHTML}</div>
          </div>
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h4 class="font-title text-md font-bold text-slate-800 pb-3 border-b border-slate-100 mb-4">Asignaturas Pendientes por Cursar</h4>
            <div class="space-y-2">${pendientesListHTML || '<p class="text-xs text-emerald-600 font-bold">Sin asignaturas pendientes.</p>'}</div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast('Error al cargar pensum: ' + error.message, 'error');
  }
}

function exportarExcelPensum() {
  showToast('Exportación de pensum pendiente de implementación.', 'error');
}

// ============================================================
// 19. RPT-13: CÁLCULO DE ÍNDICE ACADÉMICO
// ============================================================
async function renderRPT13() {
  tituloModulo.textContent = 'RPT-13 · Cálculo de Índice Académico';

  const estudiantes = await apiClient.getEstudiantes();
  let menuSeleccion = '';

  if (currentUser.rol === 'estudiante') {
    const estActual = estudiantes.find(e => e.correo === currentUser.usuario);
    selectedStudentIndex = estActual ? estActual.matricula : '';
  }

  if (currentUser.rol !== 'estudiante') {
    menuSeleccion = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-end gap-4 no-print mb-6">
        <div class="flex-1">
          <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Seleccionar Estudiante</label>
          <select id="rpt13-select-estudiante" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
            <option value="">Seleccione Estudiante</option>
            ${estudiantes.map(e => `<option value="${e.matricula}" ${selectedStudentIndex === e.matricula ? 'selected' : ''}>${e.matricula} - ${e.nombre}</option>`).join('')}
          </select>
        </div>
        <button onclick="cargarIndiceYSituacionEstudiante()" class="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition shrink-0 font-title">Ver Detalles</button>
      </div>
    `;
  }

  contenedor.innerHTML = `
    ${menuSeleccion}
    <div id="rpt13-contenedor-indice"></div>
  `;

  if (selectedStudentIndex !== '') {
    await cargarIndiceYSituacionEstudiante();
  } else {
    document.getElementById('rpt13-contenedor-indice').innerHTML = `
      <div class="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400 italic">Selecciona un estudiante y presiona "Ver Detalles" para ver el análisis e simulador.</div>
    `;
  }
}

async function cargarIndiceYSituacionEstudiante() {
  const select = document.getElementById('rpt13-select-estudiante');
  if (select) selectedStudentIndex = select.value;
  if (!selectedStudentIndex) return;

  try {
    const [estudiantes, asignaturas, notas, config] = await Promise.all([
      apiClient.getEstudiantes(),
      apiClient.getAsignaturas(),
      apiClient.getNotas({ estudiante: selectedStudentIndex }),
      apiClient.getConfiguracion()
    ]);

    const est = estudiantes.find(e => e.matricula === selectedStudentIndex);
    if (!est) return;
    if (!est.id_carrera) {
      showToast('Este estudiante no tiene una carrera asignada.', 'error');
      return;
    }
    // Usamos el endpoint dedicado que combina estudiante + carrera + pensum.
    // Antes se llamaba getPensum(est.id_carrera) que dependía de que existiera
    // un pensum activo y del nombre de campo id_carrera — fallaba silenciosamente
    // cuando la carrera no tenía pensums. Con el endpoint dedicado fallamos
    // rápido si no hay pensum, y normalizamos los alias.
    const pensumResp = await apiClient.getPensumPorEstudiante(selectedStudentIndex);
    const pensumRaw = pensumResp?.asignaturas || (Array.isArray(pensumResp) ? pensumResp : []);
    const pensum = pensumRaw.map(p => ({
      ...p,
      codigo_asignatura: p.codigo || p.codigo_asignatura,
      nombre_asignatura: p.nombre || p.nombre_asignatura
    }));

    let totalPtsHonor = 0;
    let totalCreditosConNota = 0;
    let detalleFilasHTML = '';

    if (notas.length === 0) {
      detalleFilasHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400 italic">No hay calificaciones registradas.</td></tr>`;
    } else {
      detalleFilasHTML = notas.map(n => {
        const asig = asignaturas.find(a => a.id_asignatura === n.idAsignatura) || { codigo: n.idAsignatura, nombre: n.nombreAsignatura || n.idAsignatura, creditos: 0 };
        const pts = literalAPuntos(n.literal);
        const ptsCr = pts * asig.creditos;
        totalPtsHonor += ptsCr;
        totalCreditosConNota += asig.creditos;
        return `
          <tr class="border-b border-slate-100 text-xs hover:bg-slate-50 transition">
            <td class="p-3 font-mono font-bold text-slate-700">${asig.codigo}</td>
            <td class="p-3 text-slate-800 font-bold">${asig.nombre}</td>
            <td class="p-3 text-center font-bold text-slate-500 font-mono">${asig.creditos}</td>
            <td class="p-3 text-center text-slate-800 font-bold font-title">${n.literal}</td>
            <td class="p-3 text-center font-bold text-slate-500 font-mono">${pts.toFixed(1)}</td>
            <td class="p-3 text-center font-extrabold text-emerald-600 font-mono">${ptsCr.toFixed(1)}</td>
          </tr>
        `;
      }).join('');
    }

    const indice = totalCreditosConNota > 0 ? totalPtsHonor / totalCreditosConNota : 0.0;
    const semaforo = obtenerEstadoSemaforo(indice, config);

    // El backend ya filtra por carrera (GET /api/pensum/:idCarrera), pensum ya viene acotado
    const pensumCarrera = pensum;
    const materiasAprobadas = notas.filter(n => n.estado === 'Aprobado').map(n => n.idAsignatura);
    const materiasPendientes = pensumCarrera.filter(p => !materiasAprobadas.includes(p.id_asignatura));

    let simuladorSeccionHTML = '';
    if (materiasPendientes.length === 0) {
      simuladorSeccionHTML = `<p class="text-xs text-emerald-600 italic font-bold">Plan de estudios completo.</p>`;
    } else {
      const materiasPendientesDetalle = materiasPendientes.map(p => {
        const asig = asignaturas.find(a => a.codigo === p.codigo_asignatura) || { codigo: p.codigo_asignatura, nombre: p.nombre_asignatura, creditos: p.creditos };
        return `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border rounded-xl" data-sim-creditos="${asig.creditos}">
            <div>
              <span class="text-[9px] font-mono font-bold text-slate-400 block">${asig.codigo}</span>
              <span class="text-xs font-bold text-slate-800 truncate block max-w-xs">${asig.nombre} (${asig.creditos} CR)</span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <select class="sim-literal-select px-2 py-1 border rounded text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500">
                <option value="-">Sin Cursar</option>
                <option value="A">A (4.0)</option>
                <option value="B">B (3.0)</option>
                <option value="C">C (2.0)</option>
                <option value="D">D (1.0)</option>
                <option value="F">F (0.0)</option>
              </select>
            </div>
          </div>
        `;
      }).join('');

      simuladorSeccionHTML = `
        <div class="space-y-4">
          <h4 class="font-title text-sm font-bold text-slate-800 pb-2 border-b">Simulador Proyectivo</h4>
          <div class="space-y-2.5 overflow-y-auto max-h-72 pr-1">${materiasPendientesDetalle}</div>
          <div class="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span class="text-[10px] text-emerald-800 font-bold uppercase block font-title">Índice Proyectado</span>
            </div>
            <div class="text-right shrink-0">
              <span class="font-title text-2xl font-extrabold text-emerald-800" id="sim-indice-proyectado">${indice.toFixed(2)}</span>
              <span id="sim-semaforo-color" class="block text-[9px] font-bold text-emerald-600 mt-0.5 font-title">${semaforo.label}</span>
            </div>
          </div>
        </div>
      `;
    }

    document.getElementById('rpt13-contenedor-indice').innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div class="pb-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 class="font-title text-lg font-bold text-slate-800">Detalles Académicos</h3>
              <p class="text-xs text-slate-400">Análisis detallado de puntos de honor acumulados.</p>
            </div>
            <div class="p-3 bg-slate-50 border rounded-xl flex items-center gap-3 shrink-0">
              <span class="text-xs font-semibold text-slate-500">Índice Real:</span>
              <span class="font-title text-xl font-extrabold text-slate-800">${indice.toFixed(2)}</span>
              <span class="w-3.5 h-3.5 rounded-full ${semaforo.color} block"></span>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] font-bold uppercase tracking-wider font-title">
                  <th class="p-3">Código</th>
                  <th class="p-3">Asignatura</th>
                  <th class="p-3 text-center">Créditos</th>
                  <th class="p-3 text-center">Literal</th>
                  <th class="p-3 text-center">Honor Pts</th>
                  <th class="p-3 text-center">Pts × Créditos</th>
                </tr>
              </thead>
              <tbody>${detalleFilasHTML}</tbody>
              <tfoot>
                <tr class="bg-slate-50 font-bold border-t border-slate-200">
                  <td colspan="2" class="p-3 text-right text-slate-500 text-xs">Total:</td>
                  <td class="p-3 text-center text-slate-800 text-xs font-mono">${totalCreditosConNota} CR</td>
                  <td colspan="2"></td>
                  <td class="p-3 text-center text-emerald-700 text-xs font-mono font-extrabold">${totalPtsHonor.toFixed(1)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">${simuladorSeccionHTML}</div>
      </div>
    `;

    // Eventos del simulador
    document.querySelectorAll('.sim-literal-select').forEach(sel => {
      sel.addEventListener('change', actualizarCalculoSimulado);
    });

    window.simData = {
      ptsAcumulados: totalPtsHonor,
      creditosAcumulados: totalCreditosConNota,
      indiceActual: indice,
      config: config
    };
  } catch (error) {
    showToast('Error al cargar índice: ' + error.message, 'error');
  }
}

function actualizarCalculoSimulado() {
  const selectores = document.querySelectorAll('.sim-literal-select');
  let ptsSimulados = 0, credSimulados = 0;
  selectores.forEach(select => {
    const val = select.value;
    if (val === '-') return;
    const contenedorSim = select.closest('[data-sim-creditos]');
    const cred = parseInt(contenedorSim.getAttribute('data-sim-creditos'));
    const pts = literalAPuntos(val);
    ptsSimulados += pts * cred;
    credSimulados += cred;
  });
  const totalPts = window.simData.ptsAcumulados + ptsSimulados;
  const totalCred = window.simData.creditosAcumulados + credSimulados;
  const nuevoIndice = totalCred > 0 ? totalPts / totalCred : 0.00;
  const config = window.simData.config || { verde: 3.2, amarillo: 2.5 };
  const semaforo = obtenerEstadoSemaforo(nuevoIndice, config);
  document.getElementById('sim-indice-proyectado').textContent = nuevoIndice.toFixed(2);
  document.getElementById('sim-semaforo-color').textContent = semaforo.label;
  const spanSemaforo = document.getElementById('sim-semaforo-color');
  spanSemaforo.className = `block text-[9px] font-bold mt-0.5 ${semaforo.text} font-title`;
}

// ============================================================
// GENERAR MENÚ LATERAL SEGÚN ROL
// ============================================================
function generarMenuLateral(rol) {
  const menuContainer = document.getElementById('menu-container');
  let items = [];
  items.push({ id: 'inicio', label: '<span class="material-symbols-outlined text-base">dashboard</span> Panel General', action: 'inicio' });

  if (rol === 'admin') {
    items.push(
      { header: 'Entradas (Mantenimiento)' },
      { id: 'ent01', label: '<span class="material-symbols-outlined text-base">group</span> ENT-01 · Estudiantes', action: 'ent01' },
      { id: 'ent02', label: '<span class="material-symbols-outlined text-base">book</span> ENT-02 · Asignaturas', action: 'ent02' },
      { id: 'ent03', label: '<span class="material-symbols-outlined text-base">calendar_today</span> ENT-03 · Períodos', action: 'ent03' },
      { id: 'ent04', label: '<span class="material-symbols-outlined text-base">co_present</span> ENT-04 · Profesores', action: 'ent04' },
      { id: 'ent05', label: '<span class="material-symbols-outlined text-base">account_balance</span> ENT-05 · Carreras', action: 'ent05' },
      { id: 'ent10', label: '<span class="material-symbols-outlined text-base">apartment</span> ENT-10 · Facultades', action: 'ent10' },
      { id: 'ent09', label: '<span class="material-symbols-outlined text-base">room_preferences</span> ENT-09 · Registro Sección', action: 'ent09' },
      { id: 'ent06', label: '<span class="material-symbols-outlined text-base">filter_alt</span> ENT-06 · Filtro Reportes', action: 'ent06' },
      { id: 'ent07', label: '<span class="material-symbols-outlined text-base">grade</span> ENT-07 · Carga de Notas', action: 'ent07' },
      { id: 'ent08', label: '<span class="material-symbols-outlined text-base">settings</span> ENT-08 · Umbrales', action: 'ent08' },
      { header: 'Reportes e Indicadores' },
      { id: 'rpt11', label: '<span class="material-symbols-outlined text-base">library_books</span> RPT-11 · Catálogo Materias', action: 'rpt11' },
      { id: 'rpt05', label: '<span class="material-symbols-outlined text-base">traffic</span> RPT-05 · Semáforo Riesgo', action: 'rpt05' },
      { id: 'rpt04', label: '<span class="material-symbols-outlined text-base">warning</span> RPT-04 · Alertas de Riesgo', action: 'rpt04' },
      { id: 'rpt12', label: '<span class="material-symbols-outlined text-base">donut_large</span> RPT-12 · Estado Pensum', action: 'rpt12' },
      { id: 'rpt13', label: '<span class="material-symbols-outlined text-base">monitoring</span> RPT-13 · Índice Académico', action: 'rpt13' },
      { id: 'rpt01', label: '<span class="material-symbols-outlined text-base">badge</span> RPT-01 · Boletín Oficial', action: 'rpt01' },
      { id: 'rpt06', label: '<span class="material-symbols-outlined text-base">swap_horiz</span> RPT-06 · Conversión', action: 'rpt06' },
      { id: 'rpt07', label: '<span class="material-symbols-outlined text-base">mail</span> RPT-07 · Bitácora Correos', action: 'rpt07' }
    );
  } else if (rol === 'maestro') {
    items.push(
      { header: 'Operaciones' },
      { id: 'ent06', label: '<span class="material-symbols-outlined text-base">filter_alt</span> ENT-06 · Filtro Reportes', action: 'ent06' },
      { id: 'ent07', label: '<span class="material-symbols-outlined text-base">grade</span> ENT-07 · Carga de Notas', action: 'ent07' },
      { header: 'Mis materias y reportes' },
      // RPT-01 (Boletín Oficial) removido: un maestro no necesita ver el
      // expediente del estudiante (carrera, índice acumulado, etc.).
      { id: 'rpt11', label: '<span class="material-symbols-outlined text-base">library_books</span> RPT-11 · Mis Materias', action: 'rpt11' },
      { id: 'rpt04', label: '<span class="material-symbols-outlined text-base">warning</span> RPT-04 · Alertas de Riesgo', action: 'rpt04' },
      { id: 'rpt07', label: '<span class="material-symbols-outlined text-base">mail</span> RPT-07 · Bitácora Correos', action: 'rpt07' },
      { id: 'rpt06', label: '<span class="material-symbols-outlined text-base">swap_horiz</span> RPT-06 · Tabla Conversión', action: 'rpt06' }
    );
  } else if (rol === 'estudiante') {
    items.push(
      { header: 'Mi Seguimiento' },
      { id: 'ent11', label: '<span class="material-symbols-outlined text-base">edit_calendar</span> ENT-11 · Inscripción de Materias', action: 'ent11' },
      { id: 'rpt01', label: '<span class="material-symbols-outlined text-base">badge</span> RPT-01 · Mi Boletín Oficial', action: 'rpt01' },
      { id: 'rpt12', label: '<span class="material-symbols-outlined text-base">donut_large</span> RPT-12 · Mi Pensum', action: 'rpt12' },
      { id: 'rpt13', label: '<span class="material-symbols-outlined text-base">monitoring</span> RPT-13 · Mi Índice / Simulador', action: 'rpt13' },
      { id: 'rpt05', label: '<span class="material-symbols-outlined text-base">traffic</span> RPT-05 · Mi Semáforo', action: 'rpt05' },
      { id: 'rpt07', label: '<span class="material-symbols-outlined text-base">mail</span> RPT-07 · Mis Notificaciones', action: 'rpt07' },
      { id: 'rpt06', label: '<span class="material-symbols-outlined text-base">swap_horiz</span> RPT-06 · Reglas Equivalencia', action: 'rpt06' }
    );
  }

  menuContainer.innerHTML = items.map(item => {
    if (item.header) {
      return `<div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-2 font-title">${item.header}</div>`;
    }
    return `
      <button id="menu-${item.id}" onclick="renderView('${item.action}')" 
        class="menu-item w-full text-left py-2.5 px-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white flex items-center gap-2 text-xs font-semibold transition duration-150 font-title">
        ${item.label}
      </button>
    `;
  }).join('');
}

function verBoletinEstudianteDesdeRojo(mat) {
  selectedStudentIndex = mat;
  renderView('rpt01');
}

// ============================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const sesion = JSON.parse(localStorage.getItem('taskUni_sesion'));
  if (!sesion) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = sesion;
  document.getElementById('user-email').textContent = sesion.usuario;
  document.getElementById('user-role-badge').textContent = sesion.rol;
  const userInitials = sesion.usuario.split('@')[0].substring(0, 2).toUpperCase();
  document.getElementById('user-avatar').textContent = userInitials;

  // Período activo
  try {
    const activePeriod = await getPeriodoActivo();
    document.getElementById('periodo-activo-badge').textContent = activePeriod;
  } catch {
    document.getElementById('periodo-activo-badge').textContent = '9-2026';
  }

  generarMenuLateral(sesion.rol);
  await renderView('inicio');

  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('taskUni_sesion');
    window.location.href = 'index.html';
  });
});