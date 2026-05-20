// Importamos el pool de conexiones para hacer consultas a la base de datos.
const pool = require('../db/pool');

// Función "registrar": guarda el pronóstico (goles predichos) que hace un usuario sobre un partido.
const registrar = async (req, res) => {
    // Sacamos los datos del cuerpo de la petición.
    const { id_partido, id_quiniela, goles_local_predicho, goles_visitante_predicho } = req.body;

    // El id del usuario viene del token (puesto por el middleware auth).
    const id_usuario = req.usuario.id_usuario;

    // Validamos que todos los datos estén presentes. Usamos undefined porque 0 es un valor válido para goles.
    if (id_partido === undefined || id_quiniela === undefined ||
        goles_local_predicho === undefined || goles_visitante_predicho === undefined) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Insertamos el pronóstico en la base.
        const result = await pool.query(
            `INSERT INTO pronostico (id_usuario, id_partido, id_quiniela, goles_local_predicho, goles_visitante_predicho)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [id_usuario, id_partido, id_quiniela, goles_local_predicho, goles_visitante_predicho]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        // 23505 = violación de unicidad: el usuario ya cargó un pronóstico para ese partido en esa quiniela.
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Ya registraste un pronóstico para este partido en esta quiniela' });
        }
        // Si el mensaje contiene "inició" o "finalizó", suele ser un trigger que impide pronosticar
        // partidos que ya empezaron o terminaron.
        if (err.message.includes('inició') || err.message.includes('finalizó')) {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al registrar pronóstico' });
    }
};

// Función "misPronosticos": devuelve el historial de pronósticos del usuario logueado.
// Si llega el parámetro ?id_quiniela=X en la URL, filtra solo los de esa quiniela.
const misPronosticos = async (req, res) => {
    const id_usuario  = req.usuario.id_usuario;
    // req.query contiene los parámetros que vienen después del "?" en la URL.
    const id_quiniela = req.query.id_quiniela;

    try {
        let query, params;

        // Si el usuario pidió filtrar por una quiniela específica, armamos esa consulta.
        if (id_quiniela) {
            query = `SELECT * FROM v_historial_pronosticos
               WHERE nombre_usuario = (SELECT nombre_usuario FROM usuario WHERE id_usuario = $1)
               AND quiniela = (SELECT nombre FROM quiniela WHERE id_quiniela = $2)`;
            params = [id_usuario, id_quiniela];
        } else {
            // Si no, devolvemos TODO el historial del usuario.
            query = `SELECT * FROM v_historial_pronosticos
               WHERE nombre_usuario = (SELECT nombre_usuario FROM usuario WHERE id_usuario = $1)`;
            params = [id_usuario];
        }

        // Ejecutamos la consulta elegida.
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener pronósticos' });
    }
};

// Exportamos las funciones para que el archivo de rutas pueda usarlas.
module.exports = { registrar, misPronosticos };
