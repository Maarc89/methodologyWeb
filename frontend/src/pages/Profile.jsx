import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import { API_BASE } from '../config.js';
import {authFetch, getAuthToken} from '../utils/auth.js';

const Profile = ({onLogout}) => {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            setError('No estás autenticado');
            setLoading(false);
            return;
        }

        authFetch(`${API_BASE}/auth/user/`)
            .then((res) => {
                if (!res.ok) throw new Error(`Error ${res.status}`);
                return res.json();
            })
            .then((data) => {
                setUserInfo(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError('No se pudo cargar la información del usuario.');
                setLoading(false);
            });
    }, []);

    const handleLogoutClick = () => {
        onLogout(); // borra token y actualiza estado
        navigate('/'); // redirige al home
    };

    if (loading) return <p className="p-4">Cargando...</p>;
    if (error) return <p className="p-4 text-red-600">{error}</p>;

    return (
        <div className="p-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Perfil de Usuario</h1>
            <p><strong>Username:</strong> {userInfo.username}</p>
            <p><strong>Email:</strong> {userInfo.email}</p>
            <button
                onClick={handleLogoutClick}
                className="mt-6 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
                Logout
            </button>
        </div>
    );
};

export default Profile;
