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
    const asig = asignaturas.find(a => a.codigo === nota.idAsignatura);
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
    case 'rpt01': await renderRPT01(); break;
    case 'rpt04': await renderRPT04(); break;
    case 'rpt05': await renderRPT05(); break;
    case 'rpt06': await renderRPT06(); break;
    case 'rpt07': await renderRPT07(); break;
    case 'rpt08': await renderRPT08(); break;
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

    const totalEstudiantes = estudiantes.length;
    const totalAsignaturas = asignaturas.length;

    let sumIndices = 0, totalConIndice = 0, estudiantesEnRojo = 0;
    estudiantes.forEach(est => {
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
            ${renderMiniGraficoSemaforo(estudiantes, notas, config)}
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
  let verde = 0, amarillo = 0, rojo = 0;
  estudiantes.forEach(est => {
    const ind = calcularIndiceEstudiante(est.matricula, notas, []);
    if (!notas.some(n => n.matriculaEstudiante === est.matricula)) return;
    if (ind >= config.verde) verde++;
    else if (ind >= config.amarillo) amarillo++;
    else rojo++;
  });
  const total = estudiantes.length || 1;
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
// 3. ENT-02: REGISTRO DE ASIGNATURAS
// ============================================================
async function renderENT02() {
  tituloModulo.textContent = 'ENT-02 · Registro de Asignaturas';

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
        <h3 class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
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
            <button type="submit" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition font-title">Guardar</button>
            <button type="button" id="btn-buscar-asignatura" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title">Buscar</button>
          </div>
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
      await apiClient.crearAsignatura({ codigo: cod, nombre: nom, creditos: cred, id_carrera: carId, estado: 'Activa' });
      showToast('Asignatura guardada con éxito.');
      this.reset();
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

async function actualizarTablaAsignaturas(filtro = '') {
  const tbody = document.getElementById('tbl-asignaturas');
  if (!tbody) return;
  try {
    const asignaturas = await apiClient.getAsignaturas();
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
          <td class="p-3 text-right">
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
      await actualizarTablaAsignaturas();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  }
}

// ============================================================
// 4. ENT-03: REGISTRO DE PERÍODOS
// ============================================================
async function renderENT03() {
  tituloModulo.textContent = 'ENT-03 · Registro de Periodos';

  contenedor.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm self-start">
        <h3 class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
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
            <button type="submit" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition font-title">Guardar</button>
            <button type="button" onclick="renderView('inicio')" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title">Cancelar</button>
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
              </tr>
            </thead>
            <tbody id="tbl-periodos"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

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
      await apiClient.createPeriodo({ periodo: per, cuatrimestre: cuat, fechaInicio: ini, fechaFin: fin, estado: est });
      showToast('Período registrado correctamente.');
      this.reset();
      await actualizarTablaPeriodos();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  });
}

async function actualizarTablaPeriodos() {
  const tbody = document.getElementById('tbl-periodos');
  if (!tbody) return;
  try {
    const periodos = await apiClient.getPeriodos();
    if (periodos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">No hay períodos registrados.</td></tr>`;
      return;
    }
    tbody.innerHTML = periodos.map(p => {
      const badgeColor = p.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500';
      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
          <td class="p-3 font-semibold font-mono text-slate-700">${p.periodo}</td>
          <td class="p-3 text-slate-800 font-semibold">${p.cuatrimestre}</td>
          <td class="p-3 text-slate-500 font-mono">${p.fechaInicio}</td>
          <td class="p-3 text-slate-500 font-mono">${p.fechaFin}</td>
          <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${p.estado}</span></td>
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
  const asignaturas = await apiClient.getAsignaturas();
  const estudiantes = await apiClient.getEstudiantes();

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
              ${periodos.map(p => `<option value="${p.periodo}" ${activeFilter.periodo === p.periodo ? 'selected' : ''}>${p.periodo}</option>`).join('')}
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
              <option value="01" ${activeFilter.seccion === '01' ? 'selected' : ''}>01</option>
              <option value="02" ${activeFilter.seccion === '02' ? 'selected' : ''}>02</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Estudiante (Opcional)</label>
            <select id="ent06-estudiante" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
              <option value="">Todos los Estudiantes</option>
              ${estudiantes.map(e => `<option value="${e.matricula}" ${activeFilter.estudiante === e.matricula ? 'selected' : ''}>${e.matricula} - ${e.nombre}</option>`).join('')}
            </select>
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
async function renderENT09() {
  tituloModulo.textContent = 'ENT-09 · Registro de Secciones';

  const periodos = await apiClient.getPeriodos();
  const asignaturas = await apiClient.getAsignaturas();
  const profesores = await apiClient.getProfesores();

  contenedor.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm self-start">
        <h3 class="font-title text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
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
          <button type="submit" class="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition shadow font-title">Guardar Sección</button>
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
                <th class="p-3">Estudiantes</th>   
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
      await apiClient.createSeccion({ numero: num, idAsignatura: asig, idProfesor: prof, periodo: per });
      showToast('Sección registrada correctamente.');
      this.reset();
      await actualizarTablaSecciones();
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  });
}

async function actualizarTablaSecciones() {
  const tbody = document.getElementById('tbl-secciones');
  if (!tbody) return;
  try {
    const secciones = await apiClient.getSecciones();
    if (secciones.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">No hay secciones registradas.</td></tr>`;
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
          <td class="p-3">
            <button onclick="abrirModalMatricula('${sec.id}', '${sec.codigoAsignatura} - Sección ${sec.numero}')" class="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 font-semibold text-[10px] rounded-full transition flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">group</span> Gestionar
            </button>
          </td>
          <td class="p-3 text-right">
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

// ============================================================
// MODAL: Matricular estudiantes en una sección
// (accesible desde ENT-09 · Registro de Secciones)
// ============================================================
async function abrirModalMatricula(idSeccion, etiquetaSeccion) {
  document.getElementById('modal-matricula-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal-matricula-overlay';
  overlay.className = 'fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
      <div class="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="font-title text-lg font-bold text-slate-800">Estudiantes de la sección</h3>
          <p class="text-xs text-slate-400">${etiquetaSeccion}</p>
        </div>
        <button id="btn-cerrar-modal-matricula" class="p-1 text-slate-400 hover:text-slate-700 rounded transition">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="p-5 border-b border-slate-100">
        <input type="text" id="modal-matricula-buscar" placeholder="Buscar por nombre o matrícula..." class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
      </div>
      <div id="modal-matricula-lista" class="p-5 overflow-y-auto flex-1 space-y-1 text-sm text-slate-400 italic">
        Cargando estudiantes...
      </div>
      <div class="p-5 border-t border-slate-100 flex gap-2">
        <button id="btn-guardar-matricula" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition font-title">Guardar Cambios</button>
        <button id="btn-cancelar-matricula" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition font-title">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const cerrar = () => overlay.remove();
  document.getElementById('btn-cerrar-modal-matricula').addEventListener('click', cerrar);
  document.getElementById('btn-cancelar-matricula').addEventListener('click', cerrar);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });

  try {
    const [todos, matriculados] = await Promise.all([
      apiClient.getEstudiantes(),
      apiClient.getEstudiantesDeSeccion(idSeccion)
    ]);
    const matriculadosSet = new Set(matriculados.map(e => e.matricula));

    const lista = document.getElementById('modal-matricula-lista');
    const renderLista = (filtro = '') => {
      const q = filtro.toLowerCase();
      const filtrados = todos.filter(e => e.nombre.toLowerCase().includes(q) || e.matricula.toLowerCase().includes(q));
      if (filtrados.length === 0) {
        lista.innerHTML = `<p class="text-center text-slate-400 italic py-4">Sin resultados.</p>`;
        return;
      }
      lista.innerHTML = filtrados.map(e => `
        <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
          <input type="checkbox" data-matricula="${e.matricula}" ${matriculadosSet.has(e.matricula) ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 chk-matricula">
          <span class="font-mono text-xs font-bold text-slate-500 w-16 shrink-0">${e.matricula}</span>
          <span class="text-slate-700 font-semibold">${e.nombre}</span>
        </label>
      `).join('');
    };
    renderLista();

    lista.addEventListener('change', (e) => {
      const chk = e.target.closest('.chk-matricula');
      if (!chk) return;
      if (chk.checked) matriculadosSet.add(chk.dataset.matricula);
      else matriculadosSet.delete(chk.dataset.matricula);
    });

    document.getElementById('modal-matricula-buscar').addEventListener('input', function () {
      renderLista(this.value.trim());
    });

    document.getElementById('btn-guardar-matricula').addEventListener('click', async () => {
      try {
        await apiClient.matricularEstudiantes(idSeccion, Array.from(matriculadosSet));
        showToast('Estudiantes de la sección actualizados.', 'success');
        cerrar();
      } catch (error) {
        showToast('Error al guardar matrícula: ' + error.message, 'error');
      }
    });
  } catch (error) {
    document.getElementById('modal-matricula-lista').innerHTML = `<p class="text-rose-500">Error al cargar estudiantes: ${error.message}</p>`;
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
      tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-slate-400 italic">Esta sección todavía no tiene estudiantes matriculados. Ve a ENT-09 · Registro de Secciones y usa "Gestionar" para asignarlos.</td></tr>`;
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
// 11. RPT-01: REPORTE DE PROGRESO ACADÉMICO (BOLETÍN)
// ============================================================
async function renderRPT01() {
  tituloModulo.textContent = 'RPT-01 · Reporte de Progreso Académico';

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
        const asig = asignaturas.find(a => a.codigo === n.idAsignatura) || { nombre: n.idAsignatura, creditos: 0 };
        return `
          <tr class="border-b border-slate-100 text-xs">
            <td class="p-3 font-mono font-bold text-slate-700">${n.idAsignatura}</td>
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
    const [notas, estudiantes, asignaturas] = await Promise.all([
      apiClient.getNotas(),
      apiClient.getEstudiantes(),
      apiClient.getAsignaturas()
    ]);

    const reprobados = [];
    notas.forEach(nota => {
      if (nota.notaFinal < 60.0) {
        const est = estudiantes.find(e => e.matricula === nota.idEstudiante);
        const asig = asignaturas.find(a => a.codigo === nota.idAsignatura);
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
    const [notas, estudiantes, asignaturas] = await Promise.all([
      apiClient.getNotas(),
      apiClient.getEstudiantes(),
      apiClient.getAsignaturas()
    ]);
    const notificaciones = [];
    notas.forEach(nota => {
      if (nota.notaFinal < 60.0) {
        const est = estudiantes.find(e => e.matricula === nota.idEstudiante);
        const asig = asignaturas.find(a => a.codigo === nota.idAsignatura);
        if (est && asig) {
          notificaciones.push({
            id_estudiante: est.matricula,
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
    const [notificaciones, estudiantes] = await Promise.all([
      apiClient.getNotificaciones(),
      apiClient.getEstudiantes()
    ]);
    let filasHTML = '';
    if (notificaciones.length === 0) {
      filasHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">No se han registrado correos enviados.</td></tr>`;
    } else {
      filasHTML = notificaciones.map(n => {
        const est = estudiantes.find(e => e.matricula === n.id_estudiante);
        const email = est ? est.correo : `${n.id_estudiante}@unphu.edu.do`;
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

// ============================================================
// 14. RPT-08: HISTORIAL DE IMPORTACIÓN / EXPORTACIÓN
// ============================================================
async function renderRPT08() {
  tituloModulo.textContent = 'RPT-08 · Reporte de Importación / Exportación';
  try {
    const logs = await apiClient.getLogs();
    let filasHTML = '';
    if (logs.length === 0) {
      filasHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400 italic">No hay logs de operaciones en el sistema.</td></tr>`;
    } else {
      filasHTML = logs.map(l => {
        const badgeType = l.tipo === 'IMPORTACIÓN' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800';
        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
            <td class="p-3 font-mono font-bold text-slate-700">${l.id_log}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${badgeType} font-title">${l.tipo}</span></td>
            <td class="p-3 font-semibold text-slate-800">${l.evento}</td>
            <td class="p-3 font-mono text-slate-500">${l.periodo}</td>
            <td class="p-3 text-slate-800 font-bold text-center font-mono">${l.registros}</td>
            <td class="p-3 font-mono text-slate-600">${l.archivo}</td>
            <td class="p-3 text-slate-400 font-mono">${l.fecha}</td>
          </tr>
        `;
      }).join('');
    }
    contenedor.innerHTML = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div class="flex justify-between items-center pb-4 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h3 class="font-title text-lg font-bold text-slate-800">Historial de Cargas y Descargas</h3>
            <p class="text-xs text-slate-400 mt-1">Bitácora de auditoría de archivos subidos y generados en taskUni.</p>
          </div>
          <button onclick="simularImportacionExcel()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow font-title flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">upload_file</span> [ SIMULAR IMPORTACIÓN EXCEL ]
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] font-title">
                <th class="p-3">ID Log</th>
                <th class="p-3">Tipo</th>
                <th class="p-3">Evento</th>
                <th class="p-3">Periodo</th>
                <th class="p-3 text-center">Registros</th>
                <th class="p-3">Nombre Archivo</th>
                <th class="p-3">Fecha</th>
              </tr>
            </thead>
            <tbody>${filasHTML}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    showToast('Error al cargar logs: ' + error.message, 'error');
  }
}

async function simularImportacionExcel() {
  const archivo = prompt('Ingrese el nombre del archivo de simulación (ej. estudiantes_cómputos.xlsx):', 'alumnos_nuevos.xlsx');
  if (!archivo) return;
  const reg = Math.floor(Math.random() * 20) + 1;
  try {
    await apiClient.registrarLog({
      tipo: 'IMPORTACIÓN',
      evento: 'IMPORTACION_COMPLETADA',
      periodo: await getPeriodoActivo(),
      registros: reg,
      archivo
    });
    showToast(`Simulación completada. Se importaron ${reg} registros desde ${archivo}.`);
    renderRPT08();
  } catch (error) {
    showToast('Error al simular importación: ' + error.message, 'error');
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
            <option value="verde">🟢 Verde (>= 3.2)</option>
            <option value="amarillo">🟡 Amarillo (2.5 - 3.2)</option>
            <option value="rojo">🔴 Rojo (< 2.5)</option>
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
    const [estudiantes, carreras, config, notas, asignaturas] = await Promise.all([
      apiClient.getEstudiantes(),
      apiClient.getCarreras(),
      apiClient.getConfiguracion(),
      apiClient.getNotas(),
      apiClient.getAsignaturas()
    ]);

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
      let semIcon = '⚪';
      let semText = 'Sin Notas';
      let progBarColor = 'bg-slate-300';

      if (tieneNotas) {
        if (ind >= config.verde) {
          colorBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          semIcon = '🟢';
          semText = 'Verde (Alto)';
          progBarColor = 'bg-emerald-500';
        } else if (ind >= config.amarillo) {
          colorBadge = 'bg-amber-50 text-amber-700 border-amber-200';
          semIcon = '🟡';
          semText = 'Amarillo (Alerta)';
          progBarColor = 'bg-amber-500';
        } else {
          colorBadge = 'bg-rose-50 text-rose-700 border-rose-200';
          semIcon = '🔴';
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
// ============================================================
async function renderRPT11() {
  tituloModulo.textContent = 'RPT-11 · Listado General de Asignaturas';

  try {
    const [asignaturas, profesores] = await Promise.all([
      apiClient.getAsignaturas(),
      apiClient.getProfesores()
    ]);

    const totalAsig = asignaturas.length;
    const activas = asignaturas.filter(a => a.estado === 'Activa').length;
    const inactivas = totalAsig - activas;

    contenedor.innerHTML = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div class="grid grid-cols-3 gap-4 p-4 bg-slate-50 border rounded-2xl text-xs font-semibold text-slate-500 text-center font-title">
          <div>Total Asignaturas: <strong class="text-slate-800 text-sm block font-mono">${totalAsig}</strong></div>
          <div>Activas: <strong class="text-emerald-600 text-sm block font-mono">${activas}</strong></div>
          <div>Inactivas: <strong class="text-slate-400 text-sm block font-mono">${inactivas}</strong></div>
        </div>
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <h3 class="font-title text-md font-bold text-slate-800">Listado General</h3>
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
                <th class="p-3">Profesor</th>
              </tr>
            </thead>
            <tbody id="tbl-rpt11"></tbody>
          </table>
        </div>
      </div>
    `;

    actualizarTablaRPT11(asignaturas, profesores);
  } catch (error) {
    showToast('Error al cargar asignaturas: ' + error.message, 'error');
  }
}

function actualizarTablaRPT11(asignaturas, profesores, filtro = '') {
  const tbody = document.getElementById('tbl-rpt11');
  if (!tbody) return;
  const filtradas = asignaturas.filter(a => {
    const q = filtro.toLowerCase();
    return a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q);
  });
  if (filtradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">No se encontraron asignaturas.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtradas.map(a => {
    const prof = profesores.find(p => p.codigo === a.profesor)?.nombre || 'Sin asignar';
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
        <td class="p-3 font-mono font-bold text-slate-700">${a.codigo}</td>
        <td class="p-3 text-slate-800 font-bold">${a.nombre}</td>
        <td class="p-3 text-center font-bold text-slate-500 font-mono">${a.creditos}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${a.estado === 'Activa' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'} font-title">${a.estado}</span></td>
        <td class="p-3 text-slate-500 font-medium">${prof}</td>
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

    // El backend ya filtra por carrera (GET /api/pensum/:idCarrera), no hace falta filtrar de nuevo aquí
    const pensumCarrera = await apiClient.getPensum(est.id_carrera);
    let creditosAprobados = 0;
    let creditosPendientes = 0;
    // creditos_requeridos es el total de la carrera (viene repetido en cada fila del JOIN), no se suma por asignatura
    const totalCreditosRequeridos = pensumCarrera[0]?.creditos_requeridos || 0;

    let asignaturasPensumHTML = '';
    let pendientesListHTML = '';

    pensumCarrera.forEach(p => {
      const asig = asignaturas.find(a => a.codigo === p.codigo_asignatura) || { codigo: p.codigo_asignatura, nombre: p.nombre_asignatura, creditos: p.creditos };
      const nota = notas.find(n => n.idAsignatura === p.codigo_asignatura);

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
    const pensum = await apiClient.getPensum(est.id_carrera);

    let totalPtsHonor = 0;
    let totalCreditosConNota = 0;
    let detalleFilasHTML = '';

    if (notas.length === 0) {
      detalleFilasHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400 italic">No hay calificaciones registradas.</td></tr>`;
    } else {
      detalleFilasHTML = notas.map(n => {
        const asig = asignaturas.find(a => a.codigo === n.idAsignatura) || { nombre: n.idAsignatura, creditos: 0 };
        const pts = literalAPuntos(n.literal);
        const ptsCr = pts * asig.creditos;
        totalPtsHonor += ptsCr;
        totalCreditosConNota += asig.creditos;
        return `
          <tr class="border-b border-slate-100 text-xs hover:bg-slate-50 transition">
            <td class="p-3 font-mono font-bold text-slate-700">${n.idAsignatura}</td>
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
    const materiasPendientes = pensumCarrera.filter(p => !materiasAprobadas.includes(p.codigo_asignatura));

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
      indiceActual: indice
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
  const config = { verde: 3.2, amarillo: 2.5 }; // Se podría obtener de la API, pero usamos valores por defecto.
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
      { id: 'rpt07', label: '<span class="material-symbols-outlined text-base">mail</span> RPT-07 · Bitácora Correos', action: 'rpt07' },
      { id: 'rpt08', label: '<span class="material-symbols-outlined text-base">database</span> RPT-08 · Logs Import/Export', action: 'rpt08' }
    );
  } else if (rol === 'maestro') {
    items.push(
      { header: 'Operaciones' },
      { id: 'ent06', label: '<span class="material-symbols-outlined text-base">filter_alt</span> ENT-06 · Filtro Reportes', action: 'ent06' },
      { id: 'ent07', label: '<span class="material-symbols-outlined text-base">grade</span> ENT-07 · Carga de Notas', action: 'ent07' },
      { header: 'Reportes' },
      { id: 'rpt11', label: '<span class="material-symbols-outlined text-base">library_books</span> RPT-11 · Catálogo Materias', action: 'rpt11' },
      { id: 'rpt04', label: '<span class="material-symbols-outlined text-base">warning</span> RPT-04 · Alertas de Riesgo', action: 'rpt04' },
      { id: 'rpt01', label: '<span class="material-symbols-outlined text-base">badge</span> RPT-01 · Boletín Oficial', action: 'rpt01' },
      { id: 'rpt07', label: '<span class="material-symbols-outlined text-base">mail</span> RPT-07 · Bitácora Correos', action: 'rpt07' },
      { id: 'rpt06', label: '<span class="material-symbols-outlined text-base">swap_horiz</span> RPT-06 · Tabla Conversión', action: 'rpt06' }
    );
  } else if (rol === 'estudiante') {
    items.push(
      { header: 'Mi Seguimiento' },
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