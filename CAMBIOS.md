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
