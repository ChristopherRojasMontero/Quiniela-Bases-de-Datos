// Importamos la librería jsonwebtoken para poder verificar tokens JWT.
const jwt = require('jsonwebtoken');

// Middleware "auth": se ejecuta antes que las rutas protegidas.
// Verifica que la petición traiga un token válido. Si lo trae, deja pasar al siguiente paso (next()).
// Si no, corta la ejecución y responde con un error.
const auth = (req, res, next) => {
    // Buscamos el encabezado "Authorization" en la petición. Suele venir con el formato "Bearer <token>".
    const authHeader = req.headers['authorization'];

    // Separamos el string por el espacio y tomamos la segunda parte (el token en sí).
    // El operador && evita que el código rompa si authHeader es undefined.
    const token = authHeader && authHeader.split(' ')[1];

    // Si no hay token, respondemos con 401 (no autorizado).
    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    try {
        // Verificamos que el token sea válido y no haya expirado, usando la clave secreta del .env.
        // Si es válido, jwt.verify devuelve los datos que se guardaron al firmarlo (id, nombre, tipo).
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Guardamos esos datos en req.usuario para que las siguientes funciones puedan usarlos.
        req.usuario = payload;

        // Continuamos con el siguiente middleware o con el controlador.
        next();
    } catch (err) {
        // Si el token no es válido o expiró, devolvemos 403 (prohibido).
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
};

// Middleware "soloAdmin": permite continuar solamente si el usuario es administrador.
// Se usa junto con "auth": primero auth coloca req.usuario, y después soloAdmin revisa su tipo.
const soloAdmin = (req, res, next) => {
    // Si el tipo del usuario no es 'administrador', cortamos y devolvemos error.
    if (req.usuario.tipo_usuario !== 'administrador') {
        return res.status(403).json({ error: 'Acceso restringido a administradores' });
    }
    // Si es administrador, dejamos pasar a la siguiente función.
    next();
};

// Exportamos los dos middlewares para usarlos en las rutas que necesiten protección.
module.exports = { auth, soloAdmin };
