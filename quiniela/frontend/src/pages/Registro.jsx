// useState es un "hook" de React que nos permite guardar valores que pueden cambiar (estado del componente).
// Cuando el estado cambia, React vuelve a dibujar el componente automáticamente.
import { useState } from 'react'

// useNavigate cambia la URL de la app; Link crea enlaces internos sin recargar la página.
import { useNavigate, Link } from 'react-router-dom'

// axios es una librería para hacer peticiones HTTP (como GET, POST) al backend.
import axios from 'axios'

// Componente que muestra el formulario de registro de un usuario nuevo.
function Registro() {
    // Estado "form": guarda los valores escritos por el usuario en los inputs.
    const [form, setForm]   = useState({
        nombre_completo:    '',
        correo_electronico: '',
        nombre_usuario:     '',
        contrasena:         '',
        fecha_nacimiento:   '',
    })

    // Estado "error": guarda un mensaje de error para mostrarlo si el registro falla.
    const [error, setError] = useState('')

    // navigate nos permite cambiar de página después del registro.
    const navigate          = useNavigate()

    // Función que se ejecuta cada vez que el usuario escribe en un input.
    // Actualiza el estado "form" copiando lo anterior (...form) y modificando solo el campo correspondiente.
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    // Función que se ejecuta cuando el usuario envía el formulario.
    const handleSubmit = async (e) => {
        // Evitamos el comportamiento por defecto del formulario (que recargaría la página).
        e.preventDefault()

        // Limpiamos cualquier error anterior.
        setError('')
        try {
            // Hacemos POST al backend con los datos del nuevo usuario.
            await axios.post('http://localhost:3000/api/auth/registro', form)

            // Si el registro fue exitoso, llevamos al usuario al login para que inicie sesión.
            navigate('/login')
        } catch (err) {
            // Si algo falla, mostramos el mensaje de error que envió el backend, o uno genérico.
            setError(err.response?.data?.error || 'Error al registrar usuario')
        }
    }

    // Lo que aparece en pantalla. JSX permite mezclar HTML con JavaScript.
    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>Crear cuenta</h2>
                {/* Cuando el usuario apriete enter o haga clic en "Registrarse", se llama a handleSubmit. */}
                <form onSubmit={handleSubmit}>
                    {/* Input controlado: su valor lo controla React (a través de form.nombre_completo). */}
                    <input
                        style={styles.input}
                        type="text"
                        name="nombre_completo"
                        placeholder="Nombre completo"
                        value={form.nombre_completo}
                        onChange={handleChange}
                    />
                    <input
                        style={styles.input}
                        type="email"
                        name="correo_electronico"
                        placeholder="Correo electrónico"
                        value={form.correo_electronico}
                        onChange={handleChange}
                    />
                    <input
                        style={styles.input}
                        type="text"
                        name="nombre_usuario"
                        placeholder="Usuario"
                        value={form.nombre_usuario}
                        onChange={handleChange}
                    />
                    <input
                        style={styles.input}
                        type="password"
                        name="contrasena"
                        placeholder="Contraseña"
                        value={form.contrasena}
                        onChange={handleChange}
                    />
                    <input
                        style={styles.input}
                        type="date"
                        name="fecha_nacimiento"
                        value={form.fecha_nacimiento}
                        onChange={handleChange}
                    />
                    {/* Mostramos el mensaje de error solo si la variable error tiene texto. */}
                    {error && <p style={styles.error}>{error}</p>}
                    <button style={styles.button} type="submit">Registrarse</button>
                </form>
                {/* Enlace para volver al login si el usuario ya tiene cuenta. */}
                <p style={styles.link}>¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link></p>
            </div>
        </div>
    )
}

// Objeto con todos los estilos en línea (inline) que usamos en este componente.
const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' },
    card:      { background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '320px' },
    title:     { textAlign: 'center', marginBottom: '1.5rem', color: '#2c3e50' },
    input:     { width: '100%', padding: '0.7rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' },
    button:    { width: '100%', padding: '0.8rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' },
    error:     { color: 'red', marginBottom: '1rem', fontSize: '0.9rem' },
    link:      { textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' },
}

// Exportamos el componente para que pueda usarse en otras partes de la app.
export default Registro
