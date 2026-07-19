// ============================================================================
// app.js MODIFICADO - Conectar con Backend API
// Reemplaza el código anterior de app.js con esto
// ============================================================================

// ============================================================================
// RENDERIZAR VISTAS
// ============================================================================

function renderView(view) {
    const container = document.getElementById('app-container');
    const title = document.getElementById('view-title');

    if (view === 'form') {
        // Vista: Registrar Estudiante
        title.innerText = "Registrar Estudiante";
        container.innerHTML = `
            <form id="form-est" class="space-y-4 max-w-md">
                <div>
                    <label class="block text-sm font-semibold mb-1">Matrícula (7 caracteres)</label>
                    <input type="text" id="matricula" maxlength="7" required 
                           class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Nombre Completo</label>
                    <input type="text" id="nombre" required 
                           class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Correo (opcional)</label>
                    <input type="email" id="correo" 
                           class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Carrera</label>
                    <select id="id_carrera" required 
                            class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                        <option value="">Selecciona una carrera...</option>
                    </select>
                </div>
                <button type="submit" class="w-full bg-emerald-600 text-white p-3 rounded-lg font-bold hover:bg-emerald-700">
                    Guardar Registro
                </button>
            </form>
        `;

        // Cargar carreras en el dropdown
        cargarCarrerasEnForm();

        // Agregar listener
        document.getElementById('form-est').addEventListener('submit', guardarEstudiante);

    } else if (view === 'list') {
        // Vista: Listado de Estudiantes
        title.innerText = "Listado de Estudiantes";
        container.innerHTML = `
            <div class="mb-4">
                <button onclick="renderView('form')" 
                        class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
                    ➕ Nuevo Estudiante
                </button>
            </div>
            <div id="tabla-container" class="bg-white rounded-lg shadow">
                <p class="p-4 text-center text-slate-500">Cargando...</p>
            </div>
        `;

        // Cargar estudiantes de la BD
        cargarEstudiantesEnTabla();
    }
}

// ============================================================================
// FUNCIONES PARA CARRERAS
// ============================================================================

async function cargarCarrerasEnForm() {
    try {
        const carreras = await apiClient.getCarreras();
        const select = document.getElementById('id_carrera');

        // Limpiar opciones previas
        select.innerHTML = '<option value="">Selecciona una carrera...</option>';

        // Agregar opciones
        carreras.forEach(carrera => {
            const option = document.createElement('option');
            option.value = carrera.id_carrera;
            option.textContent = carrera.nombre_carrera;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando carreras:', error);
        alert('⚠️ Error al cargar las carreras: ' + error.message);
    }
}

// ============================================================================
// FUNCIONES PARA ESTUDIANTES
// ============================================================================

async function guardarEstudiante(e) {
    e.preventDefault();

    const matricula = document.getElementById('matricula').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim() || null;
    const id_carrera = parseInt(document.getElementById('id_carrera').value);

    // Validaciones
    if (!matricula || !nombre || !id_carrera) {
        alert('⚠️ Por favor completa todos los campos requeridos');
        return;
    }

    try {
        // Mostrar loading
        const btn = e.target.querySelector('button[type="submit"]');
        const textOriginal = btn.textContent;
        btn.textContent = '⏳ Guardando...';
        btn.disabled = true;

        // Llamar a la API
        const result = await apiClient.crearEstudiante({
            matricula,
            nombre,
            correo,
            id_carrera,
            estado: 1
        });

        // Mostrar éxito
        alert('✅ ¡Estudiante guardado exitosamente!');

        // Limpiar form
        e.target.reset();

        // Cambiar a vista de lista
        renderView('list');

    } catch (error) {
        console.error('Error guardando estudiante:', error);
        alert('❌ Error: ' + error.message);

    } finally {
        // Restaurar botón
        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) {
            btn.textContent = '💾 Guardar Registro';
            btn.disabled = false;
        }
    }
}



async function cargarEstudiantesEnTabla() {
    try {
        const estudiantes = await apiClient.getEstudiantes();
        const container = document.getElementById('tabla-container');

        if (estudiantes.length === 0) {
            container.innerHTML = `
                <p class="p-4 text-center text-slate-500 italic">
                    No hay estudiantes registrados
                </p>
            `;
            return;
        }

        // Crear tabla
        container.innerHTML = `
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b bg-slate-100">
                        <th class="p-3">Matrícula</th>
                        <th class="p-3">Nombre</th>
                        <th class="p-3">Correo</th>
                        <th class="p-3">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${estudiantes.map(est => `
                        <tr class="border-b hover:bg-slate-50">
                            <td class="p-3 font-mono">${est.matricula}</td>
                            <td class="p-3">${est.nombre}</td>
                            <td class="p-3 text-sm">${est.correo || '-'}</td>
                            <td class="p-3">
                                <button onclick="editarEstudiante(${est.id_estudiante})" 
                                        class="text-blue-600 hover:underline mr-2">✏️ Editar</button>
                                <button onclick="confirmarEliminar(${est.id_estudiante}, '${est.nombre}')" 
                                        class="text-red-600 hover:underline">🗑️ Eliminar</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error cargando estudiantes:', error);
        const container = document.getElementById('tabla-container');
        container.innerHTML = `
            <p class="p-4 text-center text-red-600">
                ❌ Error al cargar estudiantes: ${error.message}
            </p>
        `;
    }
}

async function editarEstudiante(id) {
    try {
        const estudiante = await apiClient.getEstudiante(id);
        const nombre = prompt('Nuevo nombre:', estudiante.nombre);

        if (nombre !== null && nombre.trim()) {
            await apiClient.actualizarEstudiante(id, {
                nombre: nombre.trim(),
                correo: estudiante.correo,
                estado: estudiante.estado
            });

            alert('✅ Estudiante actualizado');
            cargarEstudiantesEnTabla();
        }
    } catch (error) {
        console.error('Error editando:', error);
        alert('❌ Error: ' + error.message);
    }
}

async function confirmarEliminar(id, nombre) {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${nombre}?`)) {
        try {
            await apiClient.eliminarEstudiante(id);
            alert('✅ Estudiante eliminado');
            cargarEstudiantesEnTabla();
        } catch (error) {
            console.error('Error eliminando:', error);
            alert('❌ Error: ' + error.message);
        }
    }
}

// ============================================================================
// CARGAR INICIAL
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar conexión con el servidor
    try {
        const health = await apiClient.health();
        console.log('✅ Servidor conectado:', health);
    } catch (error) {
        console.error('❌ No hay conexión con el servidor:', error);
        alert('⚠️ No se puede conectar con el servidor. Verifica que esté corriendo: npm run dev');
    }

    // Renderizar vista inicial
    renderView('list');
});