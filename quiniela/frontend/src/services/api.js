// axios es una librería que facilita hacer peticiones HTTP (al backend, por ejemplo).
import axios from 'axios'

// Creamos una instancia personalizada de axios que apunta siempre a la URL base de nuestro backend.
// Así, en lugar de escribir la URL completa en cada llamada, podemos escribir solo el final (ej: '/quinielas').
const api = axios.create({
    baseURL: 'http://localhost:3000/api',
})

// Interceptor de peticiones: se ejecuta ANTES de que se mande cada petición.
// Lo usamos para agregarle automáticamente el token de autenticación al header "Authorization".
// De esa forma no tenemos que escribirlo manualmente en cada llamada.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        // El formato "Bearer <token>" es el estándar para enviar tokens JWT.
        config.headers.Authorization = `Bearer ${token}`
    }
    // Devolvemos la configuración modificada para que la petición continúe.
    return config
})

// Interceptor de respuestas: se ejecuta cuando llega una respuesta del backend.
// Si la respuesta es un error de autenticación (401 o 403), borramos los datos locales y
// llevamos al usuario a la pantalla de login. Esto cubre el caso de un token vencido.
api.interceptors.response.use(
    (response) => response, // Si todo está bien, devolvemos la respuesta tal cual.
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('token')
            localStorage.removeItem('usuario')
            // Forzamos la redirección al login recargando la página.
            window.location.href = '/login'
        }
        // Rechazamos el error para que el componente que hizo la llamada pueda manejarlo si quiere.
        return Promise.reject(error)
    }
)

// Exportamos la instancia configurada para usarla en toda la app.
export default api
