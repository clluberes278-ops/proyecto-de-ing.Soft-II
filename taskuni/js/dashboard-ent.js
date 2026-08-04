// ============================================================
// dashboard-ent.js
// Módulos de entrada/mantenimiento ENT-01..ENT-11 (CRUD:
// estudiantes, asignaturas, períodos, profesores, carreras,
// facultades, secciones, filtro de reportes, carga de notas,
// umbrales, inscripción de materias).
// Requiere dashboard-core.js cargado antes (usa contenedor,
// tituloModulo, currentUser, showToast, apiClient, etc.).
// ============================================================
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
        await apiClient.actualizarAsignatura(asignaturaEditandoCodigo, { nombre: nom, creditos: cred, id_carrera: carId, estado: 'Activa', usuario: currentUser.usuario });
        showToast('Asignatura actualizada con éxito.');
        cancelarEdicionAsignatura();
      } else {
        await apiClient.crearAsignatura({ codigo: cod, nombre: nom, creditos: cred, id_carrera: carId, estado: 'Activa', usuario: currentUser.usuario });
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
    // Etiqueta visible de la sección ("Sección 01"), para los mensajes al
    // usuario. Nunca mostrar idSeccion: es la clave interna, no el número.
    const labelSeccion = selSeccion.options[selSeccion.selectedIndex]?.text || 'la sección seleccionada';
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
        if (hint) hint.textContent = `${labelSeccion} no tiene estudiantes matriculados.`;
        return;
      }

      // No hace falta re-filtrar aquí: idSeccion viene del select de "Sección",
      // que ya está acotado a las secciones del maestro (ver "secciones" más
      // arriba, filtrado por codigosDelProfesor). Todo estudiante que devuelva
      // getEstudiantesDeSeccion para esa sección ya pertenece a su materia.
      const estudiantesParaMostrar = matriculados;

      if (estudiantesParaMostrar.length === 0) {
        selEstudiante.innerHTML = '<option value="">No hay estudiantes matriculados en esta sección</option>';
        if (hint) hint.textContent = `${labelSeccion} no tiene estudiantes matriculados.`;
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
    const selSeccionSubmit = document.getElementById('ent06-seccion');
    activeFilter.periodo = document.getElementById('ent06-periodo').value;
    activeFilter.asignatura = document.getElementById('ent06-asignatura').value;
    activeFilter.seccion = selSeccionSubmit.value;
    // El value del select es el id_seccion; guardamos aparte la etiqueta visible
    // para que el panel de estatus muestre lo mismo que eligió el usuario.
    activeFilter.seccionLabel = selSeccionSubmit.options[selSeccionSubmit.selectedIndex]?.text || '';
    activeFilter.estudiante = document.getElementById('ent06-estudiante').value;
    showToast('Filtro configurado. Reportes desbloqueados.');
    actualizarEstatusFiltro();
  });

  document.getElementById('btn-limpiar-ent06').addEventListener('click', () => {
    activeFilter = { periodo: '', asignatura: '', seccion: '', seccionLabel: '', estudiante: '' };
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
        <div>Sección: <strong class="text-slate-800">${activeFilter.seccionLabel || `ID ${activeFilter.seccion}`}</strong></div>
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
          <p class="text-[11px] text-slate-400 mt-1 font-sans">Impresión formal y exportación Excel del expediente del estudiante.</p>
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
  let codigoProfesorActual = null;
  if (currentUser.rol === 'maestro') {
    const prof = profesores.find(p => p.correo === currentUser.usuario);
    if (prof) {
      codigoProfesorActual = prof.codigo;
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
    const seccionesDeLaAsignatura = secciones.filter(s =>
      s.codigoAsignatura === codAsig && (!codigoProfesorActual || s.codigoProfesor === codigoProfesorActual)
    );
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
        acum1: '', acum2: '', acum3: '', evalFinal: '', notaFinal: null, literal: 'EC', estado: 'En Curso'
      };
      const finalVal = (notaExistente.notaFinal === null || notaExistente.notaFinal === undefined) ? '—' : notaExistente.notaFinal.toFixed(2);
      const finalColor = notaExistente.estado === 'Aprobado' ? 'text-emerald-600 font-bold' : (notaExistente.estado === 'Reprobado' ? 'text-rose-600 font-bold' : (notaExistente.estado === 'En Curso' ? 'text-amber-600 font-bold' : ''));
      const badgeClase = notaExistente.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' : (notaExistente.estado === 'Reprobado' ? 'bg-rose-100 text-rose-800' : (notaExistente.estado === 'En Curso' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'));
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
          <td class="p-3"><span class="estado-badge-span px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClase}">${notaExistente.estado || '-'}</span></td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showToast('Error al cargar acta: ' + error.message, 'error');
  }
}

function recalcularNotaFila(input) {
  const fila = input.closest('tr');
  const ac1 = fila.querySelector('[data-campo="ac1"]').value;
  const ac2 = fila.querySelector('[data-campo="ac2"]').value;
  const ac3 = fila.querySelector('[data-campo="ac3"]').value;
  const exFinal = fila.querySelector('[data-campo="final"]').value;
  const { literal, estado, notaFinal } = calcularLiteralYEstado(ac1, ac2, ac3, exFinal);
  const spanFinal = fila.querySelector('.nota-final-span');
  const spanLiteral = fila.querySelector('.literal-span');
  const spanBadge = fila.querySelector('.estado-badge-span');
  spanFinal.textContent = notaFinal === null ? '—' : notaFinal.toFixed(2);
  spanLiteral.textContent = literal;
  spanBadge.textContent = estado;
  const colorTexto = estado === 'Aprobado' ? 'text-emerald-600' : (estado === 'Reprobado' ? 'text-rose-600' : 'text-amber-600');
  const colorBadge = estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' : (estado === 'Reprobado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800');
  spanFinal.className = `nota-final-span font-bold ${colorTexto}`;
  spanBadge.className = `estado-badge-span px-2 py-0.5 rounded-full text-[10px] font-bold ${colorBadge}`;
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
    const ac1 = fila.querySelector('[data-campo="ac1"]').value;
    const ac2 = fila.querySelector('[data-campo="ac2"]').value;
    const ac3 = fila.querySelector('[data-campo="ac3"]').value;
    const fin = fila.querySelector('[data-campo="final"]').value;
    // Vacío = "En Curso" (sin nota todavía), no es un valor fuera de rango.
    const fueraDeRango = [ac1, ac2, ac3, fin].some(v => v !== '' && (Number(v) < 0 || Number(v) > 100));
    if (fueraDeRango) {
      errorRango = true;
      return;
    }
    const { literal, estado, notaFinal } = calcularLiteralYEstado(ac1, ac2, ac3, fin);
    notas.push({
      idEstudiante: matricula,
      idAsignatura: codAsig,
      idSeccion: idSeccionSel,
      acum1: ac1 === '' ? null : Number(ac1),
      acum2: ac2 === '' ? null : Number(ac2),
      acum3: ac3 === '' ? null : Number(ac3),
      evalFinal: fin === '' ? null : Number(fin),
      notaFinal,
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
  const periodo = activeFilter.periodo || await getPeriodoActivo();
  const config = await apiClient.getConfiguracion(periodo);

  contenedor.innerHTML = `
    <div class="max-w-2xl bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
      <div class="pb-3 border-b border-slate-100">
        <h3 class="font-title text-lg font-bold text-slate-800">Parámetros de Semáforo</h3>
        <p class="text-xs text-slate-400 mt-1">Ajusta los umbrales requeridos de índice acumulado para el período <strong class="text-slate-600">${periodo}</strong>.</p>
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
      await apiClient.updateConfiguracion({ verde, amarillo, periodo });
      showToast(`Umbrales de semaforización guardados para el período ${periodo}.`);
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  });
}

async function restaurarConfigUmbrales() {
  try {
    const periodo = activeFilter.periodo || await getPeriodoActivo();
    await apiClient.updateConfiguracion({ verde: 3.2, amarillo: 2.5, periodo });
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


