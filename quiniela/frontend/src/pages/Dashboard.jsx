// useState para guardar valores que pueden cambiar (en este caso, qué sección está activa).
import { useState } from 'react'

// useNavigate nos deja cambiar la URL (por ejemplo, para redirigir al login al cerrar sesión).
import { useNavigate } from 'react-router-dom'

// Importamos las distintas secciones que se pueden mostrar dentro del dashboard.
import Quinielas from './Quinielas'
import Partidos from './Partidos'
import Pronosticos from './Pronosticos'
import Ranking from './Ranking'

// Componente principal después del login. Tiene la barra superior, el menú y muestra la sección elegida.
function Dashboard() {
    // Hook para cambiar de página cuando hace falta.
    const navigate  = useNavigate()

    // Leemos los datos del usuario logueado desde localStorage.
    const usuario   = JSON.parse(localStorage.getItem('usuario'))

    // Estado "seccion": indica qué subpágina mostrar. Empieza en 'quinielas'.
    const [seccion, setSeccion] = useState('quinielas')

    // Booleano que dice si el usuario es admin (controla qué botones se ven).
    const esAdmin = usuario?.tipo_usuario === 'administrador'

    // Función para cerrar sesión: borra los datos guardados y redirige al login.
    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
        navigate('/login')
    }

    return (
        <div style={styles.container}>
            {/* Encabezado superior con el nombre de la app, datos del usuario y botón de cerrar sesión. */}
            <div style={styles.header}>
                <h2>Quiniela Fútbol</h2>
                <div style={styles.userInfo}>
                    <span>Hola, <strong>{usuario?.nombre_completo}</strong> ({usuario?.tipo_usuario})</span>
                    <button style={styles.logout} onClick={handleLogout}>Cerrar sesión</button>
                </div>
            </div>

            {/* Menú de navegación con botones para cambiar de sección. */}
            <div style={styles.nav}>
                <button style={seccion === 'quinielas'   ? styles.navActivo : styles.navBtn} onClick={() => setSeccion('quinielas')}>Quinielas</button>
                <button style={seccion === 'partidos'    ? styles.navActivo : styles.navBtn} onClick={() => setSeccion('partidos')}>Partidos</button>
                {/* La opción "Pronósticos" solo aparece si NO es admin (los admins no juegan). */}
                {!esAdmin && (
                    <button style={seccion === 'pronosticos' ? styles.navActivo : styles.navBtn} onClick={() => setSeccion('pronosticos')}>Pronósticos</button>
                )}
                <button style={seccion === 'ranking' ? styles.navActivo : styles.navBtn} onClick={() => setSeccion('ranking')}>Ranking</button>
            </div>

            {/* Mostramos el componente correspondiente a la sección activa. Solo uno aparece a la vez. */}
            {seccion === 'quinielas'   && <Quinielas />}
            {seccion === 'partidos'    && <Partidos />}
            {seccion === 'pronosticos' && <Pronosticos />}
            {seccion === 'ranking'     && <Ranking />}
        </div>
    )
}

// Estilos en línea utilizados en el componente.
const styles = {
    container: { minHeight: '100vh' },
    header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2c3e50', color: '#fff', padding: '1rem 2rem' },
    userInfo:  { display: 'flex', alignItems: 'center', gap: '1rem' },
    logout:    { padding: '0.4rem 1rem', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    nav:       { display: 'flex', gap: '0', background: '#34495e' },
    navBtn:    { padding: '0.8rem 1.5rem', background: 'transparent', color: '#bdc3c7', border: 'none', cursor: 'pointer', fontSize: '0.95rem' },
    navActivo: { padding: '0.8rem 1.5rem', background: '#2c3e50', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.95rem', borderBottom: '3px solid #27ae60' },
}

// Exportamos el componente para usarlo en otras partes de la app.
export default Dashboard
