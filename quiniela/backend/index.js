const express = require('express');
const cors    = require('cors');

// Carga las variables de entorno del archivo .env (DB_HOST, DB_USER, JWT_SECRET, etc.)
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// Permite que el frontend (localhost:5173) se comunique con el backend (localhost:3000)
app.use(cors());

// Permite que Express entienda el cuerpo de las peticiones en formato JSON
app.use(express.json());

// Rutas de la API agrupadas por recurso
app.use('/api/auth',        require('./src/routes/auth'));
app.use('/api/partidos',    require('./src/routes/partidos'));
app.use('/api/quinielas',   require('./src/routes/quinielas'));
app.use('/api/pronosticos', require('./src/routes/pronosticos'));

// Ruta raíz para verificar que el servidor está funcionando
app.get('/', (req, res) => {
    res.json({ mensaje: 'API Quinielas funcionando' });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});