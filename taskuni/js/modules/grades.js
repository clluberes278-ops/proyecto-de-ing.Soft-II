// Función para procesar notas con validación de rango (0-100)
function procesarNotas(notaData) {
    // Validar que cada nota esté entre 0 y 100
    const notas = [notaData.ac1, notaData.ac2, notaData.ac3, notaData.final];
    if (notas.some(n => n < 0 || n > 100)) {
        alert("¡Error! Las notas deben estar en un rango de 0 a 100.");
        return false;
    }

    // Calcular nota final automáticamente (regla del sistema)[cite: 1]
    const notaFinal = (parseInt(notaData.ac1) + parseInt(notaData.ac2) + parseInt(notaData.ac3) + parseInt(notaData.final)) / 4;
    
    // Guardar en el acta
    let acta = JSON.parse(localStorage.getItem('actas') || '[]');
    acta.push({ ...notaData, notaFinal });
    localStorage.setItem('actas', JSON.stringify(acta));
    
    return true;
}