// Creamos un "router" de Express. Un router agrupa varias rutas (URLs) relacionadas entre sí,
// en este caso todas las que tienen que ver con la autenticación de usuarios.
const router = require('express').Router();

// Importamos las funciones del controlador de autenticación.
// Cada función representa la lógica que se ejecuta cuando un usuario llega a una ruta específica.
const { registro, login, perfil } = require('../controllers/authController');

// Importamos el middleware "auth". Un middleware es una función que se ejecuta ANTES del controlador
// y sirve para verificar cosas como, por ejemplo, que el usuario haya iniciado sesión (tenga un token válido).
const { auth } = require('../middleware/auth');

// Ruta POST /registro: cuando el frontend hace POST a /api/auth/registro,
// se llama a la función "registro" del controlador para crear una cuenta nueva.
router.post('/registro', registro);

// Ruta POST /login: el frontend envía usuario y contraseña, y si son correctos,
// el controlador "login" devuelve un token que identifica al usuario.
router.post('/login',    login);

// Ruta GET /perfil: devuelve los datos del usuario logueado.
// Antes de ejecutar "perfil", pasa por el middleware "auth" para asegurarse de que haya un token válido.
router.get('/perfil',    auth, perfil);

// Exportamos el router para que pueda usarse desde el archivo principal del backend.
module.exports = router;
