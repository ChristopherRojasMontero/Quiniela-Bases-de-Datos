const pool = require('../db/pool');

// Registra el pronóstico de un usuario para un partido dentro de una quiniela.
const registrar = async (req, res) => {
    const { id_partido, id_quiniela, goles_local_predicho, goles_visitante_predicho } = req.body;
    const id_usuario = req.usuario.id_usuario;

    if (id_partido === undefined || id_quiniela === undefined ||
        goles_local_predicho === undefined || goles_visitante_predicho === undefined) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Verificamos que el usuario esté inscrito en la quiniela.
        const inscrito = await pool.query(
            'SELECT 1 FROM inscripcion WHERE id_usuario = $1 AND id_quiniela = $2',
            [id_usuario, id_quiniela]
        );
        if (inscrito.rows.length === 0) {
            return res.status(403).json({ error: 'Debés estar inscrito en la quiniela para pronosticar' });
        }

        // Verificamos que el partido pertenezca a la quiniela.
        const pertenece = await pool.query(
            'SELECT 1 FROM quiniela_partido WHERE id_quiniela = $1 AND id_partido = $2',
            [id_quiniela, id_partido]
        );
        if (pertenece.rows.length === 0) {
            return res.status(400).json({ error: 'El partido no pertenece a esta quiniela' });
        }

        const result = await pool.query(
            `INSERT INTO pronostico (id_usuario, id_partido, id_quiniela, goles_local_predicho, goles_visitante_predicho)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [id_usuario, id_partido, id_quiniela, goles_local_predicho, goles_visitante_predicho]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        // 23505 = violación de unicidad: ya existe un pronóstico para ese partido en esa quiniela.
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Ya registraste un pronóstico para este partido en esta quiniela' });
        }
        // Error del trigger que bloquea pronósticos en partidos ya iniciados o finalizados.
        if (err.message.includes('inició') || err.message.includes('finalizó')) {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al registrar pronóstico' });
    }
};

// Devuelve el historial de pronósticos del usuario logueado.
// Si llega ?id_quiniela=X filtra solo los de esa quiniela.
const misPronosticos = async (req, res) => {
    const id_usuario  = req.usuario.id_usuario;
    const id_quiniela = req.query.id_quiniela;

    try {
        let query, params;

        if (id_quiniela) {
            query = `SELECT * FROM v_historial_pronosticos
               WHERE nombre_usuario = (SELECT nombre_usuario FROM usuario WHERE id_usuario = $1)
               AND quiniela = (SELECT nombre FROM quiniela WHERE id_quiniela = $2)`;
            params = [id_usuario, id_quiniela];
        } else {
            query = `SELECT * FROM v_historial_pronosticos
               WHERE nombre_usuario = (SELECT nombre_usuario FROM usuario WHERE id_usuario = $1)`;
            params = [id_usuario];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener pronósticos' });
    }
};

module.exports = { registrar, misPronosticos };