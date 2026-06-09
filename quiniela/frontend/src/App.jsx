import { Routes, Route, Navigate } from 'react-router-dom'
import Login     from './pages/Login'
import Registro  from './pages/Registro'
import Dashboard from './pages/Dashboard'

// Protege rutas privadas: si no hay token redirige al login.
function RutaProtegida({ children }) {
    const token = localStorage.getItem('token')
    return token ? children : <Navigate to="/login" />
}

// Define las rutas de la app y a qué componente corresponde cada URL.
function App() {
    const token = localStorage.getItem('token')

    return (
        <Routes>
            <Route path="/"          element={token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
            <Route path="/login"     element={<Login />} />
            <Route path="/registro"  element={<Registro />} />
            {/* Dashboard solo accesible con sesión iniciada. */}
            <Route path="/dashboard" element={<RutaProtegida><Dashboard /></RutaProtegida>} />
        </Routes>
    )
}

export default App