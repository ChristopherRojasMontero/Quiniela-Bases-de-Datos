// useState es un "hook" de React que nos permite guardar valores que pueden cambiar (estado del componente).
// Cuando el estado cambia, React vuelve a dibujar el componente automáticamente.
import { useState } from 'react'

// useNavigate cambia la URL de la app (sin recargar la página); Link crea enlaces internos.
import { useNavigate, Link } from 'react-router-dom'

// axios es una librería para hacer peticiones HTTP (como GET, POST) al backend.
import axios from 'axios'

// Componente que muestra el formulario de inicio de sesión.
function Login() {
    // Estado "form": guarda los valores escritos por el usuario en los inputs (usuario y contraseña).
    const [form, setForm]     = useState({ nombre_usuario: '', contrasena: '' })

    // Estado "error": guarda un mensaje de error para mostrarlo si el login falla.
    const [error, setError]   = useState('')

    // navigate nos permite cambiar de página después del login.
    const navigate            = useNavigate()

    // Función que se ejecuta cada vez que el usuario escribe en un input.
    // Actualiza el estado "form" copiando lo anterior (...form) y modificando solo el campo correspondiente.
    // e.target.name es el atributo "name" del input; e.target.value es lo que el usuario escribió.
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
            // Hacemos POST al backend con usuario y contraseña.
            const res = await axios.post('http://localhost:3000/api/auth/login', form)

            // Si la respuesta es exitosa, guardamos el token y los datos del usuario en localStorage.
            // JSON.stringify convierte el objeto en texto para poder guardarlo.
            localStorage.setItem('token',   res.data.token)
            localStorage.setItem('usuario', JSON.stringify(res.data.usuario))

            // Redirigimos al dashboard.
            navigate('/dashboard')
        } catch (err) {
            // Si algo falla, mostramos el mensaje de error que envió el backend, o uno genérico.
            // El operador ?. (optional chaining) evita errores si alguna propiedad no existe.
            setError(err.response?.data?.error || 'Error al iniciar sesión')
        }
    }

    // Lo que aparece en pantalla. JSX permite mezclar HTML con JavaScript.
    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>Quiniela Fútbol</h2>
                {/* Cuando el usuario apriete enter o haga clic en "Entrar", se llama a handleSubmit. */}
                <form onSubmit={handleSubmit}>
                    {/* Input controlado: su valor lo controla React (a través de form.nombre_usuario). */}
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
                    {/* Mostramos el mensaje de error solo si la variable error tiene texto. */}
                    {error && <p style={styles.error}>{error}</p>}
                    <button style={styles.button} type="submit">Entrar</button>
                </form>
                {/* Enlace para que un usuario nuevo pueda crear una cuenta. */}
                <p style={styles.link}>¿No tenés cuenta? <Link to="/registro">Registrate</Link></p>
            </div>
        </div>
    )
}

// Objeto con todos los estilos en línea (inline) que usamos en este componente.
// Es como escribir CSS pero como objetos JavaScript.
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
export default Login
