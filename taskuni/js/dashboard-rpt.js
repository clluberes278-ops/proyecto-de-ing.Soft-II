// ============================================================
// dashboard-rpt.js
// Módulos de reportes/indicadores RPT-01..RPT-15 (boletín,
// alertas de riesgo, semáforo, tabla de conversión, catálogo,
// bitácora de alertas, pensum, índice académico, bitácora de
// actividad).
// Requiere dashboard-core.js cargado antes (usa contenedor,
// tituloModulo, currentUser, showToast, apiClient, etc.).
// ============================================================
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
    window._rpt01Data = { est, notas, asignaturas, indice, carreraNombre };

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
            <td class="p-3 text-center font-semibold text-slate-500 font-mono">${n.notaFinal === null || n.notaFinal === undefined ? '—' : n.notaFinal.toFixed(1)}</td>
            <td class="p-3 text-center font-bold text-slate-850 font-title">${n.literal}</td>
            <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${n.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' : (n.estado === 'Reprobado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800')}">${n.estado || '-'}</span></td>
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
              <button onclick="exportarExcelBoletin()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow font-title">[ EXPORTAR EXCEL ]</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast('Error al cargar boletín: ' + error.message, 'error');
  }
}

function exportarExcelBoletin() {
  const datos = window._rpt01Data;
  if (!datos) {
    showToast('Genera el boletín antes de exportar.', 'error');
    return;
  }
  const { est, notas, asignaturas, indice, carreraNombre } = datos;
  let csv = `Matricula,Nombre,Carrera,Indice Acumulado\n`;
  csv += `${est.matricula},"${est.nombre}","${carreraNombre}",${indice.toFixed(2)}\n\n`;
  csv += `Codigo,Asignatura,Creditos,Nota Final,Literal,Estado\n`;
  notas.forEach(n => {
    const asig = asignaturas.find(a => a.id_asignatura === n.idAsignatura) || { codigo: n.idAsignatura, nombre: n.nombreAsignatura || n.idAsignatura, creditos: 0 };
    const notaFinal = n.notaFinal === null || n.notaFinal === undefined ? '' : n.notaFinal.toFixed(1);
    csv += `${asig.codigo},"${asig.nombre}",${asig.creditos},${notaFinal},${n.literal},${n.estado || ''}\n`;
  });
  downloadCSV(`boletin_${est.matricula}.csv`, csv);
}

// ============================================================
// 12. RPT-04: ALERTAS DE RIESGO ACADÉMICO
// ============================================================
async function renderRPT04() {
  tituloModulo.textContent = 'RPT-04 · Alertas de Riesgo Académico';

  try {
    // El período acota las notas. Antes se pedían TODAS y el historial completo
    // aparecía como alertas vigentes. Se respeta el filtro de ENT-06 si está
    // configurado; si no, se usa el período activo.
    const periodo = activeFilter.periodo || await getPeriodoActivo();

    const [notas, estudiantes, asignaturas, config, estadoCorreo, misMatriculas] = await Promise.all([
      apiClient.getNotas({ periodo }),
      apiClient.getEstudiantes(),
      apiClient.getAsignaturas(),
      apiClient.getConfiguracion(),
      apiClient.getEstadoCorreo(),
      obtenerMatriculasEstudiantesDeMaestro()
    ]);

    // Umbral de reprobado leído de ConfiguracionUmbral.riesgo (editable en
    // ENT-08). Antes estaba fijo en 60.0, así que cambiar la configuración no
    // tenía ningún efecto aquí: mismo patrón del bug F6 documentado en CAMBIOS.md.
    const umbralRiesgo = Number(config && config.riesgo != null ? config.riesgo : 60.0);

    // El botón y el aviso cambian según haya o no SMTP realmente operativo, para
    // no prometer un envío que el backend no puede hacer.
    const correoActivo = !!(estadoCorreo && estadoCorreo.configurado && estadoCorreo.ok);

    // Defensa en profundidad: si un estudiante llegara a esta vista (aunque
    // el menú y renderView ya lo bloquean), acotar a su propia matrícula en
    // vez de mostrar las alertas de toda la universidad.
    let matriculaPropia = null;
    if (currentUser.rol === 'estudiante') {
      const yo = estudiantes.find(e => e.correo === currentUser.usuario);
      matriculaPropia = yo ? yo.matricula : '__ninguna__';
    }

    const reprobados = [];
    notas.forEach(nota => {
      if (misMatriculas && !misMatriculas.has(nota.matriculaEstudiante)) return;
      if (matriculaPropia && nota.matriculaEstudiante !== matriculaPropia) return;
      // Una materia "En Curso" (notaFinal null) todavía no tiene promedio: en
      // JS `null < umbralRiesgo` da true (null se coerciona a 0), lo que
      // generaba una falsa alerta de riesgo para materias sin notas cargadas.
      if (nota.notaFinal === null || nota.notaFinal === undefined) return;
      if (nota.notaFinal < umbralRiesgo) {
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
            umbral: umbralRiesgo,
            diferencia: nota.notaFinal - umbralRiesgo
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
            <p class="text-xs text-slate-400 mt-1">Período <strong class="text-slate-600">${periodo}</strong> · estudiantes con calificación de asignatura menor al umbral configurado de <strong class="text-slate-600">${umbralRiesgo.toFixed(1)}</strong></p>
          </div>
          <button onclick="enviarAlertasRPT04()" class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow shadow-rose-600/10 font-title flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">${correoActivo ? 'mail' : 'notifications_active'}</span> ${correoActivo ? '[ ENVIAR ALERTAS POR CORREO ]' : '[ REGISTRAR ALERTAS ]'}
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
            <p class="mt-2 text-[10px] text-rose-700">${correoActivo
              ? 'El correo se envía al buzón institucional del estudiante y queda registrado en la bitácora (RPT-07) con el resultado del envío.'
              : `Sin SMTP configurado: las alertas se guardan en la bitácora (RPT-07) con estado "Simulada", pero no sale ningún correo. Configura SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS en el .env del backend.${estadoCorreo && estadoCorreo.configurado && estadoCorreo.error ? ` Error de conexión actual: ${estadoCorreo.error}` : ''}`}</p>
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
    // Mismos criterios que renderRPT04(): mismo período y mismo umbral. Si no,
    // la tabla mostraría una cosa y el botón registraría otra.
    const periodo = activeFilter.periodo || await getPeriodoActivo();

    const [notas, estudiantes, asignaturas, config, existentes, estadoCorreo, misMatriculas] = await Promise.all([
      apiClient.getNotas({ periodo }),
      apiClient.getEstudiantes(),
      apiClient.getAsignaturas(),
      apiClient.getConfiguracion(),
      apiClient.getNotificaciones(),
      apiClient.getEstadoCorreo(),
      obtenerMatriculasEstudiantesDeMaestro()
    ]);

    const umbralRiesgo = Number(config && config.riesgo != null ? config.riesgo : 60.0);
    const correoActivo = !!(estadoCorreo && estadoCorreo.configurado && estadoCorreo.ok);

    // Defensa en profundidad, igual que en renderRPT04().
    let matriculaPropia = null;
    if (currentUser.rol === 'estudiante') {
      const yo = estudiantes.find(e => e.correo === currentUser.usuario);
      matriculaPropia = yo ? yo.matricula : '__ninguna__';
    }

    // Clave de deduplicación: estudiante + asunto + mensaje. El mensaje incluye
    // materia, período y calificación, así que re-ejecutar sin cambios no crea
    // duplicados, pero si la nota cambia sí se registra una alerta nueva.
    const yaRegistradas = new Set(
      (existentes || []).map(n => `${n.id_estudiante}|${n.asunto}|${n.mensaje}`)
    );

    const notificaciones = [];
    let omitidas = 0;
    notas.forEach(nota => {
      if (misMatriculas && !misMatriculas.has(nota.matriculaEstudiante)) return;
      if (matriculaPropia && nota.matriculaEstudiante !== matriculaPropia) return;
      if (nota.notaFinal >= umbralRiesgo) return;

      const est = estudiantes.find(e => e.matricula === nota.matriculaEstudiante);
      const asig = asignaturas.find(a => a.id_asignatura === nota.idAsignatura);
      if (!est || !asig) return;

      const asunto = 'Alerta Académica: Riesgo Detectado';
      const mensaje = `Riesgo académico en ${asig.codigo} (${asig.nombre}), período ${periodo}: calificación ${nota.notaFinal.toFixed(1)} bajo el umbral de ${umbralRiesgo.toFixed(1)}. Consulte con su asesor.`;

      if (yaRegistradas.has(`${est.id_estudiante}|${asunto}|${mensaje}`)) {
        omitidas++;
        return;
      }

      // Sin `estado`: lo decide el backend según el resultado real del envío
      // ('Enviada' / 'Fallida' / 'Simulada').
      notificaciones.push({
        id_estudiante: est.id_estudiante,
        asunto,
        mensaje,
        fecha_envio: new Date().toISOString().split('T')[0]
      });
    });

    if (notificaciones.length === 0) {
      showToast(omitidas > 0
        ? `Sin alertas nuevas: las ${omitidas} detectadas ya están registradas.`
        : 'No hay alertas que registrar.', 'error');
      return;
    }

    const omitidasTxt = omitidas > 0 ? ` (${omitidas} ya registradas se omitirán)` : '';
    const accion = correoActivo
      ? `Se enviarán ${notificaciones.length} correo(s) a los estudiantes`
      : `Se registrarán ${notificaciones.length} alerta(s) sin envío real (SMTP no configurado)`;
    if (!confirm(`${accion} del período ${periodo}${omitidasTxt}.\n\nTodo queda en la bitácora de notificaciones (RPT-07). ¿Continuar?`)) {
      return;
    }

    // El backend devuelve el desglose real: qué salió, qué falló y qué quedó
    // simulado. No damos por enviado nada que el servidor no confirme.
    const respuesta = await apiClient.crearNotificaciones(notificaciones);
    const r = (respuesta && respuesta.resumen) || {};
    const enviadas = r.enviadas || 0;
    const fallidas = r.fallidas || 0;
    const simuladas = r.simuladas || 0;

    const partes = [];
    if (enviadas) partes.push(`${enviadas} enviada(s)`);
    if (simuladas) partes.push(`${simuladas} simulada(s)`);
    if (fallidas) partes.push(`${fallidas} fallida(s)`);
    const detalle = partes.length ? partes.join(', ') : `${notificaciones.length} registrada(s)`;

    showToast(`Alertas procesadas: ${detalle}. Detalle en RPT-07.`, fallidas > 0 ? 'error' : 'success');
  } catch (error) {
    showToast('Error al procesar alertas: ' + error.message, 'error');
  }
}

// ============================================================
// 13. RPT-07: BITÁCORA DE CORREOS
// ============================================================
// fecha_envio es una columna DATE de SQL Server: mssql la serializa a JSON como
// "2026-07-28T00:00:00.000Z". Se recorta a la fecha, sin zona horaria, para no
// mostrarle al usuario un timestamp UTC crudo (ni correr el día por la zona).
function formatearFechaNotificacion(valor) {
  if (!valor) return '—';
  const texto = String(valor);
  const soloFecha = texto.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(soloFecha)
    ? soloFecha.split('-').reverse().join('/')
    : texto;
}

// El badge de estatus era siempre verde, dijera lo que dijera el estado.
function claseEstadoNotificacion(estado) {
  const e = String(estado || '').toLowerCase();
  if (e.includes('error') || e.includes('fall')) return 'bg-rose-100 text-rose-800';
  if (e.includes('pend')) return 'bg-amber-100 text-amber-800';
  // "Simulada" = quedó registrada pero no salió correo (SMTP sin configurar).
  // No debe verse como éxito.
  if (e.includes('simul')) return 'bg-slate-200 text-slate-600';
  if (e.includes('envi') || e.includes('registr')) return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-600';
}

async function renderRPT07() {
  tituloModulo.textContent = 'RPT-07 · Bitácora de Notificaciones';
  try {
    const [notificacionesAll, estudiantes, estadoCorreo, misMatriculas] = await Promise.all([
      apiClient.getNotificaciones(),
      apiClient.getEstudiantes(),
      apiClient.getEstadoCorreo(),
      obtenerMatriculasEstudiantesDeMaestro()
    ]);
    const correoActivo = !!(estadoCorreo && estadoCorreo.configurado && estadoCorreo.ok);

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
            <td class="p-3 font-mono text-slate-500">${formatearFechaNotificacion(n.fecha_envio)}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${claseEstadoNotificacion(n.estado)} font-title">${n.estado || 'Sin estado'}</span></td>
          </tr>
        `;
      }).join('');
    }
    contenedor.innerHTML = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 class="font-title text-lg font-bold text-slate-800 pb-4 border-b border-slate-100 mb-4">Bitácora de Notificaciones</h3>
        <p class="text-xs text-slate-400 -mt-2 mb-4">${notificaciones.length} registro(s). Las alertas se generan desde RPT-04. ${correoActivo
          ? 'El estatus indica el resultado real del envío por correo.'
          : 'El SMTP del backend no está configurado, así que los registros nuevos quedan como "Simulada" y no sale ningún correo.'}</p>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th class="p-3">ID</th>
                <th class="p-3">Destinatario</th>
                <th class="p-3">Asunto</th>
                <th class="p-3">Mensaje</th>
                <th class="p-3">Fecha</th>
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

    const [asignaturas, profesores, carreras] = await Promise.all([
      apiClient.getAsignaturas(filtrosAsig),
      apiClient.getProfesores(),
      esMaestro ? Promise.resolve([]) : apiClient.getCarreras()
    ]);

    // Guardamos en el módulo para que el listener de "cambiar carrera" pueda
    // volver a pintar la tabla sin refetch.
    window._rpt11Data = { asignaturas, profesores, esMaestro };

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

    // Admin: primero elige la carrera y ahí se desglosan sus materias, en vez
    // de arrancar con el listado plano de toda la universidad. El maestro no
    // tiene este selector (ya ve solo sus propias materias).
    const selectorCarreraHTML = esMaestro ? '' : `
      <div>
        <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Carrera</label>
        <select id="rpt11-select-carrera" onchange="actualizarTablaRPT11FiltradaPorCarrera()" class="w-full sm:w-72 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
          <option value="">Selecciona una carrera...</option>
          ${carreras.map(c => `<option value="${c.id_carrera}">${c.nombre}</option>`).join('')}
        </select>
      </div>`;

    contenedor.innerHTML = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        ${contadoresHTML}
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <h3 class="font-title text-md font-bold text-slate-800">${esMaestro ? 'Asignaturas a mi cargo' : 'Listado General'}</h3>
          <div class="flex flex-wrap gap-2 w-full sm:w-auto">
            <button onclick="window.print()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition font-title">[ EXPORTAR PDF ]</button>
            <button onclick="exportarExcelAsignaturas()" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition font-title">[ EXPORTAR EXCEL ]</button>
          </div>
        </div>
        ${selectorCarreraHTML}
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

    if (esMaestro) {
      actualizarTablaRPT11(asignaturas, profesores, esMaestro);
    } else {
      actualizarTablaRPT11FiltradaPorCarrera();
    }
  } catch (error) {
    showToast('Error al cargar asignaturas: ' + error.message, 'error');
  }
}

// Para admin: repinta la tabla de RPT-11 según la carrera elegida en el
// selector. Sin carrera seleccionada se muestra un mensaje en vez del
// listado completo, para que la vista arranque desglosada por carrera y no
// como un listado plano de toda la universidad.
function actualizarTablaRPT11FiltradaPorCarrera() {
  const { asignaturas, profesores, esMaestro } = window._rpt11Data || {};
  if (!asignaturas) return;
  const select = document.getElementById('rpt11-select-carrera');
  const idCarrera = select ? select.value : '';
  if (!idCarrera) {
    const tbody = document.getElementById('tbl-rpt11');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">Selecciona una carrera para ver sus materias.</td></tr>`;
    return;
  }
  const delaCarrera = asignaturas.filter(a => String(a.id_carrera) === String(idCarrera));
  actualizarTablaRPT11(delaCarrera, profesores, esMaestro);
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
        } else if (nota.estado === 'En Curso') {
          stateColor = 'bg-amber-50/70 border-amber-200 text-amber-800';
          stateLabel = 'En Curso';
          creditosPendientes += asig.creditos;
          notaFinalHTML = `<span class="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">En Curso</span>`;
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
        // Las materias "En Curso" (EC) se muestran en el detalle pero no
        // suman puntos ni créditos al índice: todavía no tienen nota final.
        const esEnCurso = n.literal === 'EC';
        const pts = esEnCurso ? 0 : literalAPuntos(n.literal);
        const ptsCr = esEnCurso ? 0 : pts * asig.creditos;
        if (!esEnCurso) {
          totalPtsHonor += ptsCr;
          totalCreditosConNota += asig.creditos;
        }
        return `
          <tr class="border-b border-slate-100 text-xs hover:bg-slate-50 transition">
            <td class="p-3 font-mono font-bold text-slate-700">${asig.codigo}</td>
            <td class="p-3 text-slate-800 font-bold">${asig.nombre}</td>
            <td class="p-3 text-center font-bold text-slate-500 font-mono">${asig.creditos}</td>
            <td class="p-3 text-center text-slate-800 font-bold font-title">${n.literal}</td>
            <td class="p-3 text-center font-bold text-slate-500 font-mono">${esEnCurso ? '—' : pts.toFixed(1)}</td>
            <td class="p-3 text-center font-extrabold text-emerald-600 font-mono">${esEnCurso ? '—' : ptsCr.toFixed(1)}</td>
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
// 15. RPT-15 · BITÁCORA DE ACTIVIDAD (dbo.Log, solo admin)
// ============================================================
async function renderRPT15() {
  tituloModulo.textContent = 'RPT-15 · Bitácora de Actividad';
  contenedor.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400 text-sm">Cargando bitácora...</div>`;

  try {
    const [logs, mantenimientoPensum] = await Promise.all([
      apiClient.getLogs(),
      apiClient.getMantenimientoPensum().catch(() => [])
    ]);

    // Normalizamos MantenimientoPensum (bitácora específica de cambios de
    // pensum) a la misma forma que dbo.Log, para mostrar todo junto en una
    // sola tabla en vez de mantener dos reportes separados (RPT-14/RPT-15).
    const pensumComoLog = (mantenimientoPensum || []).map(r => ({
      fecha: r.fecha_cambio,
      usuario: r.usuario,
      entidad: 'Pensum',
      accion: r.tipo_cambio,
      descripcion: `${r.descripcion || ''}${r.nombre_carrera ? ` (${r.nombre_carrera})` : ''}`.trim()
    }));

    const registros = [...(logs || []), ...pensumComoLog]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const filasHTML = (registros && registros.length > 0)
      ? registros.map(r => `
          <tr class="border-b border-slate-100 text-xs hover:bg-slate-50 transition">
            <td class="p-3 font-mono text-slate-500">${new Date(r.fecha).toLocaleString()}</td>
            <td class="p-3 text-slate-500">${r.usuario || '-'}</td>
            <td class="p-3 font-mono font-bold text-slate-700">${r.entidad || r.tipo || '-'}</td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                ['CREATE', 'EXPORT', 'Agregar'].includes(r.accion) ? 'bg-emerald-100 text-emerald-800'
                : ['DELETE', 'Quitar'].includes(r.accion) ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-800'
              }">${r.accion || r.evento || '-'}</span>
            </td>
            <td class="p-3 text-slate-500">${r.descripcion || r.archivo || '-'}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">No hay actividad registrada todavía.</td></tr>`;

    contenedor.innerHTML = `
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <h3 class="font-title text-md font-bold text-slate-800 pb-4 border-b border-slate-100">Historial de actividad del sistema</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th class="p-3">Fecha</th>
                <th class="p-3">Usuario</th>
                <th class="p-3">Entidad</th>
                <th class="p-3">Acción</th>
                <th class="p-3">Descripción</th>
              </tr>
            </thead>
            <tbody>${filasHTML}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    showToast('Error al cargar la bitácora de actividad: ' + error.message, 'error');
    contenedor.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-rose-100 shadow-sm text-center text-rose-500 text-sm">No se pudo cargar la bitácora. ¿Corriste el ALTER TABLE Log?</div>`;
  }
}

