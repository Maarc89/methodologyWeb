import React, {useState} from 'react';
import {useNavigate, Link} from 'react-router-dom';
import {API_BASE} from "../config.js";

const Login = ({onLoginSuccess}) => {
    const [credentials, setCredentials] = useState({username: '', password: ''});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_BASE}/auth/login/`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(credentials),
            });
            const data = await res.json();

            if (res.ok && data.token) {
                onLoginSuccess(data.token);
                navigate('/');
                return;
            }

            setErrorMsg(data.detail || 'Inicio de sesión fallido');
        } catch {
            setErrorMsg('Error en la petición de inicio de sesión');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Inicia Sesión</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMsg && <p className="text-sm text-red-600 text-center">{errorMsg}</p>}
                    <input
                        type="text"
                        placeholder="Usuario"
                        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={credentials.username}
                        onChange={e => setCredentials({...credentials, username: e.target.value})}
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={credentials.password}
                        onChange={e => setCredentials({...credentials, password: e.target.value})}
                    />
                    <div className="text-center">
                        <Link to="/reset-password" className="text-sm text-blau hover:underline">
                            ¿Has olvidado la contraseña?
                        </Link>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blau hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition duration-200"
                    >
                        {isSubmitting ? 'Iniciando sesión...' : 'Continuar'}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <span className="text-sm text-gray-600">¿No tienes una cuenta? </span>
                    <Link to="/register" className="text-sm text-blau hover:underline font-medium">
                        Crear una cuenta
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
