// Importamos StrictMode: es un envoltorio que activa avisos extra durante el desarrollo
// para ayudarnos a detectar problemas en el código de React.
import { StrictMode } from 'react'

// createRoot es la función moderna de React para "montar" nuestra aplicación dentro del HTML.
import { createRoot } from 'react-dom/client'

// BrowserRouter habilita el sistema de rutas (URLs) dentro de nuestra app de React.
// Gracias a él podemos tener URLs como /login, /dashboard, etc., sin recargar la página.
import { BrowserRouter } from 'react-router-dom'

// Importamos los estilos CSS globales de la app.
import './index.css'

// Importamos el componente principal de la app, que adentro contiene las rutas y todo lo demás.
import App from './App.jsx'

// Buscamos el elemento HTML con id="root" (definido en index.html) y le decimos a React
// que dibuje toda la aplicación dentro de él.
createRoot(document.getElementById('root')).render(
    // Activamos StrictMode para tener avisos de desarrollo.
    <StrictMode>
        {/* Envolvemos toda la app con BrowserRouter para que funcionen las rutas. */}
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
)
