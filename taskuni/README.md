# taskUni (Estructura base)

Estructura de proyecto simplificada para el prototipo:

```
taskUni/
├── index.html
├── dashboard.html
├── css/
│   └── styles.css
├── js/
│   ├── login.js
│   ├── dashboard.js
│   └── modules/
│       ├── student.js
│       ├── grades.js
│       └── reports.js
├── assets/
│   ├── img/
│   └── icons/
└── README.md
```

Instrucciones rápidas:
- Abrir `index.html` para iniciar sesión (demo).
- `js/init_accounts.js` ya no existe; usa la consola para crear cuentas:

```js
localStorage.setItem('taskUni_cuentas', JSON.stringify({"admin@unphu.edu.do":{rol:'admin'}}))
```

- Los módulos en `js/modules` contienen funciones reutilizables para ENT y RPT.
