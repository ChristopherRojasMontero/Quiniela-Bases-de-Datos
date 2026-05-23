// Importamos los componentes de react-router-dom que definen las rutas de la app:
// Routes agrupa todas las rutas; Route define una ruta individual; Navigate redirige a otra URL.
import { Routes, Route, Navigate } from 'react-router-dom'

// Importamos las páginas principales de nuestra app.
import Login from './pages/Login'
import Registro from './pages/Registro'
import Dashboard from './pages/Dashboard'

// Componente principal de la app. Se encarga de mostrar qué página corresponde según la URL.
function App() {
  // Leemos el token guardado en localStorage del navegador. Si existe, el usuario ya inició sesión.
  // localStorage es un "almacén" del navegador que persiste los datos incluso si se cierra la pestaña.
  const token = localStorage.getItem('token')

  return (
      // Routes contiene todas las rutas posibles. React mostrará la que coincida con la URL actual.
      <Routes>
        {/* Ruta raíz "/": si hay token, vamos al dashboard; si no, al login. */}
        <Route path="/"        element={token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

        {/* Ruta del login: muestra la pantalla de inicio de sesión. */}
        <Route path="/login"   element={<Login />} />

        {/* Ruta del registro: muestra el formulario para crear una cuenta nueva. */}
        <Route path="/registro" element={<Registro />} />

        {/* Ruta del dashboard: solo accesible si hay token. Si no, redirige al login. */}
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
      </Routes>
  )
}

// Exportamos App para que main.jsx pueda usarlo.
export default App
