// Creamos un router para agrupar todas las rutas relacionadas con los partidos.
const router = require('express').Router();

// Importamos las funciones del controlador de partidos que se ejecutarán en cada ruta.
const { listar, crear, actualizarResultado, listarEquipos } = require('../controllers/partidoController');

// Importamos los middlewares: "auth" exige tener sesión iniciada; "soloAdmin" exige ser administrador.
const { auth, soloAdmin } = require('../middleware/auth');

// GET /api/partidos: devuelve todos los partidos. Requiere estar logueado.
router.get('/',          auth, listar);

// POST /api/partidos: crea un partido nuevo. Solo administradores pueden hacerlo.
router.post('/',         auth, soloAdmin, crear);

// PUT /api/partidos/:id/resultado: registra el resultado final de un partido específico.
// El :id es un parámetro dinámico (por ejemplo /partidos/5/resultado). Solo administradores.
router.put('/:id/resultado', auth, soloAdmin, actualizarResultado);

// GET /api/partidos/equipos: devuelve la lista de equipos disponibles para crear partidos.
router.get('/equipos',   auth, listarEquipos);

// Exportamos el router para usarlo en el archivo principal del backend.
module.exports = router;
