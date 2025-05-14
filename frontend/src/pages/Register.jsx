import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const [credentials, setCredentials] = useState({ username: '', email: '', password: '' });
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        fetch('http://localhost:8001/api/auth/register/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        })
            .then(res => res.json())
            .then(data => {
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    navigate('/');
                } else {
                    alert('Error en el registro');
                }
            })
            .catch(err => console.error('Error:', err));
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Registro</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Nombre de usuario"
                    className="border p-2 w-full"
                    value={credentials.username}
                    onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                />
                <input
                    type="email"
                    placeholder="Correo electrónico"
                    className="border p-2 w-full"
                    value={credentials.email}
                    onChange={e => setCredentials({ ...credentials, email: e.target.value })}
                />
                <input
                    type="password"
                    placeholder="Contraseña"
                    className="border p-2 w-full"
                    value={credentials.password}
                    onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Registrar</button>
            </form>
        </div>
    );
};

export default Register;
