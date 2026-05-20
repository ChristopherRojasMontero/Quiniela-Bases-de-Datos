// Creamos un router para agrupar todas las rutas relacionadas con las quinielas.
const router = require('express').Router();

// Importamos las funciones del controlador de quinielas.
const { listar, obtener, crear, inscribirse, ranking } = require('../controllers/quinielaController');

// Importamos los middlewares: "auth" obliga a estar logueado; "soloAdmin" obliga a ser administrador.
const { auth, soloAdmin } = require('../middleware/auth');

// GET /api/quinielas: devuelve la lista de todas las quinielas existentes.
router.get('/',              auth, listar);

// GET /api/quinielas/:id: devuelve los datos detallados de una quiniela puntual, incluyendo sus partidos.
router.get('/:id',           auth, obtener);

// POST /api/quinielas: crea una quiniela nueva. Solo los administradores pueden hacerlo.
router.post('/',             auth, soloAdmin, crear);

// POST /api/quinielas/:id/inscribirse: el usuario logueado se inscribe a una quiniela.
router.post('/:id/inscribirse', auth, inscribirse);

// GET /api/quinielas/:id/ranking: devuelve el ranking de jugadores para esa quiniela.
router.get('/:id/ranking',   auth, ranking);

// Exportamos el router para usarlo en el archivo principal del backend.
module.exports = router;
