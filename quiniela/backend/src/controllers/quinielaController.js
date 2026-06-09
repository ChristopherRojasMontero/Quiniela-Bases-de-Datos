const pool = require('../db/pool');

// Devuelve todas las quinielas con el nombre del creador y cantidad de inscritos.
const listar = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT q.*, u.nombre_usuario AS creador,
              COUNT(i.id_inscripcion) AS total_inscritos
       FROM quiniela q
       JOIN usuario u ON u.id_usuario = q.id_creador
       LEFT JOIN inscripcion i ON i.id_quiniela = q.id_quiniela
       GROUP BY q.id_quiniela, u.nombre_usuario
       ORDER BY q.fecha_inicio_inscripcion DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al listar quinielas' });
    }
};

// Devuelve los datos de una quiniela junto con sus partidos asociados.
const obtener = async (req, res) => {
    const { id } = req.params;
    try {
        const quiniela = await pool.query(
            `SELECT q.*, u.nombre_usuario AS creador
       FROM quiniela q
       JOIN usuario u ON u.id_usuario = q.id_creador
       WHERE q.id_quiniela = $1`,
            [id]
        );
        if (quiniela.rows.length === 0) {
            return res.status(404).json({ error: 'Quiniela no encontrada' });
        }

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

        res.json({ ...quiniela.rows[0], partidos: partidos.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener quiniela' });
    }
};

// Crea una quiniela nueva y la asocia con partidos.
// Usa transacción para garantizar que todo se guarde o nada se guarde.
const crear = async (req, res) => {
    const { nombre, descripcion, reglas, fecha_inicio_inscripcion,
        fecha_cierre_inscripcion, modalidad, tipo_puntuacion, partidos } = req.body;

    if (!nombre || !fecha_inicio_inscripcion || !fecha_cierre_inscripcion) {
        return res.status(400).json({ error: 'Nombre y fechas son obligatorios' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO quiniela
         (nombre, descripcion, reglas, fecha_inicio_inscripcion, fecha_cierre_inscripcion, modalidad, tipo_puntuacion, id_creador)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
            [nombre, descripcion, reglas, fecha_inicio_inscripcion, fecha_cierre_inscripcion,
                modalidad || 'publica', tipo_puntuacion || 'basico', req.usuario.id_usuario]
        );

        const id_quiniela = result.rows[0].id_quiniela;

        // Si el frontend mandó una lista de partidos, los asociamos a la quiniela.
        if (partidos && partidos.length > 0) {
            for (const id_partido of partidos) {
                await client.query(
                    'INSERT INTO quiniela_partido (id_quiniela, id_partido) VALUES ($1, $2)',
                    [id_quiniela, id_partido]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error al crear quiniela' });
    } finally {
        client.release();
    }
};

// Inscribe al usuario logueado en una quiniela.
const inscribirse = async (req, res) => {
    const { id } = req.params;
    const id_usuario = req.usuario.id_usuario;

    try {
        await pool.query(
            `INSERT INTO inscripcion (id_usuario, id_quiniela, acepto_reglas)
       VALUES ($1, $2, TRUE)`,
            [id_usuario, id]
        );
        res.status(201).json({ mensaje: 'Inscripción exitosa' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Ya estás inscrito en esta quiniela' });
        }
        if (err.message.includes('abierta')) {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al inscribirse' });
    }
};

// Devuelve el ranking de jugadores de una quiniela usando la vista v_ranking_quiniela.
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

// Agrega un partido existente a una quiniela existente (solo admin).
const agregarPartido = async (req, res) => {
    const { id } = req.params;
    const { id_partido } = req.body;

    if (!id_partido) {
        return res.status(400).json({ error: 'id_partido es obligatorio' });
    }

    try {
        await pool.query(
            'INSERT INTO quiniela_partido (id_quiniela, id_partido) VALUES ($1, $2)',
            [id, id_partido]
        );
        res.status(201).json({ mensaje: 'Partido agregado a la quiniela' });
    } catch (err) {
        // 23505 = el partido ya estaba en esta quiniela.
        if (err.code === '23505') {
            return res.status(409).json({ error: 'El partido ya está en esta quiniela' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al agregar partido' });
    }
};

module.exports = { listar, obtener, crear, inscribirse, ranking, agregarPartido };