import { useState, useEffect } from 'react'
import api from '../services/api'

function Partidos() {
    const [partidos, setPartidos]   = useState([])
    const [equipos, setEquipos]     = useState([])
    const [form, setForm]           = useState({ id_equipo_local: '', id_equipo_visitante: '', fecha_hora: '' })
    const [resultado, setResultado] = useState({ id_partido: null, goles_local: '', goles_visitante: '' })
    const [error, setError]         = useState('')

    const usuario = JSON.parse(localStorage.getItem('usuario'))
    const esAdmin = usuario?.tipo_usuario === 'administrador'

    // Al montar el componente cargamos partidos y equipos (equipos solo si es admin).
    useEffect(() => {
        cargarPartidos()
        if (esAdmin) cargarEquipos()
    }, [])

    const cargarPartidos = async () => {
        try {
            const res = await api.get('/partidos')
            setPartidos(res.data)
        } catch {
            setError('Error al cargar partidos')
        }
    }

    const cargarEquipos = async () => {
        try {
            const res = await api.get('/partidos/equipos')
            setEquipos(res.data)
        } catch {}
    }

    const crearPartido = async (e) => {
        e.preventDefault()
        // Validamos en el frontend antes de mandar al servidor.
        if (form.id_equipo_local === form.id_equipo_visitante) {
            return alert('El equipo local y visitante deben ser distintos')
        }
        try {
            await api.post('/partidos', form)
            setForm({ id_equipo_local: '', id_equipo_visitante: '', fecha_hora: '' })
            cargarPartidos()
        } catch (err) {
            alert(err.response?.data?.error || 'Error al crear partido')
        }
    }

    // Registra el resultado final. Esto dispara el trigger de puntuación en la BD.
    const actualizarResultado = async (e) => {
        e.preventDefault()
        try {
            await api.put(`/partidos/${resultado.id_partido}/resultado`, {
                goles_local:     parseInt(resultado.goles_local),
                goles_visitante: parseInt(resultado.goles_visitante),
            })
            setResultado({ id_partido: null, goles_local: '', goles_visitante: '' })
            cargarPartidos()
        } catch (err) {
            alert(err.response?.data?.error || 'Error al actualizar resultado')
        }
    }

    const estadoColor = { pendiente: '#e67e22', en_curso: '#2980b9', finalizado: '#27ae60' }

    return (
        <div style={styles.container}>
            <h3 style={styles.titulo}>Partidos</h3>
            {error && <p style={styles.error}>{error}</p>}

            {/* Formulario para crear partidos, solo visible para administradores. */}
            {esAdmin && (
                <div style={styles.formCard}>
                    <h4>Crear partido</h4>
                    <form onSubmit={crearPartido} style={styles.form}>
                        <select style={styles.input} value={form.id_equipo_local} onChange={e => setForm({...form, id_equipo_local: e.target.value})} required>
                            <option value="">Equipo local</option>
                            {equipos.map(eq => <option key={eq.id_equipo} value={eq.id_equipo}>{eq.nombre}</option>)}
                        </select>
                        <select style={styles.input} value={form.id_equipo_visitante} onChange={e => setForm({...form, id_equipo_visitante: e.target.value})} required>
                            <option value="">Equipo visitante</option>
                            {equipos.map(eq => <option key={eq.id_equipo} value={eq.id_equipo}>{eq.nombre}</option>)}
                        </select>
                        <input style={styles.input} type="datetime-local" value={form.fecha_hora} onChange={e => setForm({...form, fecha_hora: e.target.value})} required />
                        <button style={styles.btn} type="submit">Crear</button>
                    </form>
                </div>
            )}

            <div style={styles.grid}>
                {partidos.map(p => (
                    <div key={p.id_partido} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <strong>{p.equipo_local} vs {p.equipo_visitante}</strong>
                            <span style={{ ...styles.badge, background: estadoColor[p.estado] }}>{p.estado}</span>
                        </div>
                        <p style={styles.fecha}>{new Date(p.fecha_hora).toLocaleString()}</p>

                        {/* Marcador final, solo visible si el partido terminó. */}
                        {p.estado === 'finalizado' && (
                            <p style={styles.marcador}>{p.goles_local} - {p.goles_visitante}</p>
                        )}

                        {/* Formulario de resultado para admin en partidos no finalizados. */}
                        {esAdmin && p.estado !== 'finalizado' && (
                            resultado.id_partido === p.id_partido ? (
                                <form onSubmit={actualizarResultado} style={styles.resultForm}>
                                    <input style={styles.inputSmall} type="number" min="0" placeholder="Local"  value={resultado.goles_local}     onChange={e => setResultado({...resultado, goles_local: e.target.value})}     required />
                                    <input style={styles.inputSmall} type="number" min="0" placeholder="Visit." value={resultado.goles_visitante} onChange={e => setResultado({...resultado, goles_visitante: e.target.value})} required />
                                    <button style={styles.btnSm} type="submit">Guardar</button>
                                    <button style={{...styles.btnSm, background: '#95a5a6'}} type="button" onClick={() => setResultado({ id_partido: null, goles_local: '', goles_visitante: '' })}>Cancelar</button>
                                </form>
                            ) : (
                                <button style={styles.btnOutline} onClick={() => setResultado({...resultado, id_partido: p.id_partido})}>
                                    Registrar resultado
                                </button>
                            )
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
    formCard:   { background: '#fff', padding: '1.2rem', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', marginBottom: '1.5rem' },
    form:       { display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.8rem' },
    input:      { padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem' },
    btn:        { padding: '0.6rem 1.2rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
    card:       { background: '#fff', borderRadius: '8px', padding: '1.2rem', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
    badge:      { color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' },
    fecha:      { color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' },
    marcador:   { fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', color: '#2c3e50', margin: '0.5rem 0' },
    resultForm: { display: 'flex', gap: '0.5rem', marginTop: '0.8rem', alignItems: 'center' },
    inputSmall: { width: '60px', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' },
    btnSm:      { padding: '0.4rem 0.8rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' },
    btnOutline: { marginTop: '0.8rem', width: '100%', padding: '0.5rem', background: 'transparent', color: '#2980b9', border: '1px solid #2980b9', borderRadius: '4px', cursor: 'pointer' },
}

export default Partidos