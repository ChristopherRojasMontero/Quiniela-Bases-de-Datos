const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/auth',    require('./src/routes/auth'));
app.use('/api/partidos', require('./src/routes/partidos'));
app.use('/api/auth',      require('./src/routes/auth'));
app.use('/api/partidos',  require('./src/routes/partidos'));
app.use('/api/quinielas', require('./src/routes/quinielas'));
app.use('/api/auth',       require('./src/routes/auth'));
app.use('/api/partidos',   require('./src/routes/partidos'));
app.use('/api/quinielas',  require('./src/routes/quinielas'));
app.use('/api/pronosticos',require('./src/routes/pronosticos'));

app.use('/api/auth', require('./src/routes/auth'));

app.get('/', (req, res) => {
    res.json({ mensaje: 'API Quinielas funcionando' });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
