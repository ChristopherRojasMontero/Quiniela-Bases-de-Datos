import { useState, useEffect } from 'react'
import api from '../services/api'

function Quinielas() {
    const [quinielas, setQuinielas]         = useState([])
    const [partidos, setPartidos]           = useState([])
    const [error, setError]                 = useState('')
    const [quinielaExpandida, setQuinielaExpandida] = useState(null)
    const [partidoSeleccionado, setPartidoSeleccionado] = useState('')

    const usuario = JSON.parse(localStorage.getItem('usuario'))
    const esAdmin = usuario?.tipo_usuario === 'administrador'

    useEffect(() => {
        cargarQuinielas()
        if (esAdmin) cargarPartidos()
    }, [])

    const cargarQuinielas = async () => {
        try {
            const res = await api.get('/quinielas')
            setQuinielas(res.data)
        } catch (err) {
            setError('Error al cargar quinielas')
        }
    }

    // Cargamos todos los partidos para el selector del admin.
    const cargarPartidos = async () => {
        try {
            const res = await api.get('/partidos')
            setPartidos(res.data)
        } catch {}
    }

    const inscribirse = async (id_quiniela) => {
        try {
            await api.post(`/quinielas/${id_quiniela}/inscribirse`)
            alert('Inscripción exitosa')
            cargarQuinielas()
        } catch (err) {
            alert(err.response?.data?.error || 'Error al inscribirse')
        }
    }

    // Agrega un partido a una quiniela existente.
    const agregarPartido = async (id_quiniela) => {
        if (!partidoSeleccionado) return alert('Seleccioná un partido')
        try {
            await api.post(`/quinielas/${id_quiniela}/partidos`, { id_partido: partidoSeleccionado })
            alert('Partido agregado')
            setPartidoSeleccionado('')
            setQuinielaExpandida(null)
        } catch (err) {
            alert(err.response?.data?.error || 'Error al agregar partido')
        }
    }

    return (
        <div style={styles.container}>
            <h3 style={styles.titulo}>Quinielas disponibles</h3>
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.grid}>
                {quinielas.map(q => (
                    <div key={q.id_quiniela} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h4>{q.nombre}</h4>
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

                        {/* Botón inscribirse solo para jugadores en quinielas abiertas. */}
                        {!esAdmin && q.estado === 'abierta' && (
                            <button style={styles.btn} onClick={() => inscribirse(q.id_quiniela)}>
                                Inscribirse
                            </button>
                        )}

                        {/* Panel para agregar partidos, solo para admin. */}
                        {esAdmin && (
                            <div style={styles.adminPanel}>
                                {quinielaExpandida === q.id_quiniela ? (
                                    <div style={styles.agregarForm}>
                                        <select
                                            style={styles.select}
                                            value={partidoSeleccionado}
                                            onChange={e => setPartidoSeleccionado(e.target.value)}
                                        >
                                            <option value="">Seleccioná un partido</option>
                                            {partidos.map(p => (
                                                <option key={p.id_partido} value={p.id_partido}>
                                                    {p.equipo_local} vs {p.equipo_visitante} — {new Date(p.fecha_hora).toLocaleDateString()}
                                                </option>
                                            ))}
                                        </select>
                                        <div style={styles.btnRow}>
                                            <button style={styles.btnVerde} onClick={() => agregarPartido(q.id_quiniela)}>Agregar</button>
                                            <button style={styles.btnGris}  onClick={() => setQuinielaExpandida(null)}>Cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button style={styles.btnOutline} onClick={() => setQuinielaExpandida(q.id_quiniela)}>
                                        + Agregar partido
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

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
    adminPanel: { marginTop: '0.8rem', borderTop: '1px solid #eee', paddingTop: '0.8rem' },
    agregarForm:{ display: 'flex', flexDirection: 'column', gap: '0.6rem' },
    select:     { padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' },
    btnRow:     { display: 'flex', gap: '0.5rem' },
    btnVerde:   { flex: 1, padding: '0.5rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    btnGris:    { flex: 1, padding: '0.5rem', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    btnOutline: { width: '100%', padding: '0.5rem', background: 'transparent', color: '#2980b9', border: '1px solid #2980b9', borderRadius: '4px', cursor: 'pointer' },
}

export default Quinielas