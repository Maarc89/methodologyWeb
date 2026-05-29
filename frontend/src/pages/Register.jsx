import React, {useState} from 'react';
import {useNavigate, Link} from 'react-router-dom';
import {API_BASE} from "../config.js";

const Register = ({onRegisterSuccess}) => {
    const [credentials, setCredentials] = useState({
        username: '',
        email: '',
        password: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_BASE}/auth/register/`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(credentials),
            });
            const data = await res.json();

            if (res.ok && data.token) {
                onRegisterSuccess(data.token);
                navigate('/');
                return;
            }

            setErrorMsg(data.detail || 'Error en el registro');
        } catch {
            setErrorMsg('Error en la petición de registro');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Crear una cuenta</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMsg && <p className="text-sm text-red-600 text-center">{errorMsg}</p>}
                    <input
                        type="text"
                        placeholder="Nombre de usuario"
                        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={credentials.username}
                        onChange={e => setCredentials({...credentials, username: e.target.value})}
                    />
                    <input
                        type="email"
                        placeholder="Correo electrónico"
                        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={credentials.email}
                        onChange={e => setCredentials({...credentials, email: e.target.value})}
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={credentials.password}
                        onChange={e => setCredentials({...credentials, password: e.target.value})}
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blau hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition duration-200"
                    >
                        {isSubmitting ? 'Registrando...' : 'Registrar'}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <span className="text-sm text-gray-600">¿Ya tienes una cuenta? </span>
                    <Link to="/login" className="text-sm text-blau hover:underline font-medium">
                        Iniciar sesión
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
