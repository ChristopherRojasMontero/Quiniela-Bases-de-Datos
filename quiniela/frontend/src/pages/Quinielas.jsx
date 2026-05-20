// useState guarda valores que pueden cambiar (estado).
// useEffect ejecuta código en momentos específicos del ciclo de vida del componente (por ejemplo, al montarse).
import { useState, useEffect } from 'react'

// Instancia de axios ya configurada con la URL base y el token de autenticación.
import api from '../services/api'

// Componente que muestra la lista de quinielas disponibles y permite inscribirse a ellas.
function Quinielas() {
    // Estado "quinielas": lista de quinielas que recibimos del backend. Empieza vacío.
    const [quinielas, setQuinielas] = useState([])

    // Estado "error": mensaje de error si algo falla al cargar.
    const [error, setError]         = useState('')

    // Leemos los datos del usuario logueado desde localStorage. JSON.parse convierte el texto en objeto.
    const usuario = JSON.parse(localStorage.getItem('usuario'))

    // useEffect con [] como segundo argumento se ejecuta una sola vez, cuando el componente aparece en pantalla.
    // Lo usamos para cargar las quinielas apenas se muestra la página.
    useEffect(() => {
        cargarQuinielas()
    }, [])

    // Función que pide al backend la lista de quinielas y la guarda en el estado.
    const cargarQuinielas = async () => {
        try {
            const res = await api.get('/quinielas')
            setQuinielas(res.data)
        } catch (err) {
            setError('Error al cargar quinielas')
        }
    }

    // Función que inscribe al usuario en una quiniela específica.
    const inscribirse = async (id_quiniela) => {
        try {
            // Hacemos POST al endpoint de inscripción.
            await api.post(`/quinielas/${id_quiniela}/inscribirse`)
            // alert muestra una ventanita emergente del navegador.
            alert('Inscripción exitosa')
            // Recargamos la lista para que se actualice el contador de inscritos.
            cargarQuinielas()
        } catch (err) {
            alert(err.response?.data?.error || 'Error al inscribirse')
        }
    }

    return (
        <div style={styles.container}>
            <h3 style={styles.titulo}>Quinielas disponibles</h3>
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.grid}>
                {/* map recorre la lista de quinielas y devuelve una tarjeta (div) por cada una.
                    "key" es un identificador único que necesita React para optimizar el renderizado. */}
                {quinielas.map(q => (
                    <div key={q.id_quiniela} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h4>{q.nombre}</h4>
                            {/* El color del badge cambia según el estado de la quiniela. */}
                            <span style={{
                                ...styles.badge,
                                background: q.estado === 'abierta' ? '#27ae60' : q.estado === 'cerrada' ? '#e67e22' : '#7f8c8d'
                            }}>
                {q.estado}
              </span>
                        </div>
                        <p style={styles.desc}>{q.descripcion}</p>
                        <div style={styles.info}>
                            <span>👥 {q.total_inscritos} inscritos</span>
                            <span>📋 {q.modalidad}</span>
                            <span>🏆 {q.tipo_puntuacion}</span>
                        </div>
                        <p style={styles.reglas}><strong>Reglas:</strong> {q.reglas}</p>
                        {/* Solo mostramos el botón "Inscribirse" si:
                            - el usuario es un jugador (no administrador)
                            - y la quiniela está abierta. */}
                        {usuario.tipo_usuario === 'jugador' && q.estado === 'abierta' && (
                            <button style={styles.btn} onClick={() => inscribirse(q.id_quiniela)}>
                                Inscribirse
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

// Objeto con los estilos en línea que usamos en el componente.
const styles = {
    container:  { padding: '1.5rem' },
    titulo:     { marginBottom: '1rem', fontSize: '1.3rem' },
    error:      { color: 'red' },
    grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' },
    card:       { background: '#fff', borderRadius: '8px', padding: '1.2rem', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
    badge:      { color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' },
    desc:       { color: '#666', fontSize: '0.9rem', marginBottom: '0.8rem' },
    info:       { display: 'flex', gap: '1rem', fontSize: '0.85rem', marginBottom: '0.8rem', flexWrap: 'wrap' },
    reglas:     { fontSize: '0.85rem', color: '#555', marginBottom: '1rem' },
    btn:        { width: '100%', padding: '0.6rem', background: '#2980b9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' },
}

// Exportamos el componente para que pueda usarse en otras partes de la app.
export default Quinielas
