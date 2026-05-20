// Importamos el pool de conexiones para hacer consultas a la base de datos.
const pool = require('../db/pool');

// Función "listar": devuelve todas las quinielas con el nombre del creador
// y la cantidad de usuarios inscritos a cada una.
const listar = async (req, res) => {
    try {
        // Hacemos un JOIN con la tabla usuario para mostrar el nombre del creador.
        // Hacemos un LEFT JOIN con inscripcion porque puede haber quinielas sin inscritos todavía.
        // COUNT cuenta las inscripciones, y GROUP BY agrupa por cada quiniela para que el COUNT sea por fila.
        const result = await pool.query(
            `SELECT q.*, u.nombre_usuario AS creador,
              COUNT(i.id_inscripcion) AS total_inscritos
       FROM quiniela q
       JOIN usuario u ON u.id_usuario = q.id_creador
       LEFT JOIN inscripcion i ON i.id_quiniela = q.id_quiniela
       GROUP BY q.id_quiniela, u.nombre_usuario
       ORDER BY q.fecha_inicio_inscripcion DESC`
        );
        // Devolvemos la lista al frontend.
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al listar quinielas' });
    }
};

// Función "obtener": devuelve los datos de UNA quiniela puntual junto con sus partidos asociados.
const obtener = async (req, res) => {
    // El id de la quiniela viene en la URL como parámetro dinámico (:id).
    const { id } = req.params;
    try {
        // Primero buscamos los datos de la quiniela y de quién la creó.
        const quiniela = await pool.query(
            `SELECT q.*, u.nombre_usuario AS creador
       FROM quiniela q
       JOIN usuario u ON u.id_usuario = q.id_creador
       WHERE q.id_quiniela = $1`,
            [id]
        );
        // Si no existe ninguna quiniela con ese id, respondemos 404 (no encontrada).
        if (quiniela.rows.length === 0) {
            return res.status(404).json({ error: 'Quiniela no encontrada' });
        }

        // Después buscamos los partidos asociados a esta quiniela.
        // Pasamos por la tabla intermedia quiniela_partido para saber cuáles partidos forman parte de ella.
        const partidos = await pool.query(
            `SELECT p.*, el.nombre AS equipo_local, ev.nombre AS equipo_visitante
       FROM quiniela_partido qp
       JOIN partido p  ON p.id_partido  = qp.id_partido
       JOIN equipo el  ON el.id_equipo  = p.id_equipo_local
       JOIN equipo ev  ON ev.id_equipo  = p.id_equipo_visitante
       WHERE qp.id_quiniela = $1
       ORDER BY p.fecha_hora`,
            [id]
        );

        // Combinamos los datos de la quiniela con la lista de partidos y devolvemos todo junto.
        // El "..." (spread operator) copia las propiedades de quiniela.rows[0] en el objeto nuevo.
        res.json({ ...quiniela.rows[0], partidos: partidos.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener quiniela' });
    }
};

// Función "crear": crea una quiniela nueva y la asocia con varios partidos al mismo tiempo.
// Usamos una transacción para asegurarnos de que TODO se guarde correctamente o NADA se guarde.
const crear = async (req, res) => {
    const { nombre, descripcion, reglas, fecha_inicio_inscripcion,
        fecha_cierre_inscripcion, modalidad, tipo_puntuacion, partidos } = req.body;

    // Validamos los campos obligatorios.
    if (!nombre || !fecha_inicio_inscripcion || !fecha_cierre_inscripcion) {
        return res.status(400).json({ error: 'Nombre y fechas son obligatorios' });
    }

    // Tomamos prestado un cliente del pool para usar la misma conexión en toda la transacción.
    const client = await pool.connect();
    try {
        // BEGIN inicia la transacción.
        await client.query('BEGIN');

        // Insertamos la nueva quiniela. Usamos valores por defecto si modalidad o tipo_puntuacion no llegan.
        const result = await client.query(
            `INSERT INTO quiniela
         (nombre, descripcion, reglas, fecha_inicio_inscripcion, fecha_cierre_inscripcion, modalidad, tipo_puntuacion, id_creador)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
            [nombre, descripcion, reglas, fecha_inicio_inscripcion, fecha_cierre_inscripcion,
                modalidad || 'publica', tipo_puntuacion || 'basico', req.usuario.id_usuario]
        );

        // Tomamos el id que generó la base para la quiniela recién creada.
        const id_quiniela = result.rows[0].id_quiniela;

        // Si el frontend mandó una lista de partidos, los asociamos uno por uno a la quiniela.
        if (partidos && partidos.length > 0) {
            for (const id_partido of partidos) {
                await client.query(
                    'INSERT INTO quiniela_partido (id_quiniela, id_partido) VALUES ($1, $2)',
                    [id_quiniela, id_partido]
                );
            }
        }

        // Si todo salió bien, confirmamos los cambios con COMMIT.
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        // Si algo falló, deshacemos todo con ROLLBACK para no dejar datos inconsistentes.
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error al crear quiniela' });
    } finally {
        // Pase lo que pase, devolvemos el cliente al pool para que otras consultas puedan usarlo.
        client.release();
    }
};

// Función "inscribirse": inscribe al usuario logueado en una quiniela específica.
const inscribirse = async (req, res) => {
    const { id } = req.params;
    // El id del usuario viene del token (lo puso el middleware auth en req.usuario).
    const id_usuario = req.usuario.id_usuario;

    try {
        // Insertamos la inscripción. acepto_reglas = TRUE indica que el usuario aceptó las reglas.
        await pool.query(
            `INSERT INTO inscripcion (id_usuario, id_quiniela, acepto_reglas)
       VALUES ($1, $2, TRUE)`,
            [id_usuario, id]
        );
        res.status(201).json({ mensaje: 'Inscripción exitosa' });
    } catch (err) {
        // 23505 es el código que devuelve PostgreSQL cuando se viola una restricción de unicidad
        // (en este caso significa que el usuario ya está inscrito en esta quiniela).
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Ya estás inscrito en esta quiniela' });
        }
        // Si el error contiene la palabra "abierta", suele ser un trigger de la base que valida
        // que la inscripción esté abierta (por ejemplo, dentro del rango de fechas válido).
        if (err.message.includes('abierta')) {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al inscribirse' });
    }
};

// Función "ranking": devuelve el ranking de jugadores de una quiniela.
// Lee de una vista (v_ranking_quiniela) que ya hace el cálculo en la base de datos.
const ranking = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM v_ranking_quiniela WHERE id_quiniela = $1',
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener ranking' });
    }
};

// Exportamos las funciones para que el archivo de rutas pueda asociarlas a cada URL.
module.exports = { listar, obtener, crear, inscribirse, ranking };

