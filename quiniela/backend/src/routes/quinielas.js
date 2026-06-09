const router = require('express').Router();
const { listar, obtener, crear, inscribirse, ranking, agregarPartido } = require('../controllers/quinielaController');
const { auth, soloAdmin } = require('../middleware/auth');

router.get('/',                  auth, listar);
router.get('/:id',               auth, obtener);
router.post('/',                 auth, soloAdmin, crear);
router.post('/:id/inscribirse',  auth, inscribirse);
router.get('/:id/ranking',       auth, ranking);
// Nueva ruta: agrega un partido a una quiniela existente.
router.post('/:id/partidos',     auth, soloAdmin, agregarPartido);

module.exports = router;