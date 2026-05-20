// Hooks de React: useState para guardar estado; useEffect para ejecutar código al cargar el componente.
import { useState, useEffect } from 'react'

// Instancia de axios configurada para nuestro backend.
import api from '../services/api'

// Componente que muestra el ranking de jugadores de una quiniela elegida.
function Ranking() {
    // Lista de quinielas disponibles para elegir.
    const [quinielas, setQuinielas]         = useState([])

    // Quiniela seleccionada actualmente (su ranking es el que mostramos).
    const [quinielaActiva, setQuinielaActiva] = useState(null)

    // Datos del ranking de la quiniela seleccionada.
    const [ranking, setRanking]             = useState([])

    // Datos del usuario logueado, para resaltar su fila en la tabla.
    const usuario = JSON.parse(localStorage.getItem('usuario'))

    // Al montar el componente, cargamos las quinielas para mostrarlas como botones.
    useEffect(() => {
        cargarQuinielas()
    }, [])

    // Pide al backend la lista de quinielas.
    const cargarQuinielas = async () => {
        try {
            const res = await api.get('/quinielas')
            setQuinielas(res.data)
        } catch {}
    }

    // Cuando el usuario elige una quiniela, marcamos cuál es la activa y traemos su ranking.
    const seleccionarQuiniela = async (q) => {
        setQuinielaActiva(q)
        try {
            const res = await api.get(`/quinielas/${q.id_quiniela}/ranking`)
            setRanking(res.data)
        } catch {}
    }

    // Diccionarios para asignar colores y emojis a las primeras tres posiciones.
    const medallaColor = { 1: '#f1c40f', 2: '#95a5a6', 3: '#cd7f32' }
    const medalla      = { 1: '🥇', 2: '🥈', 3: '🥉' }

    return (
        <div style={styles.container}>
            <h3 style={styles.titulo}>Ranking</h3>

            {/* Botones para que el usuario elija una quiniela. */}
            <div style={styles.quinielaSelector}>
                {quinielas.map(q => (
                    <button
                        key={q.id_quiniela}
                        style={quinielaActiva?.id_quiniela === q.id_quiniela ? styles.qBtnActivo : styles.qBtn}
                        onClick={() => seleccionarQuiniela(q)}
                    >
                        {q.nombre}
                    </button>
                ))}
            </div>

            {/* Si ya se eligió quiniela pero el ranking está vacío, avisamos. */}
            {quinielaActiva && ranking.length === 0 && (
                <p style={styles.info}>No hay participantes en esta quiniela aún.</p>
            )}

            {/* Si hay datos en el ranking, mostramos la tabla. */}
            {ranking.length > 0 && (
                <div style={styles.tabla}>
                    <h4 style={styles.subtitulo}>{quinielaActiva.nombre}</h4>
                    <table style={styles.table}>
                        <thead>
                        <tr style={styles.thead}>
                            <th style={styles.th}>Pos.</th>
                            <th style={styles.th}>Jugador</th>
                            <th style={styles.th}>Nombre</th>
                            <th style={styles.th}>Puntos</th>
                        </tr>
                        </thead>
                        <tbody>
                        {/* Iteramos sobre el ranking y armamos una fila por jugador. */}
                        {ranking.map((r, i) => (
                            <tr
                                key={i}
                                style={{
                                    ...styles.tr,
                                    // Si la fila es del usuario logueado, la pintamos diferente para destacarla.
                                    background: r.nombre_usuario === usuario.nombre_usuario ? '#eaf4fb' : i % 2 === 0 ? '#fff' : '#f9f9f9',
                                    fontWeight: r.nombre_usuario === usuario.nombre_usuario ? 'bold' : 'normal',
                                }}
                            >
                                <td style={styles.tdPos}>
                                    {/* Si hay medalla para esa posición la mostramos; si no, el número. */}
                                    {medalla[r.posicion] || r.posicion}
                                </td>
                                <td style={styles.td}>{r.nombre_usuario}</td>
                                <td style={styles.td}>{r.nombre_completo}</td>
                                <td style={{
                                    ...styles.tdPuntos,
                                    color: medallaColor[r.posicion] || '#2c3e50'
                                }}>
                                    {r.puntaje_total}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// Estilos en línea utilizados en el componente.
const styles = {
    container:        { padding: '1.5rem' },
    titulo:           { marginBottom: '1rem', fontSize: '1.3rem' },
    subtitulo:        { marginBottom: '1rem', color: '#555' },
    quinielaSelector: { display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
    qBtn:             { padding: '0.5rem 1rem', background: '#ecf0f1', border: 'none', borderRadius: '20px', cursor: 'pointer' },
    qBtnActivo:       { padding: '0.5rem 1rem', background: '#2980b9', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer' },
    tabla:            { background: '#fff', borderRadius: '8px', padding: '1.2rem', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
    table:            { width: '100%', borderCollapse: 'collapse' },
    thead:            { background: '#2c3e50', color: '#fff' },
    th:               { padding: '0.8rem 1rem', textAlign: 'left' },
    tr:               { borderBottom: '1px solid #eee' },
    td:               { padding: '0.8rem 1rem' },
    tdPos:            { padding: '0.8rem 1rem', fontSize: '1.2rem', textAlign: 'center', width: '60px' },
    tdPuntos:         { padding: '0.8rem 1rem', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' },
    info:             { color: '#888', fontStyle: 'italic' },
}

// Exportamos el componente para usarlo en otras partes de la app.
export default Ranking
