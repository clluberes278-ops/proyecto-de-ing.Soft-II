// Función para guardar estudiante con validación estricta
function guardarEstudiante(data) {
    // 1. Validar existencia
    let estudiantes = JSON.parse(localStorage.getItem('estudiantes') || '[]');
    if (estudiantes.find(e => e.matricula === data.matricula)) {
        alert("¡Error! Esta matrícula ya existe en el sistema.");
        return false;
    }
    
    // 2. Validar formato (Antidummies: 7 caracteres)
    if (data.matricula.length !== 7) {
        alert("¡Error! La matrícula debe tener exactamente 7 caracteres.");
        return false;
    }

    // 3. Guardar
    estudiantes.push(data);
    localStorage.setItem('estudiantes', JSON.stringify(estudiantes));
    return true;
}