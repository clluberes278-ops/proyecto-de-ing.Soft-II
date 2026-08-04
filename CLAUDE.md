# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

taskUni — academic management prototype for Universidad Nacional Pedro Henríquez Ureña (UNPHU): students, subjects, sections, grades, notifications, and risk indicators. Two independent components, no shared build system:

- `taskuni/` — static frontend (HTML + TailwindCSS via CDN + vanilla JS, no framework, no bundler)
- `taskuni-backend/` — Node.js + Express REST API over SQL Server

## Commands

Backend (from `taskuni-backend/`):
```bash
npm install
npm run dev     # nodemon, hot-reload, http://localhost:3000
npm start       # node server.js
```

There is no test suite, linter, or build step in either component. "Verification" for backend changes is `node -c <file>` (syntax check) plus manual exercise of the endpoint; for frontend changes, open `taskuni/index.html` in a browser (or serve `taskuni/` with a static server, e.g. `python -m http.server 5500` or VS Code Live Server) against a running backend on port 3000.

Backend requires `taskuni-backend/.env` (not committed, see `.env.example`) with `DB_SERVER`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`, `PORT`, pointing at a local SQL Server instance with the `UniversidadDB` schema already created (`sql/schema.sql`). SMTP vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, optionally `SMTP_SECURE`/`SMTP_FROM`) are optional — omitting them is a supported "simulation mode," not a broken config (see mailer.js below).

## Architecture

### Backend: two coexisting connection pools

`server.js` opens its own `mssql.ConnectionPool` and defines most endpoints inline (students, subjects, professors, sections, notifications, logs, pensum, login/users, health). Separately, `db.js` exports a shared `getConnection()`/pool used only by the routers in `routes/` (`periodos.js`, `configuracion.js`, `notas.js`, `facultades.js`, `secciones-estudiantes.js`, `carreras.js`, `mail.js`, `mantenimiento-pensum.js`), mounted in `server.js` under `/api/periodos`, `/api/configuracion`, `/api/notas`, `/api/facultades`, `/api/secciones`, `/api/carreras`, `/api/mail`, `/api/mantenimiento-pensum`. This split is deliberate-but-messy history, not a pattern to extend: new endpoints belong in a `routes/*.js` router using `db.js`, not appended inline to `server.js`.

When both a route in `server.js` and a router in `routes/` could plausibly own a path, the router wins (e.g. `/api/secciones` is fully handled by `routes/secciones-estudiantes.js`, not the inline `app.get('/api/secciones', ...)` left in `server.js` — check `app.use()` mount order at the top of `server.js` before assuming an inline handler is live).

### Grade calculation (business rule, not configurable in code)

```
nota_final = (acum1 + acum2 + acum3 + eval_final) / 4
```
Valid range 0–100; `nota_literal` (A/B/C/D/F, plus `EC` — hence the column is `varchar(2)`, not a single char) is derived from it. Risk thresholds (`verde`/`amarillo`/`rojo`) live in the `ConfiguracionUmbral` table via `/api/configuracion`, **scoped per período** via `ConfiguracionUmbral.id_periodo` — `GET /api/configuracion?periodo=X` resolves that period's row (falling back to the global `id_periodo IS NULL` row, then to a hardcoded default), and `PUT` with `{ periodo, verde, amarillo }` upserts the row for that period specifically. The `rojo` column does physically exist (`varchar(15)`) but is always written as the literal string `'Automático'` rather than a numeric threshold — rojo is implicit (anything below `amarillo`), computed on read, never a stored cutoff. Any code computing GPA/risk must read live thresholds from this endpoint (passing the resolved period) rather than hardcoding cutoffs (this was bug F6 — a stale hardcoded 3.2/2.5 threshold in the RPT-13 simulator).

### Frontend: single-page dashboard driven by a render-function switch

`taskuni/dashboard.html` + three scripts is the real application, loaded in this order (each depends on globals defined by the previous one — `dashboard-core.js` must load first):
- `taskuni/js/dashboard-core.js` — global state (`currentUser`, `activeFilter`), sidebar/dark-mode/toast/CSV-export helpers, grade/index calculations (`calcularLiteralYEstado`, `calcularIndiceEstudiante`), the `renderView()` dispatcher, `renderInicio()`, and app bootstrap (`generarMenuLateral()`, the `DOMContentLoaded` session check).
- `taskuni/js/dashboard-ent.js` — all `renderENT01`…`renderENT11` data-entry/CRUD modules.
- `taskuni/js/dashboard-rpt.js` — report/read-only modules: `renderRPT01`, `renderRPT04`…`renderRPT08`, `renderRPT11`…`renderRPT13` (no RPT-02/03/09/10/14/15 — those numbers were never built or were later removed/renumbered; don't assume a gap means missing work).

Navigation doesn't route pages — `renderView()` calls one `renderXXX()` function per module, dispatched by view id (`ent01`…`ent11`, `rpt01`, `rpt04`…`rpt08`, `rpt11`…`rpt13`) in a switch in `dashboard-core.js` (search `case 'ent01'`). "ENT-xx" = data entry/CRUD modules, "RPT-xx" = report/read-only modules. When asked to touch a specific module (e.g. "ENT-06"), grep for `renderENT06` rather than assuming which file it's in — this was originally one ~4000-line `dashboard.js`, split by category (not one-file-per-module) to keep the diff/file count manageable.

All backend calls go through `taskuni/js/api-client.js` (`apiClient.*` IIFE, base URL hardcoded to `http://localhost:3000/api`). Never call `fetch()` directly from the dashboard scripts — add a method to `api-client.js` and call that, matching the existing method-per-endpoint style.

Cross-cutting UI helpers (sidebar, dark mode, toasts, `downloadCSV()`, print handling) live directly in `dashboard-core.js`, not in `taskuni/js/core.js` — `dashboard.html` never loads `core.js` (check its `<script>` tags), despite the similar name and despite `core.js` defining its own near-duplicate `downloadCSV()`/`showToast()`. `dashboard-core.js`'s `downloadCSV()` is also the one that writes a real audit row to `dbo.Log` via `apiClient.registrarLog()` (so exports show up in RPT-08/RPT-15) — `core.js`'s version only writes to `localStorage`. There is no `downloadJSON()` in the live app; the "EXPORTAR JSON" button shown in the RPT-01 design mockup isn't implemented.

### Dead/legacy code — do not build on these

- `taskuni/js/core.js`, `taskuni/js/login.js`, `taskuni/js/app.js`, `taskuni/js/dashboard-2.js`, `taskuni/js/modules/*.js` (`student.js`, `grades.js`, `reports.js`) — earlier localStorage-only prototype, not loaded by the real login/dashboard flow (`dashboard.html` only loads `api-client.js`, `dashboard-core.js`, `dashboard-ent.js`, `dashboard-rpt.js`). The real login lives inline in `taskuni/index.html`, calling `apiClient.login()`. (`dashboard-2.js` still contains an old `renderRPT08()` — dead code, not the source of the current RPT-08.)
- `taskuni-backend/api-client.js` — an unused ESM file at the backend root, not the frontend's api-client.

### Email notifications (RPT-04) — silent simulation mode

`mailer.js` sends the actual SMTP mail behind `POST /api/notificaciones`; `routes/mail.js` only exposes `GET /api/mail/estado` so the frontend can show whether a send will be real or simulated. If any of `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` is missing from `.env`, `mailer.js` does **not** throw — it silently falls into "simulation mode," logs to the console, and reports each notification's mail status as `Simulada` instead of `Enviado`/`Fallida`. `Notificacion.estado` therefore has 4 possible values in practice — `Enviado`/`Fallida`/`Simulada` (written explicitly by `POST /api/notificaciones`) plus `Pendiente` (the state before an alert is processed) — not just `Enviado`/`Pendiente`; the column is an unconstrained `varchar(15)`, so nothing enforces this at the DB level. If asked to debug "notifications aren't sending," check `smtpConfigurado()`/`verificarConexion()` in `mailer.js` before assuming a code bug — the far more common cause is an incomplete `.env`. Also note: if `SMTP_FROM` is unset and `SMTP_USER` isn't a full email address, sends fail with an opaque "Bad sender address syntax" — `mailer.js` detects this case (`remitenteInvalido()`) and surfaces a clearer error.

### Bitácora (`Log` table) and pensum change history

Despite the CAMBIOS.md-era note that `Log` "doesn't exist," it has since been added back via `dbo.Log` + an `ALTER TABLE` adding `usuario`/`entidad`/`accion`/`descripcion` columns (see `sql/schema.sql`). `log-helper.js` centralizes inserts (`registrarLog(pool, sql, {...})`, called from both `server.js`'s own pool and `routes/*.js` via `db.js`) and swallows its own errors — if the `ALTER TABLE` hasn't been run on a given DB instance, logging fails silently rather than breaking the calling endpoint. RPT-08 (`renderRPT08`, `dashboard-rpt.js`) is the one frontend report reading `Log`: the full activity bitácora (CRUD + import/export, merged with `MantenimientoPensum`). It was briefly numbered RPT-15 with a separate, narrower RPT-08 (only `tipo IN ('IMPORTACIÓN','EXPORTACIÓN')`) also reactivated alongside it — that narrower version was removed as redundant, and this bitácora took over the RPT-08 slot; don't reintroduce a second, import/export-only report at another number without a concrete reason. Separately, `MantenimientoPensum` (read-only via `routes/mantenimiento-pensum.js`, `GET /api/mantenimiento-pensum`) is an audit trail auto-populated by `server.js` whenever `Asignatura.id_pensum` changes through `POST`/`PUT /api/asignaturas` — don't add a write endpoint for it, the inserts are a side effect of the asignatura routes, not a standalone CRUD resource.

### Auth convention (not real authorization)

Role is inferred from email prefix, not a claim/token: `admin@...` → admin, `profe@...` → professor, anything else → student. All emails must end in `@unphu.edu.do`. There is no session/JWT middleware guarding routes server-side — role checks, where they exist, are frontend-only. Keep this in mind when asked to add "admin-only" functionality: the real enforcement point is currently nowhere, so flag it rather than silently trusting a frontend check.

## Prior bug-fix history

`CAMBIOS.md` documents an audit that fixed 11 bugs across frontend/backend (mismatched `id_estudiante` vs `matricula` fields, hardcoded section options, active-student filtering, duplicate keys in `api-client.js`, silent fallback masking a 400, notification insert type mismatch, period ordering, FK validation) and removed the RPT-08 module at a time when the `Log` table didn't exist. RPT-08 has since been reactivated (see the Bitácora section above) now that `Log` is back — `CAMBIOS.md`'s "removed" note reflects history, not current state. Read it before touching `dashboard.js` grade/index calculations, `POST /api/notificaciones`, `routes/periodos.js` ordering, or anything involving `matricula` vs `id_estudiante` — these are recurring sources of confusion since students are addressed by `matricula` (7-char string) in some places and numeric `id_estudiante` in others, and mixing them up is the single most common bug class in this codebase.
