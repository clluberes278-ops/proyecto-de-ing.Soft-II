# taskUni — Plataforma de Control e Indicadores Académicos

Prototipo de validación académica para la **Universidad Nacional Pedro Henríquez Ureña (UNPHU)**. Sistema de gestión de estudiantes, asignaturas, secciones, calificaciones, notificaciones e indicadores de riesgo.

> Repositorio: https://github.com/clluberes278-ops/proyecto-de-ing.Soft-II.git
> Autor: Kal (Carlos Lluberes) · Licencia: MIT

---

## 📊 Diagramas

Visualizaciones de la arquitectura, flujos y datos del proyecto:

| Diagrama | Descripción |
|----------|-------------|
| [Arquitectura general](diagram-arquitectura.html) | Topología cliente ↔ backend ↔ SQL Server |
| [Flujo de autenticación](diagram-login.html) | Paso a paso del login y validación |
| [Modelo de datos](diagram-modelo-datos.html) | 12 tablas con sus PK/FK y relaciones |

> Cada diagrama es un archivo HTML standalone que se abre directamente en el navegador.

---

## 🏗️ Arquitectura

El proyecto está dividido en dos componentes principales:

| Carpeta | Tipo | Stack | Puerto |
|---------|------|-------|--------|
| `taskuni/` | Frontend (cliente) | HTML + TailwindCSS + JS vanilla | `5500` (Live Server) |
| `taskuni-backend/` | Backend (API REST) | Node.js + Express + SQL Server | `3000` |

```
ing.Soft II/
├── taskuni/                      # Frontend
│   ├── index.html                # Pantalla de login
│   ├── dashboard.html            # Panel principal con sidebar
│   ├── css/
│   │   └── styles.css            # Estilos + dark mode + responsive
│   └── js/
│       ├── api-client.js         # Cliente HTTP (Fetch API)
│       ├── app.js                # Registro y listado de estudiantes
│       ├── core.js               # Lógica común (sidebar, toasts, exports)
│       ├── dashboard.js          # Lógica del panel principal (módulos ENT/RPT)
│       ├── login.js              # Lógica legacy de login
│       └── modules/
│           ├── student.js        # Utilidades de estudiantes
│           ├── grades.js         # Cálculo de notas
│           └── reports.js        # Resúmenes y reportes
│
└── taskuni-backend/              # Backend
    ├── server.js                 # Entry point + endpoints inline
    ├── Db.js                     # Pool de conexión a SQL Server
    ├── api-client.js             # Cliente ESM (referencia)
    ├── .env                      # Configuración (credenciales BD, puerto)
    └── routes/
        ├── configuracion.js      # Umbrales de riesgo
        ├── notas.js              # Calificaciones con JOINs
        └── periodos.js           # Períodos académicos
```

---

## 🚀 Stack tecnológico

### Frontend
- **HTML5** semántico
- **TailwindCSS** (vía CDN)
- **Google Fonts**: Plus Jakarta Sans (cuerpo) + Space Grotesk (títulos)
- **Material Symbols Outlined** (iconos)
- **JavaScript ES2020+** vanilla (sin frameworks)
- **LocalStorage** para sesión, dark mode y datos de respaldo

### Backend
- **Node.js** + **Express 4**
- **MSSQL** driver para SQL Server
- **bcryptjs** para hash de contraseñas
- **CORS** habilitado
- **dotenv** para variables de entorno
- **nodemon** (dev) para hot-reload

### Base de datos
- **SQL Server** (instancia local en `localhost:1433`)
- Base de datos: `UniversidadDB`
- Autenticación: SQL Server (`sa`)

---

## 📋 Modelo de datos

Tablas principales (SQL Server):

| Tabla | Propósito |
|-------|-----------|
| `Usuario` | Cuentas con `rol` (admin / maestro / estudiante) y `id_referencia` |
| `Estudiante` | Datos del estudiante con `matricula` (7 chars), `id_carrera` |
| `Profesor` | Docentes con `codigo_profesor` |
| `Carrera` | Carreras con `codigo_carrera` y `facultad` |
| `Asignatura` | Materias con `codigo_asignatura`, `creditos`, `id_pensum` |
| `Pensum` | Pensum por carrera con `creditos_requeridos` |
| `Seccion` | `numero_seccion` × `id_asignatura` × `id_profesor` × `id_periodo` |
| `Periodo` | Períodos académicos (`periodo`, `fecha_inicio`, `fecha_fin`) |
| `Nota` | Calificaciones: `acum1/2/3`, `eval_final`, `nota_final`, `nota_literal` |
| `ConfiguracionUmbral` | Umbrales de riesgo: `verde`, `amarillo`, `rojo` (auto) |
| `Notificacion` | Mensajes a estudiantes |
| `Log` | Auditoría de import/export (opcional) |

---

## 🔌 API REST

Base URL: `http://localhost:3000/api`

### Autenticación
- `POST /login` — Login con `correo` y `password` (devuelve `rol` + `idReferencia`)
- `POST /usuarios` — Crear cuenta (admin)

### Estudiantes
- `GET /estudiantes` · `GET /estudiantes/:id`
- `POST /estudiantes` · `PUT /estudiantes/:id`
- `DELETE /estudiantes/matricula/:matricula`

### Asignaturas / Carreras / Profesores
- `GET/POST /asignaturas` · `DELETE /asignaturas/:codigo`
- `GET/POST /carreras`
- `GET/POST /profesores`

### Académico
- `GET/POST /periodos`
- `GET/POST /secciones` · `DELETE /secciones/:id`
- `GET/POST /notas` (con filtros: `periodo`, `asignatura`, `seccion`, `estudiante`)

### Configuración e Indicadores
- `GET/PUT /configuracion` — Umbrales de riesgo
- `GET /pensum/:idCarrera`

### Operaciones
- `GET/POST /notificaciones` — Masivas (array)
- `GET/POST /logs` — Import/export (la tabla `Log` es opcional)

### Diagnóstico
- `GET /health` · `GET /db-status`

---

## ⚙️ Instalación y arranque

### 1. Requisitos previos
- Node.js 18+ y npm
- SQL Server 2019+ (local o remoto)
- Base de datos `UniversidadDB` creada con el esquema correspondiente

### 2. Backend
```bash
cd taskuni-backend
npm install
# Verificar/editar .env con tus credenciales de SQL Server
npm run dev     # nodemon (desarrollo)
# o
npm start       # node server.js (producción)
```

El servidor quedará escuchando en `http://localhost:3000`.

### 3. Frontend
Abrir `taskuni/index.html` directamente en el navegador, **o** servirlo con un servidor estático:

```bash
# Opción 1: Live Server (VS Code)
# Click derecho en taskuni/index.html → "Open with Live Server"

# Opción 2: Python
cd taskuni
python -m http.server 5500
# Abrir http://localhost:5500
```

### 4. Configuración de BD
Editar `taskuni-backend/.env`:
```env
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=tu_password
DB_DATABASE=UniversidadDB
PORT=3000
```

---

## 👤 Roles y autenticación

| Prefijo de correo | Rol |
|-------------------|-----|
| `admin@...` | Administrador |
| `profe@...` | Maestro / Profesor |
| *(otro)* | Estudiante |

Todos los correos deben terminar en `@unphu.edu.do`. Contraseña mínima: 6 caracteres, sin espacios.

> ⚠️ Hay dos archivos de login: `js/login.js` (legacy, solo frontend) e `index.html` (versión actual con `apiClient.login()`). El login funcional real es el de `index.html`.

---

## 🧮 Cálculo de notas

Regla de negocio: **promedio simple de 4 acumulaciones**.

```
nota_final = (acum1 + acum2 + acum3 + eval_final) / 4
```

Rango válido: `0–100`. La `nota_literal` (A/B/C/D/F) se calcula automáticamente.

Los umbrales de riesgo viven en la tabla `ConfiguracionUmbral`:
- `verde`: nota mínima para estado "sin riesgo"
- `amarillo`: nota mínima para estado "en riesgo"
- `rojo`: derivado ("Automático") → debajo de `amarillo`

---

## 📦 Exportación de datos

El frontend incluye utilidades para descargar:
- **CSV** (vía `downloadCSV()` en `core.js`)
- **JSON** (vía `downloadJSON()`)

Cada exportación registra un log en `GET /logs` con tipo, evento, período y cantidad de registros.

---

## 🌗 Características de UI

- **Dark mode** persistente (toggle en topbar, guardado en `localStorage`)
- **Sidebar responsive** (colapsable en móvil, con overlay)
- **Toasts** animados para feedback
- **Tablas responsive** con scroll horizontal
- **Modo impresión** (`@media print`) — solo se imprime el área de contenido
- **Glassmorphism** en pantalla de login
- **Sin framework JS** — todo vanilla, fácil de mantener

---

## 🛣️ Estado del proyecto

- ✅ Login con backend + bcrypt
- ✅ CRUD de estudiantes, asignaturas, carreras, profesores
- ✅ Gestión de períodos y secciones
- ✅ Registro y consulta de notas con JOINs
- ✅ Configuración de umbrales
- ✅ Notificaciones masivas
- ✅ Exportación CSV/JSON
- ✅ Logs de import/export
- ✅ Dark mode + responsive
- ⚠️ La tabla `Log` no está en el script de BD actual; los endpoints toleran su ausencia
- ⚠️ `js/login.js` y `js/modules/*.js` son código legacy con `localStorage` (no se usan en flujo real)

---

## 📝 Licencia

MIT — Carlos Lluberes (Kal)
