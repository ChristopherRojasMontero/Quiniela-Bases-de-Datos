import { useState, useEffect } from 'react'
import api from '../services/api'

function Quinielas() {
    const [quinielas, setQuinielas]                 = useState([])
    const [partidos, setPartidos]                   = useState([])
    const [error, setError]                         = useState('')
    const [quinielaExpandida, setQuinielaExpandida] = useState(null)
    const [partidoSeleccionado, setPartidoSeleccionado] = useState('')
    const [mostrarFormCrear, setMostrarFormCrear]   = useState(false)

    // Estado del formulario para crear una quiniela nueva.
    const [formQuiniela, setFormQuiniela] = useState({
        nombre:                   '',
        descripcion:              '',
        reglas:                   '',
        fecha_inicio_inscripcion: '',
        fecha_cierre_inscripcion: '',
        modalidad:                'publica',
        tipo_puntuacion:          'basico',
        partidos:                 []
    })

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
        } catch {
            setError('Error al cargar quinielas')
        }
    }

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

    // Maneja la selección múltiple de partidos en el formulario de crear quiniela.
    const togglePartido = (id_partido) => {
        const id = parseInt(id_partido)
        setFormQuiniela(prev => ({
            ...prev,
            partidos: prev.partidos.includes(id)
                ? prev.partidos.filter(p => p !== id)
                : [...prev.partidos, id]
        }))
    }

    // Crea una quiniela nueva con los datos del formulario.
    const crearQuiniela = async (e) => {
        e.preventDefault()
        if (!formQuiniela.nombre || !formQuiniela.fecha_inicio_inscripcion || !formQuiniela.fecha_cierre_inscripcion) {
            return alert('Nombre y fechas son obligatorios')
        }
        try {
            await api.post('/quinielas', formQuiniela)
            alert('Quiniela creada exitosamente')
            setMostrarFormCrear(false)
            setFormQuiniela({
                nombre: '', descripcion: '', reglas: '',
                fecha_inicio_inscripcion: '', fecha_cierre_inscripcion: '',
                modalidad: 'publica', tipo_puntuacion: 'basico', partidos: []
            })
            cargarQuinielas()
        } catch (err) {
            alert(err.response?.data?.error || 'Error al crear quiniela')
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.encabezado}>
                <h3 style={styles.titulo}>Quinielas disponibles</h3>
                {/* Botón para mostrar el formulario de crear quiniela, solo para admin. */}
                {esAdmin && (
                    <button style={styles.btnCrear} onClick={() => setMostrarFormCrear(!mostrarFormCrear)}>
                        {mostrarFormCrear ? 'Cancelar' : '+ Nueva quiniela'}
                    </button>
                )}
            </div>

            {error && <p style={styles.error}>{error}</p>}

            {/* Formulario para crear una quiniela nueva, solo visible si el admin lo abrió. */}
            {esAdmin && mostrarFormCrear && (
                <div style={styles.formCard}>
                    <h4 style={styles.formTitulo}>Crear nueva quiniela</h4>
                    <form onSubmit={crearQuiniela}>
                        <div style={styles.formGrid}>
                            <div style={styles.formGrupo}>
                                <label style={styles.label}>Nombre *</label>
                                <input style={styles.input} type="text" value={formQuiniela.nombre}
                                       onChange={e => setFormQuiniela({...formQuiniela, nombre: e.target.value})} required />
                            </div>
                            <div style={styles.formGrupo}>
                                <label style={styles.label}>Modalidad</label>
                                <select style={styles.input} value={formQuiniela.modalidad}
                                        onChange={e => setFormQuiniela({...formQuiniela, modalidad: e.target.value})}>
                                    <option value="publica">Pública</option>
                                    <option value="privada">Privada</option>
                                </select>
                            </div>
                            <div style={styles.formGrupo}>
                                <label style={styles.label}>Tipo de puntuación</label>
                                <select style={styles.input} value={formQuiniela.tipo_puntuacion}
                                        onChange={e => setFormQuiniela({...formQuiniela, tipo_puntuacion: e.target.value})}>
                                    <option value="basico">Básico</option>
                                    <option value="exacto">Exacto</option>
                                    <option value="racha">Racha</option>
                                </select>
                            </div>
                            <div style={styles.formGrupo}>
                                <label style={styles.label}>Inicio de inscripciones *</label>
                                <input style={styles.input} type="datetime-local" value={formQuiniela.fecha_inicio_inscripcion}
                                       onChange={e => setFormQuiniela({...formQuiniela, fecha_inicio_inscripcion: e.target.value})} required />
                            </div>
                            <div style={styles.formGrupo}>
                                <label style={styles.label}>Cierre de inscripciones *</label>
                                <input style={styles.input} type="datetime-local" value={formQuiniela.fecha_cierre_inscripcion}
                                       onChange={e => setFormQuiniela({...formQuiniela, fecha_cierre_inscripcion: e.target.value})} required />
                            </div>
                        </div>

                        <div style={styles.formGrupo}>
                            <label style={styles.label}>Descripción</label>
                            <textarea style={styles.textarea} value={formQuiniela.descripcion}
                                      onChange={e => setFormQuiniela({...formQuiniela, descripcion: e.target.value})} rows={2} />
                        </div>

                        <div style={styles.formGrupo}>
                            <label style={styles.label}>Reglas</label>
                            <textarea style={styles.textarea} value={formQuiniela.reglas}
                                      onChange={e => setFormQuiniela({...formQuiniela, reglas: e.target.value})} rows={2} />
                        </div>

                        {/* Selector de partidos: el admin elige cuáles incluir en la quiniela. */}
                        <div style={styles.formGrupo}>
                            <label style={styles.label}>Partidos a incluir</label>
                            <div style={styles.partidosGrid}>
                                {partidos.map(p => (
                                    <label key={p.id_partido} style={styles.checkLabel}>
                                        <input
                                            type="checkbox"
                                            checked={formQuiniela.partidos.includes(p.id_partido)}
                                            onChange={() => togglePartido(p.id_partido)}
                                        />
                                        {p.equipo_local} vs {p.equipo_visitante} — {new Date(p.fecha_hora).toLocaleDateString()}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button style={styles.btnSubmit} type="submit">Crear quiniela</button>
                    </form>
                </div>
            )}

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

                        {/* Panel para agregar partidos a una quiniela existente, solo para admin. */}
                        {esAdmin && (
                            <div style={styles.adminPanel}>
                                {quinielaExpandida === q.id_quiniela ? (
                                    <div style={styles.agregarForm}>
                                        <select style={styles.select} value={partidoSeleccionado}
                                                onChange={e => setPartidoSeleccionado(e.target.value)}>
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
    container:    { padding: '1.5rem' },
    encabezado:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
    titulo:       { fontSize: '1.3rem', margin: 0 },
    error:        { color: 'red' },
    btnCrear:     { padding: '0.6rem 1.2rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    formCard:     { background: '#fff', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', marginBottom: '1.5rem' },
    formTitulo:   { marginBottom: '1rem', color: '#2c3e50' },
    formGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.8rem', marginBottom: '0.8rem' },
    formGrupo:    { display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.8rem' },
    label:        { fontSize: '0.85rem', color: '#555', fontWeight: 'bold' },
    input:        { padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem' },
    textarea:     { padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem', resize: 'vertical' },
    partidosGrid: { display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '0.6rem' },
    checkLabel:   { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' },
    btnSubmit:    { padding: '0.7rem 1.5rem', background: '#2980b9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' },
    grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' },
    card:         { background: '#fff', borderRadius: '8px', padding: '1.2rem', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
    cardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
    badge:        { color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' },
    desc:         { color: '#666', fontSize: '0.9rem', marginBottom: '0.8rem' },
    info:         { display: 'flex', gap: '1rem', fontSize: '0.85rem', marginBottom: '0.8rem', flexWrap: 'wrap' },
    reglas:       { fontSize: '0.85rem', color: '#555', marginBottom: '1rem' },
    btn:          { width: '100%', padding: '0.6rem', background: '#2980b9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem' },
    adminPanel:   { marginTop: '0.8rem', borderTop: '1px solid #eee', paddingTop: '0.8rem' },
    agregarForm:  { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
    select:       { padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' },
    btnRow:       { display: 'flex', gap: '0.5rem' },
    btnVerde:     { flex: 1, padding: '0.5rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    btnGris:      { flex: 1, padding: '0.5rem', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    btnOutline:   { width: '100%', padding: '0.5rem', background: 'transparent', color: '#2980b9', border: '1px solid #2980b9', borderRadius: '4px', cursor: 'pointer' },
}

export default Quinielas