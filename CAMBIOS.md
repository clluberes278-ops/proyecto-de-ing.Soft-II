# CAMBIOS · taskUni

Auditoria y arreglo de bugs del sistema academico taskUni (frontend + backend).
Fecha: 2026-07-26.

---

## Bugs corregidos (11)

### Frontend (`taskuni/js/`)

| ID | Archivo | Cambio |
|----|---------|--------|
| F1 | `dashboard.js` (lineas 2350, 2436) | `nota.idEstudiante` → `nota.matriculaEstudiante`. Desbloquea el Indice Promedio del panel Inicio. |
| F2 | `dashboard.js` (linea 2440) | `id_estudiante: est.matricula` → `id_estudiante: est.id_estudiante` (numerico). |
| F3 | `dashboard.js` (`renderENT06`) | Elimina opciones hardcoded `01`/`02` en el select de seccion. Ahora carga `apiClient.getSecciones()` y las filtra por periodo + asignatura con la funcion `repoblarSecciones()`. |
| F4 | `dashboard.js` (linea 222) | `totalEstudiantes = estudiantes.length` → filtra `estado === 'Activo'`. Tambien en `sumIndices`, `totalConIndice`, `estudiantesEnRojo`. |
| F6 | `dashboard.js` (`actualizarCalculoSimulado`) | Guarde config real en `window.simData.config`. El simulador RPT-13 ya no usa umbrales hardcoded 3.2/2.5. |
| F7 | `api-client.js` (lineas 559-561) | Borradas 3 keys duplicadas (`getSecciones`, `createSeccion`, `eliminarSeccion`) que estaban duplicadas en el bloque `// Secciones` mas abajo. |
| F8 | `dashboard.js` + `dashboard.js` | **NUEVO**: filtro de estudiantes en ENT-06 ahora muestra solo los matriculados en la seccion seleccionada (via `apiClient.getEstudiantesDeSeccion`). Sin seccion: todos los activos. |

### Backend (`taskuni-backend/`)

| ID | Archivo | Cambio |
|----|---------|--------|
| B1 | `routes/notas.js` (lineas 136-145) | Eliminado fallback silencioso. Si `idSeccion` falta o no es entero positivo → 400 claro. |
| B3 | `server.js` `POST /api/notificaciones` (lineas 925-936) | Resuelve matricula → id_estudiante numerico antes del INSERT. Antes mandaba `VarChar(20)` a columna `INT` → 500. |
| B4 | `routes/periodos.js` (linea 21) | `ORDER BY fecha_inicio DESC` → `CASE WHEN estado='Activo' THEN 0 ELSE 1 END, fecha_inicio DESC`. El periodo activo siempre sale primero. |
| B5 | `server.js` `POST /api/estudiantes` (lineas 265-275) | Valida `id_carrera` numerico (antes FK fallaba con 500). |

---

## Modulo eliminado: RPT-08

Por acuerdo: el modulo de "Logs Import/Export" no tenia persistencia real (tabla `Log` no existe en la BD, datos fantasma en localStorage).

**Borrado de `taskuni/js/dashboard.js`:**
- Linea 199: `case 'rpt08'` del switch.
- Lineas 2559-2635: funciones `renderRPT08()` y `simularImportacionExcel()`.
- Linea 3333: entrada del menu admin.

**NO se toco (por si se reactiva en el futuro):**
- `apiClient.getLogs()` / `registrarLog()` en `api-client.js`.
- `GET /api/logs` / `POST /api/logs` en `server.js` (siguen retornando `[]` con warning).
- Tabla `Log` no se creo en BD.

---

## Limpieza de emojis

Todos los emojis quitados de archivos `.js` (code fuente):

| Archivo | Emoji eliminados |
|---------|------------------|
| `taskuni-backend/server.js` | 26 `check` en log de endpoints + `X`, `!`, `database`, `desktop`, `rocket`, `pin` |
| `taskuni-backend/seed-admin.js` | `check` → `[OK]` |
| `taskuni-backend/routes/periodos.js` | 2 `check` en comentarios |
| `taskuni-backend/routes/configuracion.js` | 1 `check` en comentario |
| `taskuni/js/dashboard.js` | emojis de semaforo (`verde`, `amarillo`, `rojo`, `blanco`) → letras `V`, `A`, `R`, `O` |
| `taskuni/js/dashboard-2.js` | mismos emojis (legacy, no se carga) |
| `taskuni/js/app.js` | varios en alerts y botones (legacy, no se carga) |

**No modificado:** `README.md` (documentacion, no code).

---

## Archivos modificados (resumen)

```
taskuni-backend/server.js
taskuni-backend/routes/notas.js
taskuni-backend/routes/periodos.js
taskuni-backend/routes/configuracion.js
taskuni-backend/seed-admin.js
taskuni/js/dashboard.js
taskuni/js/api-client.js
taskuni/js/dashboard-2.js        (solo limpieza de emojis)
taskuni/js/app.js                (solo limpieza de emojis)
```

---

## Verificacion

- `node -c` en 5 archivos `.js` editados: OK (sintaxis valida).
- 0 emojis en code (`taskuni/` y `taskuni-backend/`).
- 0 referencias residuales a `rpt08` en `dashboard.js`.

---

## Como probar

```bash
cd taskuni-backend
npm run dev
# abrir taskuni/index.html en el navegador
# login: admin@unphu.edu.do / Admin123456
```

**Checklist:**
1. Panel Inicio → Indice Promedio ≈ 2.33 (no 0.00).
2. Topbar → "Periodo: 2-2026" (no 9-2026).
3. ENT-06 → seleccionar periodo 2-2026 → la seccion se carga dinamicamente; dropdown de estudiantes se acota a la seccion.
4. Carga de Notas (ENT-07) → boton ENVIAR ALERTAS → 1 notificacion para Sebastian sin 500.
5. ENT-08 cambiar umbrales → RPT-13 simulador refleja el cambio.
6. Menu admin ya no muestra RPT-08.

---

## Fuera de alcance (no se toco)

- `db.js` (pool duplicado: olor, no bug).
- `taskuni-backend/api-client.js` (archivo muerto en raiz).
- `taskuni/js/{login,core,app}.js` (legacy, no se cargan).
- BD: schema sin cambios. Asignatura basura "POP-234" y facultades casi duplicadas siguen en los datos semilla.

---

## Adenda 2026-08-04: RPT-08 reactivado, enum de Notificacion.estado normalizado

Auditoria contra el documento de diseño (diccionario de datos) encontro que la tabla `Log` ya existe en el schema (con `usuario`/`entidad`/`accion`/`descripcion` via `ALTER TABLE`), asi que la razon original para eliminar RPT-08 ya no aplica.

- **RPT-08 reactivado**: `renderRPT08()` (nuevo, en `taskuni/js/dashboard-rpt.js`, no en el `dashboard-2.js` legacy) filtra `apiClient.getLogs()` a `tipo IN ('IMPORTACIÓN','EXPORTACIÓN')`. Reconectado en `dashboard-core.js`: `case 'rpt08'`, `VISTAS_POR_ROL.admin`, y entrada de menu admin. Queda separado de RPT-15 (bitácora general de CRUD + import/export + pensum) a proposito — cada uno tiene su alcance.
- **Enum de `Notificacion.estado` normalizado**: `mailer.js` devolvia `'Enviada'` pero el `DEFAULT` de la columna en `schema.sql` es `'Enviado'` (y asi lo nombra el diccionario de datos). Cambiado `mailer.js`, `server.js` (conteo del resumen) y `test-correo.js` a `'Enviado'` para que todos coincidan. `'Fallida'`/`'Simulada'` se mantienen: son extensiones legitimas del modo simulacion SMTP, no error de tipeo — el diccionario de datos deberia documentarlas junto a `Enviado`/`Pendiente`.

### Adenda 2026-08-04 (cont.): filtro de período y export CSV en RPT-08/RPT-15

RPT-08 no respetaba el filtro de ENT-06 (a diferencia de RPT-04/RPT-05, que ya usan `activeFilter.periodo || await getPeriodoActivo()`), y ni RPT-08 ni RPT-15 tenían botón de exportar como sí tienen RPT-01/RPT-11/RPT-12.

- `renderRPT08()`: ahora filtra los logs por `periodo` resuelto igual que RPT-04/05; subtítulo muestra el período activo; nuevo botón `EXPORTAR CSV` (`exportarCSVRPT08()`) sobre la tabla ya filtrada. Se eliminó `obtenerPeriodoActivoRPT08()` (duplicaba `getPeriodoActivo()`, ya compartida con RPT-04/05).
- `renderRPT15()`: mismo filtro de período, pero las filas sin período propio (`MantenimientoPensum`, eventos CRUD genéricos) se muestran siempre — solo se filtran las filas que sí traen `periodo` (import/export). Nuevo botón `EXPORTAR CSV` (`exportarCSVRPT15()`).
- Nota aparte confirmada durante esta auditoría: `downloadCSV()` en `dashboard-core.js` (la función real que usa la app, no la de `core.js`, que es legacy/no se carga) ya registra cada exportación en el `Log` real vía `apiClient.registrarLog()` — por eso los EXPORTAR EXCEL/PDF de otros reportes ya aparecen en RPT-08/RPT-15 sin cambios adicionales.

### Adenda 2026-08-04 (cont. 2): quitados los botones "SIMULAR IMPORTACIÓN/EXPORTACIÓN" de RPT-08

Eran puro atrezzo heredado del `dashboard-2.js` legacy: pedían un nombre de archivo por `prompt()` y generaban un número aleatorio de "registros" con `Math.random()`, sin procesar ningún archivo real. No tenían sentido porque taskUni no tiene ninguna función real de importación (no existe endpoint que suba un Excel/CSV). Se eliminaron `simularImportacionExcel()` y `simularExportacion()` de `dashboard-rpt.js`. RPT-08 queda solo como tabla de auditoría real (alimentada por las exportaciones reales de otros reportes vía `downloadCSV()`) + su botón `EXPORTAR CSV`.

### Adenda 2026-08-04 (cont. 3): implementados de verdad `exportarExcelAsignaturas()` y `exportarExcelPensum()`

Eran stubs que solo mostraban `showToast('...pendiente de implementación.', 'error')` — RPT-11 y RPT-12 nunca alimentaban RPT-08 aunque tuvieran botón "EXPORTAR EXCEL".

- `exportarExcelAsignaturas()` (RPT-11): exporta lo que está pintado en `#tbl-rpt11` (ya filtrado por carrera para admin, o acotado a sus materias para maestro) vía `downloadCSV()`.
- `exportarExcelPensum()` (RPT-12): `cargarPensumEstudiante()` ahora guarda `window._rpt12Data` (estudiante, carrera, filas del pensum con estado/nota, créditos aprobados/requeridos, % avance) mientras arma el HTML; el export usa esos mismos datos vía `downloadCSV()`.
- Ambos quedan registrados como `EXPORTACIÓN`/`EXPORTACION_COMPLETADA` en `dbo.Log` igual que el boletín (RPT-01) y el acta (ENT-07), así que ahora sí alimentan RPT-08 de forma realista.

### Adenda 2026-08-04 (cont. 4): `ConfiguracionUmbral` ahora sí se guarda/filtra por `id_periodo`

La columna `id_periodo` existía en el schema y en el diagrama ER desde siempre, pero `routes/configuracion.js` la ignoraba por completo: el `GET` devolvía la primera fila de la tabla sin `WHERE`, y el `PUT` hacía `IF EXISTS (SELECT 1 FROM ConfiguracionUmbral) UPDATE ELSE INSERT` sin tocar `id_periodo` — solo podía existir una fila "global" para toda la universidad, sin importar el período. Confirmado con un dump real de la BD: `ConfiguracionUmbral` tenía 0 filas.

- `routes/configuracion.js` `GET /`: acepta `?periodo=X`; busca primero la fila de ese período (`JOIN Periodo`), si no existe cae a la fila global (`id_periodo IS NULL`), y si tampoco existe usa el fallback hardcodeado de siempre.
- `routes/configuracion.js` `PUT /`: acepta `periodo` en el body; resuelve su `id_periodo` contra la tabla `Periodo` y hace el upsert (`EXISTS`/`UPDATE`/`INSERT`) acotado a ese `id_periodo` (o a `NULL` si no se manda período, para no romper compatibilidad).
- `api-client.js`: `getConfiguracion(periodo)` ahora acepta el período como query param.
- Todos los llamadores en vivo (`dashboard-core.js` renderInicio, `dashboard-rpt.js` RPT-04/05/13, `dashboard-ent.js` ENT-08) ahora resuelven `activeFilter.periodo || await getPeriodoActivo()` y se lo pasan a `getConfiguracion()`/`updateConfiguracion()`. ENT-08 además muestra en el subtítulo para qué período se está configurando.

### Adenda 2026-08-04 (cont. 5): RPT-08 (import/export) eliminado; RPT-15 (Bitácora de Actividad) pasa a ocupar el número RPT-08

El usuario, tras probarlo exportando datos reales, concluyó que RPT-08 (Reporte de Importación/Exportación) no aportaba nada que no estuviera ya cubierto por RPT-15 — su alcance (solo filas `tipo IN ('IMPORTACIÓN','EXPORTACIÓN')`) es un subconjunto estricto de lo que ya muestra RPT-15 (todo `dbo.Log` + `MantenimientoPensum`).

- Eliminados de `dashboard-rpt.js`: `renderRPT08()` (versión import/export), `exportarCSVRPT08()` (versión import/export). Ninguna otra vista dependía de ellos.
- `renderRPT15()` → renombrado a `renderRPT08()` (mismo cuerpo, mismo filtro por período, misma tabla combinada Log+MantenimientoPensum). `window._rpt15Data` → `window._rpt08Data`. `exportarCSVRPT15()` → `exportarCSVRPT08()`. Título de la vista: "RPT-08 · Bitácora de Actividad".
- `dashboard-core.js`: `case 'rpt15'` eliminado del switch (ya no existe esa vista); `case 'rpt08'` ahora llama a la bitácora general. `VISTAS_POR_ROL.admin` y el ítem del menú lateral actualizados a un solo `rpt08` (antes eran dos entradas separadas, `rpt08` e `rpt15`).
- `dashboard-2.js` (legacy, no se carga) conserva su propio `renderRPT08()` viejo — no se tocó, es código muerto.