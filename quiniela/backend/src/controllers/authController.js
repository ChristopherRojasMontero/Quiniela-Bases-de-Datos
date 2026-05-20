// Importamos el pool de conexiones para poder hacer consultas a la base de datos.
const pool   = require('../db/pool');

// bcrypt es una librería para "hashear" contraseñas, es decir, transformarlas en una cadena indescifrable.
// Nunca guardamos contraseñas en texto plano: siempre guardamos su hash.
const bcrypt = require('bcrypt');

// jsonwebtoken (JWT) nos permite crear un token firmado que identifica al usuario después de iniciar sesión.
// Ese token se envía al frontend y luego el frontend lo manda en cada petición para demostrar quién es.
const jwt    = require('jsonwebtoken');

// Función que maneja la creación de un usuario nuevo (registro).
// Se ejecuta cuando el frontend hace una petición POST a /api/auth/registro.
const registro = async (req, res) => {
    // Sacamos los datos enviados por el frontend desde el cuerpo (body) de la petición.
    const { nombre_completo, correo_electronico, nombre_usuario, contrasena, fecha_nacimiento } = req.body;

    // Validamos que todos los campos hayan llegado. Si falta alguno, devolvemos un error 400 (Bad Request).
    if (!nombre_completo || !correo_electronico || !nombre_usuario || !contrasena || !fecha_nacimiento) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Verificamos si ya existe un usuario con el mismo correo o nombre de usuario.
        // Los $1 y $2 son "parámetros" que evitan ataques de inyección SQL.
        const existe = await pool.query(
            'SELECT id_usuario FROM usuario WHERE correo_electronico = $1 OR nombre_usuario = $2',
            [correo_electronico, nombre_usuario]
        );
        // Si la consulta devolvió al menos una fila, significa que ya hay un usuario con esos datos.
        if (existe.rows.length > 0) {
            return res.status(409).json({ error: 'El correo o nombre de usuario ya está en uso' });
        }

        // Generamos el hash de la contraseña. El número 12 es el "costo": cuanto mayor, más seguro pero más lento.
        const hash = await bcrypt.hash(contrasena, 12);

        // Insertamos el nuevo usuario en la tabla "usuario".
        // RETURNING nos devuelve las columnas creadas para no tener que hacer otra consulta después.
        const result = await pool.query(
            `INSERT INTO usuario (nombre_completo, correo_electronico, nombre_usuario, contrasena_hash, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_usuario, nombre_completo, correo_electronico, nombre_usuario, tipo_usuario`,
            [nombre_completo, correo_electronico, nombre_usuario, hash, fecha_nacimiento]
        );

        // Respondemos con código 201 (Created) y los datos del usuario recién creado.
        res.status(201).json({ mensaje: 'Usuario registrado', usuario: result.rows[0] });
    } catch (err) {
        // Si algo falla, lo mostramos en consola y respondemos con error 500 (error interno del servidor).
        console.error(err);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
};

// Función que maneja el inicio de sesión (login).
// Recibe nombre de usuario y contraseña, y si son correctos, devuelve un token JWT.
const login = async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;

    // Verificamos que ambos campos hayan llegado.
    if (!nombre_usuario || !contrasena) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    try {
        // Buscamos al usuario por su nombre de usuario, pero solo si está activo (activo = TRUE).
        const result = await pool.query(
            'SELECT * FROM usuario WHERE nombre_usuario = $1 AND activo = TRUE',
            [nombre_usuario]
        );

        // Si no encontramos ninguno, las credenciales son inválidas (no decimos por seguridad si fue usuario o contraseña).
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Tomamos el usuario encontrado.
        const usuario = result.rows[0];

        // Comparamos la contraseña que mandó el usuario con el hash guardado en la base.
        // bcrypt.compare devuelve true si coinciden.
        const valido  = await bcrypt.compare(contrasena, usuario.contrasena_hash);

        if (!valido) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generamos el token JWT con datos básicos del usuario.
        // El token está firmado con una clave secreta y expira en 8 horas.
        const token = jwt.sign(
            {
                id_usuario:     usuario.id_usuario,
                nombre_usuario: usuario.nombre_usuario,
                tipo_usuario:   usuario.tipo_usuario,
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Respondemos con el token y algunos datos del usuario (no incluimos la contraseña).
        res.json({
            token,
            usuario: {
                id_usuario:      usuario.id_usuario,
                nombre_completo: usuario.nombre_completo,
                nombre_usuario:  usuario.nombre_usuario,
                tipo_usuario:    usuario.tipo_usuario,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};

// Función que devuelve los datos del perfil del usuario logueado.
// Funciona porque el middleware "auth" ya colocó la info del usuario en req.usuario.
const perfil = async (req, res) => {
    try {
        // Buscamos en la base los datos del usuario actual usando su id (que viene del token decodificado).
        const result = await pool.query(
            `SELECT id_usuario, nombre_completo, correo_electronico, nombre_usuario, tipo_usuario, fecha_registro
       FROM usuario WHERE id_usuario = $1`,
            [req.usuario.id_usuario]
        );
        // Devolvemos la primera (y única) fila como respuesta JSON.
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
};

// Exportamos las tres funciones para que el archivo de rutas pueda usarlas.
module.exports = { registro, login, perfil };
