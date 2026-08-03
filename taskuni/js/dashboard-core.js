// ============================================================
// dashboard-core.js
// Estado global, helpers compartidos (sidebar, dark mode, toast,
// exportaciones, cálculos de nota/índice), el dispatcher renderView()
// y el bootstrap de la app (menú lateral, sesión, init on load).
// Se carga ANTES de dashboard-ent.js y dashboard-rpt.js: estos
// dependen de las variables/funciones definidas aquí (contenedor,
// tituloModulo, currentUser, showToast, calcularIndiceEstudiante, etc.).
// ============================================================
// ============ ESTADO Y VARIABLES GLOBALES ============
let currentUser = null;
let selectedStudentIndex = '';
// OJO: `seccion` guarda el id_seccion (numérico), que es lo que consumen los
// reportes. `seccionLabel` guarda el texto visible ("Sección 01") sólo para
// mostrarlo en pantalla: son cosas distintas y no deben intercambiarse.
let activeFilter = { periodo: '', asignatura: '', seccion: '', seccionLabel: '', estudiante: '' };

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
  const registros = csvContent.split('\n').length - 1;
  // Guardar log local (opcional)
  let logs = JSON.parse(localStorage.getItem('import_export_logs') || '[]');
  logs.unshift({
    id_log: 'LOG-' + Math.floor(Math.random() * 10000),
    tipo: 'EXPORTACIÓN',
    evento: 'EXPORTACION_COMPLETADA',
    periodo: 'desconocido',
    registros,
    archivo: filename,
    fecha: new Date().toISOString().split('T')[0]
  });
  localStorage.setItem('import_export_logs', JSON.stringify(logs));
  // Bitácora real en el backend (dbo.Log), además del log local de arriba.
  apiClient.registrarLog({
    tipo: 'EXPORTACIÓN', evento: 'EXPORTACION_COMPLETADA', entidad: 'Archivo', accion: 'EXPORT',
    archivo: filename, registros, descripcion: `Exportación CSV: ${filename}`
  }).catch(err => console.warn('No se pudo registrar la exportación en el backend:', err.message));
}

// ============ REINICIO (desactivado) ============
function confirmarReiniciarBase() {
  showToast('El reinicio de la base de datos debe hacerse desde el backend.', 'error');
}

// ============ CÁLCULOS ============
// Una nota es "En Curso" (literal 'EC') si falta cualquiera de las 4
// evaluaciones (acum1/acum2/acum3/eval_final): no se calcula promedio ni
// literal A-F hasta que las 4 estén cargadas, para no mostrar como
// "reprobado" a un estudiante que simplemente aún no tiene notas.
function calcularLiteralYEstado(ac1, ac2, ac3, evalFinal) {
  const falta = [ac1, ac2, ac3, evalFinal].some(v =>
    v === '' || v === null || v === undefined || Number.isNaN(Number(v))
  );
  if (falta) {
    return { literal: 'EC', estado: 'En Curso', notaFinal: null };
  }
  const notaFinal = (Number(ac1) + Number(ac2) + Number(ac3) + Number(evalFinal)) / 4;
  let literal = 'F';
  if (notaFinal >= 90) literal = 'A';
  else if (notaFinal >= 80) literal = 'B';
  else if (notaFinal >= 70) literal = 'C';
  else if (notaFinal >= 60) literal = 'D';
  const estado = notaFinal >= 60 ? 'Aprobado' : 'Reprobado';
  return { literal, estado, notaFinal };
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
  // Las materias "En Curso" (literal 'EC') se excluyen por completo (puntos
  // Y créditos), no solo se les asigna 0 puntos: contarlas arrastraría el
  // índice hacia abajo por materias que ni siquiera tienen nota final.
  const notasEst = notas.filter(n => n.matriculaEstudiante === matricula && n.literal !== 'EC');
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

// Mismos permisos que generarMenuLateral(): qué vistas puede alcanzar cada
// rol. renderView() la usa para bloquear accesos directos (URL/consola) a
// módulos que el menú ya oculta pero que antes se podían renderizar igual.
const VISTAS_POR_ROL = {
  admin: ['inicio', 'ent01', 'ent02', 'ent03', 'ent04', 'ent05', 'ent06', 'ent07', 'ent08', 'ent09', 'ent10',
    'rpt01', 'rpt04', 'rpt05', 'rpt06', 'rpt07', 'rpt11', 'rpt12', 'rpt13', 'rpt15'],
  maestro: ['inicio', 'ent06', 'ent07', 'rpt04', 'rpt06', 'rpt07', 'rpt11'],
  estudiante: ['inicio', 'ent11', 'rpt01', 'rpt05', 'rpt06', 'rpt07', 'rpt12', 'rpt13']
};

function renderAccesoDenegado(viewName) {
  tituloModulo.textContent = 'Acceso denegado';
  contenedor.innerHTML = `
    <div class="bg-white p-8 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-4">
      <div class="p-3 bg-rose-50 text-rose-600 rounded-xl flex items-center">
        <span class="material-symbols-outlined text-3xl">block</span>
      </div>
      <div>
        <h4 class="font-title text-lg font-bold text-slate-800">No tenés permiso para ver este módulo</h4>
        <p class="text-xs text-slate-500 mt-1">El módulo "${viewName}" no está disponible para el rol "${currentUser?.rol || ''}".</p>
      </div>
    </div>
  `;
}

async function renderView(viewName) {
  const permitidas = VISTAS_POR_ROL[currentUser?.rol] || [];
  if (!permitidas.includes(viewName)) {
    renderAccesoDenegado(viewName);
    return;
  }
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
    case 'rpt15': await renderRPT15(); break;
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
    const esMaestro = currentUser.rol === 'maestro';
    // Se piden DOS listas de asignaturas a propósito:
    //  - asignaturasCatalogo: catálogo completo. Es la base del cálculo de
    //    índice, que pondera por créditos. Debe incluir todas las materias del
    //    estudiante, porque los umbrales de ConfiguracionUmbral están definidos
    //    sobre el índice global, no sobre el rendimiento en una sola clase.
    //  - asignaturas: lo que se muestra en el contador "Materias Activas", que
    //    para el maestro sí se acota a las suyas.
    const [estudiantes, asignaturasCatalogo, asignaturasPropias, config, notas, misMatriculas] = await Promise.all([
      apiClient.getEstudiantes(),
      apiClient.getAsignaturas(),
      esMaestro ? apiClient.getAsignaturas({ idProfesor: currentUser.idReferencia }) : Promise.resolve(null),
      apiClient.getConfiguracion(),
      apiClient.getNotas(),
      esMaestro ? obtenerMatriculasEstudiantesDeMaestro() : Promise.resolve(null)
    ]);
    const asignaturas = asignaturasPropias || asignaturasCatalogo;

    // Si la cuenta es de un estudiante, todo el panel refleja SOLO sus datos:
    // semáforo, contadores, promedio, etc. Si es maestro, se acota a los
    // estudiantes inscritos en sus propias secciones (misMatriculas).
    let listaEstudiantes = estudiantes;
    if (currentUser.rol === 'estudiante') {
      listaEstudiantes = estudiantes.filter(e => e.correo === currentUser.usuario);
    } else if (esMaestro && misMatriculas) {
      listaEstudiantes = estudiantes.filter(e => misMatriculas.has(e.matricula));
    }

    const totalEstudiantes = listaEstudiantes.filter(e => !e.estado || e.estado === 'Activo').length;
    const totalAsignaturas = asignaturas.length;

    // Un estudiante sin notas cargadas NO se clasifica: antes su índice daba 0
    // y por tanto caía en rojo, inflando la alerta con alumnos que ni siquiera
    // han cursado nada. Se usa el mismo criterio que renderMiniGraficoSemaforo()
    // para que la tarjeta y el gráfico den siempre el mismo número.
    let sumIndices = 0, totalConIndice = 0, estudiantesEnRojo = 0;
    listaEstudiantes.forEach(est => {
      if (est.estado && est.estado !== 'Activo') return;
      if (!notas.some(n => n.matriculaEstudiante === est.matricula)) return;
      const ind = calcularIndiceEstudiante(est.matricula, notas, asignaturasCatalogo);
      sumIndices += ind;
      totalConIndice++;
      if (ind < config.amarillo) estudiantesEnRojo++;
    });
    const promedioGeneral = totalConIndice > 0 ? sumIndices / totalConIndice : 0;
    const pctRojo = totalConIndice > 0 ? (estudiantesEnRojo / totalConIndice) * 100 : 0;

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
            <h3 class="welcome-title font-title text-3xl font-extrabold mb-2 text-white">Bienvenido, ${currentUser.nombreMostrar || currentUser.usuario}</h3>
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
            ${renderMiniGraficoSemaforo(listaEstudiantes, notas, config, asignaturasCatalogo)}
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

function renderMiniGraficoSemaforo(estudiantes, notas, config, asignaturas) {
  // Si la sesión es de un estudiante, sólo mostramos su semáforo, no el global.
  let lista = estudiantes;
  if (currentUser && currentUser.rol === 'estudiante') {
    lista = estudiantes.filter(e => e.correo === currentUser.usuario);
  }
  let verde = 0, amarillo = 0, rojo = 0;
  lista.forEach(est => {
    // Mismo criterio que las tarjetas KPI de renderInicio(): solo estudiantes
    // activos y con notas cargadas.
    if (est.estado && est.estado !== 'Activo') return;
    if (!notas.some(n => n.matriculaEstudiante === est.matricula)) return;
    // `asignaturas` es obligatorio: calcularIndiceEstudiante() pondera por
    // créditos, así que con una lista vacía totalCred queda en 0 y devuelve 0.0
    // para todo el mundo (todos caerían en rojo). Ese era el bug original.
    const ind = calcularIndiceEstudiante(est.matricula, notas, asignaturas || []);
    if (ind >= config.verde) verde++;
    else if (ind >= config.amarillo) amarillo++;
    else rojo++;
  });
  // El denominador son los clasificados, no lista.length: si se incluyen los
  // estudiantes sin notas las barras nunca suman 100% y todo se ve más bajo.
  const total = verde + amarillo + rojo;
  const pVerde = total > 0 ? (verde / total) * 100 : 0;
  const pAmarillo = total > 0 ? (amarillo / total) * 100 : 0;
  const pRojo = total > 0 ? (rojo / total) * 100 : 0;

  if (total === 0) {
    return `<p class="text-xs text-slate-400 italic text-center py-6">Aún no hay notas cargadas para clasificar estudiantes.</p>`;
  }

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
// GENERAR MENÚ LATERAL SEGÚN ROL
// ============================================================
function generarMenuLateral(rol) {
  const menuContainer = document.getElementById('menu-container');
  let items = [];
  items.push({ id: 'inicio', label: '<span class="material-symbols-outlined text-base">dashboard</span> Panel General', action: 'inicio' });

  if (rol === 'admin') {
    items.push(
      { header: 'Entradas (Mantenimiento)' },
      { id: 'ent01', label: '<span class="material-symbols-outlined text-base">group</span> Estudiantes', action: 'ent01' },
      { id: 'ent02', label: '<span class="material-symbols-outlined text-base">book</span> Asignaturas', action: 'ent02' },
      { id: 'ent03', label: '<span class="material-symbols-outlined text-base">calendar_today</span> Períodos', action: 'ent03' },
      { id: 'ent04', label: '<span class="material-symbols-outlined text-base">co_present</span> Profesores', action: 'ent04' },
      { id: 'ent05', label: '<span class="material-symbols-outlined text-base">account_balance</span> Carreras', action: 'ent05' },
      { id: 'ent10', label: '<span class="material-symbols-outlined text-base">apartment</span> Facultades', action: 'ent10' },
      { id: 'ent09', label: '<span class="material-symbols-outlined text-base">room_preferences</span> Registro Sección', action: 'ent09' },
      { id: 'ent06', label: '<span class="material-symbols-outlined text-base">filter_alt</span> Filtro Reportes', action: 'ent06' },
      { id: 'ent07', label: '<span class="material-symbols-outlined text-base">grade</span> Carga de Notas', action: 'ent07' },
      { id: 'ent08', label: '<span class="material-symbols-outlined text-base">settings</span> Umbrales', action: 'ent08' },
      { header: 'Reportes e Indicadores' },
      { id: 'rpt11', label: '<span class="material-symbols-outlined text-base">library_books</span> Catálogo Materias', action: 'rpt11' },
      { id: 'rpt05', label: '<span class="material-symbols-outlined text-base">traffic</span> Semáforo Riesgo', action: 'rpt05' },
      { id: 'rpt04', label: '<span class="material-symbols-outlined text-base">warning</span> Alertas de Riesgo', action: 'rpt04' },
      { id: 'rpt12', label: '<span class="material-symbols-outlined text-base">donut_large</span> Estado Pensum', action: 'rpt12' },
      { id: 'rpt13', label: '<span class="material-symbols-outlined text-base">monitoring</span> Índice Académico', action: 'rpt13' },
      { id: 'rpt01', label: '<span class="material-symbols-outlined text-base">badge</span> Boletín Oficial', action: 'rpt01' },
      { id: 'rpt06', label: '<span class="material-symbols-outlined text-base">swap_horiz</span> Conversión', action: 'rpt06' },
      { id: 'rpt07', label: '<span class="material-symbols-outlined text-base">mail</span> Bitácora Alertas', action: 'rpt07' },
      { id: 'rpt15', label: '<span class="material-symbols-outlined text-base">list_alt</span> Bitácora Actividad', action: 'rpt15' }
    );
  } else if (rol === 'maestro') {
    items.push(
      { header: 'Operaciones' },
      { id: 'ent06', label: '<span class="material-symbols-outlined text-base">filter_alt</span> Filtro Reportes', action: 'ent06' },
      { id: 'ent07', label: '<span class="material-symbols-outlined text-base">grade</span> Carga de Notas', action: 'ent07' },
      { header: 'Mis materias y reportes' },
      // RPT-01 (Boletín Oficial) removido: un maestro no necesita ver el
      // expediente del estudiante (carrera, índice acumulado, etc.).
      { id: 'rpt11', label: '<span class="material-symbols-outlined text-base">library_books</span> Mis Materias', action: 'rpt11' },
      { id: 'rpt04', label: '<span class="material-symbols-outlined text-base">warning</span> Alertas de Riesgo', action: 'rpt04' },
      { id: 'rpt07', label: '<span class="material-symbols-outlined text-base">mail</span> Bitácora Alertas', action: 'rpt07' },
      { id: 'rpt06', label: '<span class="material-symbols-outlined text-base">swap_horiz</span> Tabla Conversión', action: 'rpt06' }
    );
  } else if (rol === 'estudiante') {
    items.push(
      { header: 'Mi Seguimiento' },
      { id: 'ent11', label: '<span class="material-symbols-outlined text-base">edit_calendar</span> Inscripción de Materias', action: 'ent11' },
      { id: 'rpt01', label: '<span class="material-symbols-outlined text-base">badge</span> Mi Boletín Oficial', action: 'rpt01' },
      { id: 'rpt12', label: '<span class="material-symbols-outlined text-base">donut_large</span> Mi Pensum', action: 'rpt12' },
      { id: 'rpt13', label: '<span class="material-symbols-outlined text-base">monitoring</span> Mi Índice / Simulador', action: 'rpt13' },
      { id: 'rpt05', label: '<span class="material-symbols-outlined text-base">traffic</span> Mi Semáforo', action: 'rpt05' },
      { id: 'rpt07', label: '<span class="material-symbols-outlined text-base">mail</span> Mis Notificaciones', action: 'rpt07' },
      { id: 'rpt06', label: '<span class="material-symbols-outlined text-base">swap_horiz</span> Reglas Equivalencia', action: 'rpt06' }
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
  document.getElementById('user-role-badge').textContent = sesion.rol;

  // Mostrar el nombre real de la cuenta en vez del correo. Estudiante/maestro
  // tienen su nombre en Estudiante/Profesor (buscado por correo); admin no
  // tiene un perfil con nombre propio, así que se usa el usuario del correo.
  let nombreMostrar = sesion.usuario.split('@')[0];
  try {
    if (sesion.rol === 'estudiante') {
      const estudiantes = await apiClient.getEstudiantes();
      const est = estudiantes.find(e => e.correo === sesion.usuario);
      if (est) nombreMostrar = est.nombre;
    } else if (sesion.rol === 'maestro') {
      const profesores = await apiClient.getProfesores();
      const prof = profesores.find(p => p.correo === sesion.usuario);
      if (prof) nombreMostrar = prof.nombre;
    } else {
      nombreMostrar = nombreMostrar.charAt(0).toUpperCase() + nombreMostrar.slice(1);
    }
  } catch {
    // Si falla la búsqueda, se queda con el username del correo como fallback.
  }
  currentUser.nombreMostrar = nombreMostrar;
  document.getElementById('user-email').textContent = nombreMostrar;
  const userInitials = nombreMostrar.trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase();
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