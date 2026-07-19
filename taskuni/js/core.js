// ============ ESTADO Y VARIABLES GLOBALES ============
let currentUser = null;
let selectedStudentIndex = '';
let activeFilter = { periodo: '', asignatura: '', seccion: '', estudiante: '' };

// ============ SIDEBAR RESPONSIVE (MÓVIL) ============
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

// ============ CONTROL DE MODO OSCURO ============
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

// ============ SISTEMA DE NOTIFICACIONES TOAST ============
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

// ============ EXPORTACIÓN DESCARGABLE REAL ============
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
  registrarLogActividad('EXPORTACIÓN', 'EXPORTACION_COMPLETADA', csvContent.split('\n').length - 1, filename);
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
  registrarLogActividad('EXPORTACIÓN', 'EXPORTACION_COMPLETADA', 1, filename);
}

function registrarLogActividad(tipo, evento, registros, archivo) {
  let logs = JSON.parse(localStorage.getItem('import_export_logs') || '[]');
  const newLog = {
    id_log: 'LOG-' + Math.floor(Math.random() * 10000),
    tipo,
    evento,
    periodo: getPeriodoActivo(),
    registros,
    validos: registros,
    errores: 0,
    archivo,
    fecha: new Date().toISOString().split('T')[0]
  };
  logs.unshift(newLog);
  saveStorage('import_export_logs', logs);
}

// ============ REINICIO Y CARGA DE MOCK DATA ============
function cargarSemillaDatos(forzar = false) {
  if (localStorage.getItem('taskUni_datos_cargados') && !forzar) return;

  const carreras = [
    { codigo: 'CAR-001', nombre: 'Ingeniería de Sistemas', facultad: 'Ingeniería y Tecnología', estado: 'Activa' },
    { codigo: 'CAR-002', nombre: 'Administración de Empresas', facultad: 'Ciencias Económicas y Sociales', estado: 'Activa' },
    { codigo: 'CAR-003', nombre: 'Arquitectura y Urbanismo', facultad: 'Arquitectura y Artes', estado: 'Activa' }
  ];
  localStorage.setItem('carreras', JSON.stringify(carreras));

  const estudiantes = [
    { matricula: '2024001', nombre: 'María Pérez', correo: 'maria@unphu.edu.do', carrera: 'CAR-001', estado: 'Activo' },
    { matricula: '2024002', nombre: 'Juan Gómez', correo: 'juan@unphu.edu.do', carrera: 'CAR-002', estado: 'Activo' },
    { matricula: '2024003', nombre: 'Sofía Tejada', correo: 'sofia@unphu.edu.do', carrera: 'CAR-001', estado: 'Activo' },
    { matricula: '2024004', nombre: 'Mateo Vásquez', correo: 'mateo@unphu.edu.do', carrera: 'CAR-003', estado: 'Activo' }
  ];
  localStorage.setItem('estudiantes', JSON.stringify(estudiantes));

  const profesores = [
    { codigo: 'PRO-001', nombre: 'Dr. Carlos Rodríguez', correo: 'carlos@unphu.edu.do', estado: 'Activo' },
    { codigo: 'PRO-002', nombre: 'Dra. Ana Martínez', correo: 'ana@unphu.edu.do', estado: 'Activo' },
    { codigo: 'PRO-003', nombre: 'Ing. Luis Guerrero', correo: 'luis@unphu.edu.do', estado: 'Activo' }
  ];
  localStorage.setItem('profesores', JSON.stringify(profesores));

  const asignaturas = [
    { codigo: 'INF-101', fontSymbol: 'code', nombre: 'Programación I', creditos: 4, profesor: 'PRO-001', estado: 'Activa' },
    { codigo: 'INF-201', fontSymbol: 'database', nombre: 'Bases de Datos', creditos: 3, profesor: 'PRO-002', estado: 'Activa' },
    { codigo: 'MAT-101', fontSymbol: 'calculate', nombre: 'Cálculo I', creditos: 4, profesor: 'PRO-001', estado: 'Activa' },
    { codigo: 'ARQ-110', fontSymbol: 'architecture', nombre: 'Diseño Arquitectónico I', creditos: 5, profesor: 'PRO-003', estado: 'Activa' },
    { codigo: 'CON-101', fontSymbol: 'payments', nombre: 'Contabilidad General', creditos: 3, profesor: 'PRO-002', estado: 'Activa' }
  ];
  localStorage.setItem('asignaturas', JSON.stringify(asignaturas));

  const periodos = [
    { periodo: '9-2026', cuatrimestre: 'Septiembre-Diciembre', fechaInicio: '2026-09-01', fechaFin: '2026-12-15', estado: 'Activo' }
  ];
  localStorage.setItem('periodos', JSON.stringify(periodos));

  const secciones = [
    { id: 'SEC-001', numero: '01', idAsignatura: 'INF-101', idProfesor: 'PRO-001', periodo: '9-2026', estado: 'Activa' },
    { id: 'SEC-002', numero: '01', idAsignatura: 'INF-201', idProfesor: 'PRO-002', periodo: '9-2026', estado: 'Activa' },
    { id: 'SEC-003', numero: '01', idAsignatura: 'MAT-101', idProfesor: 'PRO-001', periodo: '9-2026', estado: 'Activa' },
    { id: 'SEC-004', numero: '01', idAsignatura: 'ARQ-110', idProfesor: 'PRO-003', periodo: '9-2026', estado: 'Activa' },
    { id: 'SEC-005', numero: '01', idAsignatura: 'CON-101', idProfesor: 'PRO-002', periodo: '9-2026', estado: 'Activa' }
  ];
  localStorage.setItem('secciones', JSON.stringify(secciones));

  const notas = [
    { idEstudiante: '2024001', idAsignatura: 'INF-101', idSeccion: 'SEC-001', acum1: 90, acum2: 95, acum3: 88, evalFinal: 92, notaFinal: 91.25, literal: 'A', estado: 'Aprobado' },
    { idEstudiante: '2024001', idAsignatura: 'INF-201', idSeccion: 'SEC-002', acum1: 85, acum2: 78, acum3: 82, evalFinal: 80, notaFinal: 81.25, literal: 'B', estado: 'Aprobado' },
    { idEstudiante: '2024002', idAsignatura: 'CON-101', idSeccion: 'SEC-005', acum1: 75, acum2: 70, acum3: 78, evalFinal: 65, notaFinal: 72.00, literal: 'C', estado: 'Aprobado' },
    { idEstudiante: '2024003', idAsignatura: 'INF-101', idSeccion: 'SEC-001', acum1: 50, acum2: 60, acum3: 55, evalFinal: 48, notaFinal: 53.25, literal: 'F', estado: 'Reprobado' },
    { idEstudiante: '2024004', idAsignatura: 'ARQ-110', idSeccion: 'SEC-004', acum1: 65, acum2: 70, acum3: 68, evalFinal: 60, notaFinal: 65.75, literal: 'D', estado: 'Aprobado' }
  ];
  localStorage.setItem('notas', JSON.stringify(notas));

  const pensum = [
    { idCarrera: 'CAR-001', idAsignatura: 'INF-101', creditosRequeridos: 4, estado: 'Activo' },
    { idCarrera: 'CAR-001', idAsignatura: 'INF-201', creditosRequeridos: 3, estado: 'Activo' },
    { idCarrera: 'CAR-001', idAsignatura: 'MAT-101', creditosRequeridos: 4, estado: 'Activo' },
    { idCarrera: 'CAR-002', idAsignatura: 'MAT-101', creditosRequeridos: 4, estado: 'Activo' },
    { idCarrera: 'CAR-002', idAsignatura: 'CON-101', creditosRequeridos: 3, estado: 'Activo' },
    { idCarrera: 'CAR-003', idAsignatura: 'MAT-101', creditosRequeridos: 4, estado: 'Activo' },
    { idCarrera: 'CAR-003', idAsignatura: 'ARQ-110', creditosRequeridos: 5, estado: 'Activo' }
  ];
  localStorage.setItem('pensum', JSON.stringify(pensum));

  const config = { riesgo: 60.0, verde: 3.2, amarillo: 2.5 };
  localStorage.setItem('configuracion', JSON.stringify(config));

  const notificaciones = [
    { id_notificacion: 'NOT-001', id_estudiante: '2024003', asunto: 'Aviso de Riesgo Académico', mensaje: 'Riesgo académico detectado. Consulte con su asesor. Materia: INF-101. Promedio: 53.25', fecha_envio: '2026-07-13', estado: 'Enviado' }
  ];
  localStorage.setItem('notificaciones', JSON.stringify(notificaciones));

  const importExportLogs = [
    { id_log: 'LOG-001', tipo: 'IMPORTACIÓN', evento: 'IMPORTACION_COMPLETADA', periodo: '9-2026', registros: 4, validos: 4, errores: 0, archivo: 'seed_estudiantes.xlsx', fecha: '2026-07-12' }
  ];
  localStorage.setItem('import_export_logs', JSON.stringify(importExportLogs));

  localStorage.setItem('taskUni_datos_cargados', 'true');
  if (forzar) {
    showToast('Base de datos restablecida correctamente.');
    location.reload();
  }
}

function confirmarReiniciarBase() {
  if (confirm('¿Estás seguro de que deseas reiniciar todos los datos? Esto borrará tus cambios manuales y cargará los datos por defecto.')) {
    cargarSemillaDatos(true);
  }
}

// ============ BASE DE DATOS GETTERS / SETTERS ============
const getEstudiantes   = () => JSON.parse(localStorage.getItem('estudiantes') || '[]');
const getAsignaturas   = () => JSON.parse(localStorage.getItem('asignaturas') || '[]');
const getProfesores    = () => JSON.parse(localStorage.getItem('profesores') || '[]');
const getCarreras      = () => JSON.parse(localStorage.getItem('carreras') || '[]');
const getPeriodos      = () => JSON.parse(localStorage.getItem('periodos') || '[]');
const getSecciones     = () => JSON.parse(localStorage.getItem('secciones') || '[]');
const getNotas         = () => JSON.parse(localStorage.getItem('notas') || '[]');
const getPensum        = () => JSON.parse(localStorage.getItem('pensum') || '[]');
const getConfig        = () => JSON.parse(localStorage.getItem('configuracion') || '{"riesgo":60.0,"verde":3.2,"amarillo":2.5}');
const getNotificaciones = () => JSON.parse(localStorage.getItem('notificaciones') || '[]');
const getLogs          = () => JSON.parse(localStorage.getItem('import_export_logs') || '[]');

const getPeriodoActivo = () => getPeriodos().find(p => p.estado === 'Activo')?.periodo || '9-2026';
const saveStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// ============ OPERACIONES Y CÁLCULOS GENERALES ============
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
    default:  return 0.0;
  }
}

function calcularIndiceEstudiante(matricula) {
  const notas = getNotas().filter(n => n.idEstudiante === matricula);
  const asignaturas = getAsignaturas();
  if (notas.length === 0) return 0.0;

  let totalPuntosCreditos = 0;
  let totalCreditos = 0;
  notas.forEach(nota => {
    const asig = asignaturas.find(a => a.codigo === nota.idAsignatura);
    const creditos = asig ? asig.creditos : 0;
    const pts = literalAPuntos(nota.literal);
    totalPuntosCreditos += (pts * creditos);
    totalCreditos += creditos;
  });
  return totalCreditos > 0 ? (totalPuntosCreditos / totalCreditos) : 0.0;
}

function obtenerEstadoSemaforo(indice, config) {
  if (indice >= config.verde)    return { label: 'Verde (Alto)',      color: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50' };
  if (indice >= config.amarillo) return { label: 'Amarillo (Alerta)', color: 'bg-amber-500',   text: 'text-amber-500',   border: 'border-amber-200',   bg: 'bg-amber-50'   };
  return                                { label: 'Rojo (Riesgo)',     color: 'bg-rose-500',    text: 'text-rose-500',    border: 'border-rose-200',    bg: 'bg-rose-50'    };
}

function notesEmpty(arr) {
  return arr.length === 0;
}
