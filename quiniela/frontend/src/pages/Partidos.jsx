// Hooks de React: useState para guardar estado; useEffect para ejecutar código al cargar el componente.
import { useState, useEffect } from 'react'

// Instancia de axios configurada para hablar con nuestro backend.
import api from '../services/api'

// Componente que muestra los partidos y permite al admin crearlos y cargar resultados.
function Partidos() {
    // Lista de partidos cargados desde el backend.
    const [partidos, setPartidos] = useState([])

    // Lista de equipos disponibles (solo se carga si el usuario es admin, para los selectores del formulario).
    const [equipos, setEquipos]   = useState([])

    // Datos del formulario para crear un partido nuevo.
    const [form, setForm]         = useState({ id_equipo_local: '', id_equipo_visitante: '', fecha_hora: '' })

    // Estado del formulario para cargar el resultado de un partido específico.
    // id_partido indica qué partido se está editando; los otros campos son los goles.
    const [resultado, setResultado] = useState({ id_partido: null, goles_local: '', goles_visitante: '' })

    // Mensaje de error para mostrar al usuario.
    const [error, setError]       = useState('')

    // Leemos al usuario del localStorage y verificamos si es administrador.
    // El operador ?. evita errores si "usuario" fuera null.
    const usuario = JSON.parse(localStorage.getItem('usuario'))
    const esAdmin = usuario?.tipo_usuario === 'administrador'

    // useEffect con [] se ejecuta solo una vez al montar el componente.
    // Cargamos partidos siempre; los equipos solo si el usuario es admin.
    useEffect(() => {
        cargarPartidos()
        if (esAdmin) cargarEquipos()
    }, [])

    // Función que pide al backend la lista de partidos.
    const cargarPartidos = async () => {
        try {
            const res = await api.get('/partidos')
            setPartidos(res.data)
        } catch {
            setError('Error al cargar partidos')
        }
    }

    // Función que pide al backend la lista de equipos disponibles.
    const cargarEquipos = async () => {
        try {
            const res = await api.get('/partidos/equipos')
            setEquipos(res.data)
        } catch {}
    }

    // Función para crear un partido nuevo (solo lo usan los administradores).
    const crearPartido = async (e) => {
        // Evitamos el reload de la página al enviar el formulario.
        e.preventDefault()
        try {
            await api.post('/partidos', form)
            // Después de crear, limpiamos el formulario.
            setForm({ id_equipo_local: '', id_equipo_visitante: '', fecha_hora: '' })
            // Recargamos la lista de partidos para ver el nuevo.
            cargarPartidos()
        } catch (err) {
            alert(err.response?.data?.error || 'Error al crear partido')
        }
    }

    // Función para registrar el resultado final de un partido.
    const actualizarResultado = async (e) => {
        e.preventDefault()
        try {
            // parseInt convierte el texto del input en número entero.
            await api.put(`/partidos/${resultado.id_partido}/resultado`, {
                goles_local:     parseInt(resultado.goles_local),
                goles_visitante: parseInt(resultado.goles_visitante),
            })
            // Limpiamos el estado de "resultado" para cerrar el formulario.
            setResultado({ id_partido: null, goles_local: '', goles_visitante: '' })
            cargarPartidos()
        } catch (err) {
            alert(err.response?.data?.error || 'Error al actualizar resultado')
        }
    }

    // Objeto que asocia cada estado posible con un color, para usarlo en los badges.
    const estadoColor = { pendiente: '#e67e22', en_curso: '#2980b9', finalizado: '#27ae60' }

    return (
        <div style={styles.container}>
            <h3 style={styles.titulo}>Partidos</h3>
            {error && <p style={styles.error}>{error}</p>}

            {/* Si el usuario es admin, mostramos el formulario para crear partidos. */}
            {esAdmin && (
                <div style={styles.formCard}>
                    <h4>Crear partido</h4>
                    <form onSubmit={crearPartido} style={styles.form}>
                        {/* Selector de equipo local. Al cambiar, actualizamos el campo correspondiente del form. */}
                        <select style={styles.input} value={form.id_equipo_local} onChange={e => setForm({...form, id_equipo_local: e.target.value})} required>
                            <option value="">Equipo local</option>
                            {equipos.map(eq => <option key={eq.id_equipo} value={eq.id_equipo}>{eq.nombre}</option>)}
                        </select>
                        <select style={styles.input} value={form.id_equipo_visitante} onChange={e => setForm({...form, id_equipo_visitante: e.target.value})} required>
                            <option value="">Equipo visitante</option>
                            {equipos.map(eq => <option key={eq.id_equipo} value={eq.id_equipo}>{eq.nombre}</option>)}
                        </select>
                        {/* Input especial datetime-local: muestra un selector de fecha y hora. */}
                        <input style={styles.input} type="datetime-local" value={form.fecha_hora} onChange={e => setForm({...form, fecha_hora: e.target.value})} required />
                        <button style={styles.btn} type="submit">Crear</button>
                    </form>
                </div>
            )}

            <div style={styles.grid}>
                {/* Iteramos sobre cada partido y armamos una tarjeta. */}
                {partidos.map(p => (
                    <div key={p.id_partido} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <strong>{p.equipo_local} vs {p.equipo_visitante}</strong>
                            <span style={{ ...styles.badge, background: estadoColor[p.estado] }}>{p.estado}</span>
                        </div>
                        {/* new Date(...).toLocaleString() convierte la fecha al formato local del usuario. */}
                        <p style={styles.fecha}>{new Date(p.fecha_hora).toLocaleString()}</p>

                        {/* Si el partido ya terminó, mostramos el marcador final. */}
                        {p.estado === 'finalizado' && (
                            <p style={styles.marcador}>{p.goles_local} - {p.goles_visitante}</p>
                        )}

                        {/* Si es admin y el partido aún no terminó, mostramos las opciones para cargar el resultado. */}
                        {esAdmin && p.estado !== 'finalizado' && (
                            // Si el admin ya hizo clic en "Registrar resultado" de este partido, mostramos el formulario.
                            // Si no, mostramos solo el botón.
                            resultado.id_partido === p.id_partido ? (
                                <form onSubmit={actualizarResultado} style={styles.resultForm}>
                                    <input style={styles.inputSmall} type="number" min="0" placeholder="Local" value={resultado.goles_local} onChange={e => setResultado({...resultado, goles_local: e.target.value})} required />
                                    <input style={styles.inputSmall} type="number" min="0" placeholder="Visit." value={resultado.goles_visitante} onChange={e => setResultado({...resultado, goles_visitante: e.target.value})} required />
                                    <button style={styles.btnSm} type="submit">Guardar</button>
                                    {/* Botón cancelar: limpia el estado de "resultado" para volver al botón. */}
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

// Estilos en línea utilizados en el componente.
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

// Exportamos el componente para usarlo en otras partes de la app.
export default Partidos
