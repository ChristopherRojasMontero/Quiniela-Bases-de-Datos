// Importamos el pool de conexiones para poder hacer consultas a la base de datos.
const pool = require('../db/pool');

// Función "listar": devuelve todos los partidos junto con los nombres de los equipos local y visitante.
// Se ejecuta cuando se hace GET /api/partidos.
const listar = async (req, res) => {
    try {
        // Hacemos un JOIN entre la tabla partido y la tabla equipo (dos veces: una para local y otra para visitante).
        // Así obtenemos los nombres en lugar de solo los ids. Ordenamos por fecha y hora.
        const result = await pool.query(
            `SELECT p.*, el.nombre AS equipo_local, ev.nombre AS equipo_visitante
       FROM partido p
       JOIN equipo el ON el.id_equipo = p.id_equipo_local
       JOIN equipo ev ON ev.id_equipo = p.id_equipo_visitante
       ORDER BY p.fecha_hora`
        );
        // Devolvemos al frontend la lista de partidos como JSON.
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al listar partidos' });
    }
};

// Función "crear": crea un nuevo partido entre dos equipos en una fecha y hora dadas.
// Solo accesible para administradores (ver la ruta).
const crear = async (req, res) => {
    // Sacamos los datos enviados por el frontend.
    const { id_equipo_local, id_equipo_visitante, fecha_hora } = req.body;

    // Validamos que estén todos los campos.
    if (!id_equipo_local || !id_equipo_visitante || !fecha_hora) {
        return res.status(400).json({ error: 'Equipos y fecha son obligatorios' });
    }
    // Un partido no puede ser entre el mismo equipo dos veces, así que lo validamos.
    if (id_equipo_local === id_equipo_visitante) {
        return res.status(400).json({ error: 'Los equipos deben ser distintos' });
    }

    try {
        // Insertamos el partido en la base. RETURNING * nos devuelve la fila recién creada.
        const result = await pool.query(
            `INSERT INTO partido (id_equipo_local, id_equipo_visitante, fecha_hora)
       VALUES ($1, $2, $3) RETURNING *`,
            [id_equipo_local, id_equipo_visitante, fecha_hora]
        );
        // Respondemos con código 201 (Created) y los datos del partido nuevo.
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear partido' });
    }
};

// Función "actualizarResultado": guarda el resultado final de un partido (cantidad de goles).
// También marca el partido como 'finalizado'.
const actualizarResultado = async (req, res) => {
    // req.params contiene los parámetros que vienen en la URL (en este caso el id del partido).
    const { id } = req.params;
    // Sacamos los goles del cuerpo de la petición.
    const { goles_local, goles_visitante } = req.body;

    // Validamos que ambos goles hayan llegado. Importante usar undefined porque 0 es un valor válido.
    if (goles_local === undefined || goles_visitante === undefined) {
        return res.status(400).json({ error: 'Goles local y visitante requeridos' });
    }

    try {
        // Actualizamos el partido en la base: estado, goles_local y goles_visitante.
        const result = await pool.query(
            `UPDATE partido
       SET estado = 'finalizado', goles_local = $1, goles_visitante = $2
       WHERE id_partido = $3
       RETURNING *`,
            [goles_local, goles_visitante, id]
        );
        // Si no se actualizó nada, es porque no existe un partido con ese id.
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }
        // Respondemos con el partido actualizado.
        res.json({ mensaje: 'Resultado actualizado', partido: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar resultado' });
    }
};

// Función "listarEquipos": devuelve todos los equipos guardados, ordenados alfabéticamente.
// Se usa, por ejemplo, para llenar los selectores al crear un partido.
const listarEquipos = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM equipo ORDER BY nombre');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al listar equipos' });
    }
};

// Exportamos las funciones para que el archivo de rutas pueda asociarlas a cada URL.
module.exports = { listar, crear, actualizarResultado, listarEquipos };
