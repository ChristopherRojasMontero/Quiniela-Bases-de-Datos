// Importamos la clase Pool del paquete 'pg', que nos permite conectarnos a una base de datos PostgreSQL.
// Un "pool" es un conjunto de conexiones reutilizables: en lugar de abrir y cerrar una conexión cada vez
// que queremos hacer una consulta, mantenemos varias conexiones abiertas listas para usarse.
const { Pool } = require('pg');

// Cargamos las variables de entorno definidas en el archivo .env (por ejemplo, usuario y contraseña de la base de datos).
// Esto evita que datos sensibles queden escritos directamente en el código.
require('dotenv').config();

// Creamos el pool de conexiones con los datos leídos del archivo .env.
// process.env.NOMBRE_VARIABLE accede al valor de cada variable de entorno.
const pool = new Pool({
    host:     process.env.DB_HOST,     // Dirección del servidor de la base de datos (ej: localhost).
    port:     process.env.DB_PORT,     // Puerto donde escucha PostgreSQL (por defecto 5432).
    database: process.env.DB_NAME,     // Nombre de la base de datos a usar.
    user:     process.env.DB_USER,     // Usuario con el que nos conectamos.
    password: process.env.DB_PASSWORD, // Contraseña de ese usuario.
});

// Evento que se dispara cada vez que se establece una nueva conexión con la base de datos.
// Sirve para mostrar en consola que la conexión funcionó correctamente.
pool.on('connect', () => {
    console.log('Conectado a PostgreSQL');
});

// Evento que se dispara si ocurre un error con alguna conexión del pool.
// Imprimimos el mensaje del error para poder diagnosticar problemas.
pool.on('error', (err) => {
    console.error('Error en el pool de PostgreSQL:', err.message);
});

// Exportamos el pool para que otros archivos del proyecto puedan usarlo y hacer consultas a la base.
module.exports = pool;
