// Creamos un router para agrupar las rutas relacionadas con los pronósticos.
const router = require('express').Router();

// Importamos las funciones del controlador de pronósticos.
const { registrar, misPronosticos } = require('../controllers/pronosticoController');

// Importamos el middleware "auth" para proteger todas las rutas (solo usuarios logueados).
const { auth } = require('../middleware/auth');

// POST /api/pronosticos: el usuario envía su pronóstico (cuántos goles cree que harán cada equipo) para un partido.
router.post('/',                auth, registrar);

// GET /api/pronosticos/mis-pronosticos: devuelve el historial de pronósticos del usuario logueado.
router.get('/mis-pronosticos',  auth, misPronosticos);

// Exportamos el router para usarlo en el archivo principal del backend.
module.exports = router;
