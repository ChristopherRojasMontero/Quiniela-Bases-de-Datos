// useState para guardar valores que pueden cambiar (estado del componente).
// useEffect para ejecutar código en momentos específicos (por ejemplo, al cargar la página).
import { useState, useEffect } from 'react'

// Instancia de axios ya configurada con la URL base del backend.
import api from '../services/api'

// Componente que permite al usuario ingresar pronósticos y ver su historial.
function Pronosticos() {
    // Lista de quinielas abiertas (solo en esas se pueden cargar pronósticos).
    const [quinielas, setQuinielas]       = useState([])

    // Quiniela que el usuario está mirando actualmente. null si todavía no eligió ninguna.
    const [quinielaActiva, setQuinielaActiva] = useState(null)

    // Partidos pendientes de la quiniela activa (no se pronostican partidos ya jugados).
    const [partidos, setPartidos]         = useState([])

    // Historial de pronósticos del usuario (los que ya cargó antes).
    const [historial, setHistorial]       = useState([])

    // Objeto que guarda los pronósticos que el usuario está escribiendo en pantalla.
    // La clave es el id del partido y el valor es un objeto con goles_local_predicho y goles_visitante_predicho.
    const [pronosticos, setPronosticos]   = useState({})

    // Pestaña activa: 'ingresar' (cargar pronósticos) o 'historial' (ver pronósticos pasados).
    const [tab, setTab]                   = useState('ingresar')

    // Al montar el componente, cargamos las quinielas y el historial.
    useEffect(() => {
        cargarQuinielas()
        cargarHistorial()
    }, [])

    // Trae las quinielas del backend y se queda solamente con las que están "abiertas".
    const cargarQuinielas = async () => {
        try {
            const res = await api.get('/quinielas')
            setQuinielas(res.data.filter(q => q.estado === 'abierta'))
        } catch {}
    }

    // Cuando el usuario hace clic en una quiniela, la marcamos como activa y traemos sus partidos pendientes.
    const seleccionarQuiniela = async (q) => {
        setQuinielaActiva(q)
        try {
            const res = await api.get(`/quinielas/${q.id_quiniela}`)
            setPartidos(res.data.partidos.filter(p => p.estado === 'pendiente'))
        } catch {}
    }

    // Trae del backend el historial de pronósticos del usuario.
    const cargarHistorial = async () => {
        try {
            const res = await api.get('/pronosticos/mis-pronosticos')
            setHistorial(res.data)
        } catch {}
    }

    // Función que se ejecuta cuando el usuario escribe goles en algún input de pronóstico.
    // Actualiza el estado "pronosticos" manteniendo los datos previos y modificando solo el partido y campo correspondientes.
    const handleChange = (id_partido, campo, valor) => {
        setPronosticos(prev => ({
            ...prev,
            [id_partido]: { ...prev[id_partido], [campo]: valor }
        }))
    }

    // Función que envía el pronóstico al backend.
    const registrar = async (id_partido) => {
        const p = pronosticos[id_partido]
        // Validación: avisamos si falta alguno de los marcadores.
        if (!p?.goles_local_predicho || !p?.goles_visitante_predicho) {
            return alert('Ingresá ambos marcadores')
        }
        try {
            await api.post('/pronosticos', {
                id_partido,
                id_quiniela:            quinielaActiva.id_quiniela,
                goles_local_predicho:   parseInt(p.goles_local_predicho),
                goles_visitante_predicho: parseInt(p.goles_visitante_predicho),
            })
            alert('Pronóstico registrado')
            // Después de registrar, recargamos el historial para mostrar el nuevo.
            cargarHistorial()
        } catch (err) {
            alert(err.response?.data?.error || 'Error al registrar pronóstico')
        }
    }

    return (
        <div style={styles.container}>
            <h3 style={styles.titulo}>Pronósticos</h3>
            {/* Pestañas para cambiar entre "Ingresar pronóstico" y "Mi historial". */}
            <div style={styles.tabs}>
                <button style={tab === 'ingresar' ? styles.tabActivo : styles.tab} onClick={() => setTab('ingresar')}>Ingresar pronóstico</button>
                <button style={tab === 'historial' ? styles.tabActivo : styles.tab} onClick={() => setTab('historial')}>Mi historial</button>
            </div>

            {/* Solo mostramos esta sección si la pestaña activa es "ingresar". */}
            {tab === 'ingresar' && (
                <div>
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

                    {/* Si ya hay quiniela activa pero no tiene partidos pendientes, mostramos un mensaje informativo. */}
                    {quinielaActiva && partidos.length === 0 && (
                        <p style={styles.info}>No hay partidos pendientes en esta quiniela.</p>
                    )}

                    {/* Tarjeta por cada partido pendiente, con dos inputs para escribir el pronóstico. */}
                    <div style={styles.grid}>
                        {partidos.map(p => (
                            <div key={p.id_partido} style={styles.card}>
                                <h4 style={styles.versus}>{p.equipo_local} vs {p.equipo_visitante}</h4>
                                <p style={styles.fecha}>{new Date(p.fecha_hora).toLocaleString()}</p>
                                <div style={styles.marcadorInput}>
                                    {/* Input para goles del local. El valor sale del estado "pronosticos" para este partido. */}
                                    <input
                                        style={styles.inputGol}
                                        type="number" min="0" placeholder="0"
                                        value={pronosticos[p.id_partido]?.goles_local_predicho || ''}
                                        onChange={e => handleChange(p.id_partido, 'goles_local_predicho', e.target.value)}
                                    />
                                    <span style={styles.vs}>-</span>
                                    <input
                                        style={styles.inputGol}
                                        type="number" min="0" placeholder="0"
                                        value={pronosticos[p.id_partido]?.goles_visitante_predicho || ''}
                                        onChange={e => handleChange(p.id_partido, 'goles_visitante_predicho', e.target.value)}
                                    />
                                </div>
                                <button style={styles.btn} onClick={() => registrar(p.id_partido)}>
                                    Guardar pronóstico
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Solo mostramos esta sección si la pestaña activa es "historial". */}
            {tab === 'historial' && (
                <div style={styles.tabla}>
                    {/* Si no hay pronósticos, mostramos un mensaje. Si hay, mostramos la tabla. */}
                    {historial.length === 0 ? (
                        <p style={styles.info}>No tenés pronósticos registrados.</p>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                            <tr>
                                <th>Quiniela</th>
                                <th>Partido</th>
                                <th>Mi pronóstico</th>
                                <th>Resultado</th>
                                <th>Puntos</th>
                            </tr>
                            </thead>
                            <tbody>
                            {/* Iteramos el historial y armamos una fila por cada pronóstico.
                                Usamos el índice "i" como key (no es ideal pero funciona si la lista no cambia). */}
                            {historial.map((h, i) => (
                                <tr key={i} style={i % 2 === 0 ? styles.trPar : {}}>
                                    <td>{h.quiniela}</td>
                                    <td>{h.equipo_local} vs {h.equipo_visitante}</td>
                                    <td style={styles.center}>{h.goles_local_predicho} - {h.goles_visitante_predicho}</td>
                                    <td style={styles.center}>
                                        {/* Si el partido ya tiene resultado, lo mostramos; si no, un guion. */}
                                        {h.resultado_local !== null ? `${h.resultado_local} - ${h.resultado_visitante}` : '-'}
                                    </td>
                                    <td style={{ ...styles.center, color: h.puntos > 0 ? '#27ae60' : '#888', fontWeight: 'bold' }}>
                                        {h.puntos}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    )
}

// Estilos en línea utilizados en el componente.
const styles = {
    container:        { padding: '1.5rem' },
    titulo:           { marginBottom: '1rem', fontSize: '1.3rem' },
    tabs:             { display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid #ddd' },
    tab:              { padding: '0.6rem 1.2rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.95rem' },
    tabActivo:        { padding: '0.6rem 1.2rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#2980b9', fontSize: '0.95rem', borderBottom: '2px solid #2980b9', marginBottom: '-2px' },
    quinielaSelector: { display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
    qBtn:             { padding: '0.5rem 1rem', background: '#ecf0f1', border: 'none', borderRadius: '20px', cursor: 'pointer' },
    qBtnActivo:       { padding: '0.5rem 1rem', background: '#2980b9', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer' },
    grid:             { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' },
    card:             { background: '#fff', borderRadius: '8px', padding: '1.2rem', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', textAlign: 'center' },
    versus:           { marginBottom: '0.4rem' },
    fecha:            { color: '#888', fontSize: '0.85rem', marginBottom: '1rem' },
    marcadorInput:    { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' },
    inputGol:         { width: '60px', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center', fontSize: '1.2rem' },
    vs:               { fontSize: '1.2rem', fontWeight: 'bold', color: '#555' },
    btn:              { width: '100%', padding: '0.6rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    info:             { color: '#888', fontStyle: 'italic' },
    tabla:            { background: '#fff', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
    table:            { width: '100%', borderCollapse: 'collapse' },
    trPar:            { background: '#f9f9f9' },
    center:           { textAlign: 'center' },
}

// Exportamos el componente para usarlo en otras partes de la app.
export default Pronosticos
