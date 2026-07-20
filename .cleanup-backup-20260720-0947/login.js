document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('usuario').value.trim().toLowerCase();
    const contrasena = document.getElementById('contrasena').value;
    
    if (!email.endsWith('@unphu.edu.do')) {
        alert("¡Error! Debes usar una cuenta institucional @unphu.edu.do.");
        return;
    }
    if (contrasena.length < 6) {
        alert("¡Error! La contraseña debe tener al menos 6 caracteres.");
        return;
    }
    if (contrasena.includes(' ')) {
        alert("¡Error! La contraseña no puede contener espacios.");
        return;
    }

    let rol = '';
    if (email.startsWith('admin@')) rol = 'admin';
    else if (email.startsWith('profe@')) rol = 'maestro';
    else rol = 'estudiante';

    const sesion = { usuario: email, rol };
    localStorage.setItem('taskUni_sesion', JSON.stringify(sesion));
    window.location.href = 'dashboard.html';
});