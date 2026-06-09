import { useState, useEffect } from 'react'
import api from '../services/api'

function Pronosticos() {
    const [quinielas, setQuinielas]           = useState([])
    const [quinielaActiva, setQuinielaActiva] = useState(null)
    const [partidos, setPartidos]             = useState([])
    const [historial, setHistorial]           = useState([])
    const [pronosticos, setPronosticos]       = useState({})
    const [tab, setTab]                       = useState('ingresar')

    useEffect(() => {
        cargarQuinielas()
        cargarHistorial()
    }, [])

    const cargarQuinielas = async () => {
        try {
            const res = await api.get('/quinielas')
            setQuinielas(res.data.filter(q => q.estado === 'abierta'))
        } catch {}
    }

    const seleccionarQuiniela = async (q) => {
        setQuinielaActiva(q)
        try {
            const res = await api.get(`/quinielas/${q.id_quiniela}`)
            setPartidos(res.data.partidos.filter(p => p.estado === 'pendiente'))
        } catch {}
    }

    const cargarHistorial = async () => {
        try {
            const res = await api.get('/pronosticos/mis-pronosticos')
            setHistorial(res.data)
        } catch {}
    }

    const handleChange = (id_partido, campo, valor) => {
        setPronosticos(prev => ({
            ...prev,
            [id_partido]: { ...prev[id_partido], [campo]: valor }
        }))
    }

    const registrar = async (id_partido) => {
        const p = pronosticos[id_partido]

        // Corrección: verificamos undefined y string vacío por separado
        // para no rechazar el valor 0 (que es un marcador válido)
        if (
            p?.goles_local_predicho === undefined    ||
            p?.goles_local_predicho === ''           ||
            p?.goles_visitante_predicho === undefined ||
            p?.goles_visitante_predicho === ''
        ) {
            return alert('Ingresá ambos marcadores')
        }

        try {
            await api.post('/pronosticos', {
                id_partido,
                id_quiniela:              quinielaActiva.id_quiniela,
                goles_local_predicho:     parseInt(p.goles_local_predicho),
                goles_visitante_predicho: parseInt(p.goles_visitante_predicho),
            })
            alert('Pronóstico registrado')
            cargarHistorial()
        } catch (err) {
            alert(err.response?.data?.error || 'Error al registrar pronóstico')
        }
    }

    return (
        <div style={styles.container}>
            <h3 style={styles.titulo}>Pronósticos</h3>
            <div style={styles.tabs}>
                <button style={tab === 'ingresar'  ? styles.tabActivo : styles.tab} onClick={() => setTab('ingresar')}>Ingresar pronóstico</button>
                <button style={tab === 'historial' ? styles.tabActivo : styles.tab} onClick={() => setTab('historial')}>Mi historial</button>
            </div>

            {tab === 'ingresar' && (
                <div>
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

                    {quinielaActiva && partidos.length === 0 && (
                        <p style={styles.info}>No hay partidos pendientes en esta quiniela.</p>
                    )}

                    <div style={styles.grid}>
                        {partidos.map(p => (
                            <div key={p.id_partido} style={styles.card}>
                                <h4 style={styles.versus}>{p.equipo_local} vs {p.equipo_visitante}</h4>
                                <p style={styles.fecha}>{new Date(p.fecha_hora).toLocaleString()}</p>
                                <div style={styles.marcadorInput}>
                                    <input
                                        style={styles.inputGol}
                                        type="number" min="0" placeholder="0"
                                        value={pronosticos[p.id_partido]?.goles_local_predicho ?? ''}
                                        onChange={e => handleChange(p.id_partido, 'goles_local_predicho', e.target.value)}
                                    />
                                    <span style={styles.vs}>-</span>
                                    <input
                                        style={styles.inputGol}
                                        type="number" min="0" placeholder="0"
                                        value={pronosticos[p.id_partido]?.goles_visitante_predicho ?? ''}
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

            {tab === 'historial' && (
                <div style={styles.tabla}>
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
                            {historial.map((h, i) => (
                                <tr key={i} style={i % 2 === 0 ? styles.trPar : {}}>
                                    <td>{h.quiniela}</td>
                                    <td>{h.equipo_local} vs {h.equipo_visitante}</td>
                                    <td style={styles.center}>{h.goles_local_predicho} - {h.goles_visitante_predicho}</td>
                                    <td style={styles.center}>
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

export default Pronosticos