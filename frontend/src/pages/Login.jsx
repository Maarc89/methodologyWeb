import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';

const Login = ({onLoginSuccess}) => {
    const [credentials, setCredentials] = useState({username: '', password: ''});
    const navigate = useNavigate();

    const handleSubmit = e => {
        e.preventDefault();
        fetch('http://localhost:8001/api/auth/login/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(credentials),
        })
            .then(res => res.json())
            .then(data => {
                if (data.token) {
                    onLoginSuccess(data.token);  // <-- Aquí llamas a la prop
                    navigate('/');
                } else {
                    alert('Login fallido');
                }
            })
            .catch(() => alert('Error en la petición de login'));
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Iniciar Sesión</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Username"
                    className="border p-2 w-full"
                    value={credentials.username}
                    onChange={e => setCredentials({...credentials, username: e.target.value})}
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="border p-2 w-full"
                    value={credentials.password}
                    onChange={e => setCredentials({...credentials, password: e.target.value})}
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Login</button>
            </form>
        </div>
    );
};

export default Login;
