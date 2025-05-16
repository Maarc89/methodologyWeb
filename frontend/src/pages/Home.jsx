import React, {useEffect, useState, useRef} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import Login from './Login';
import Register from './Register';

const Home = () => {
    const [assessments, setAssessments] = useState([]);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [showLogin, setShowLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const menuRef = useRef();

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchAssessments = () => {
        if (!token) return;

        setLoading(true);
        fetch('http://localhost:8001/api/assessments/', {
            headers: {
                'Authorization': `Token ${token}`,
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error ${response.status}`);
                }
                return response.json();
            })
            .then(data => setAssessments(data))
            .catch(error => {
                console.error('Error:', error);
                setAssessments([]);
                setToken(null);
                localStorage.removeItem('token');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAssessments();
    }, [token]);

    const handleLoginSuccess = (newToken) => {
        setToken(newToken);
        localStorage.setItem('token', newToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setAssessments([]);
        setMenuOpen(false);
        navigate('/');
    };

    if (!token) {
        return (
            <div className="p-4 max-w-md mx-auto">
                <h1 className="text-2xl font-bold mb-4">Bienvenido</h1>
                <div className="mb-4">
                    <button
                        className={`mr-4 px-4 py-2 ${
                            showLogin ? 'bg-blue-500 text-white' : 'bg-gray-200'
                        }`}
                        onClick={() => setShowLogin(true)}
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        className={`px-4 py-2 ${
                            !showLogin ? 'bg-blue-500 text-white' : 'bg-gray-200'
                        }`}
                        onClick={() => setShowLogin(false)}
                    >
                        Registrarse
                    </button>
                </div>
                {showLogin ? (
                    <Login onLoginSuccess={handleLoginSuccess}/>
                ) : (
                    <Register onRegisterSuccess={handleLoginSuccess}/>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 max-w-3xl mx-auto relative">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Assessments</h1>

                {/* Icono perfil y menú */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((open) => !open)}
                        className="focus:outline-none"
                        aria-label="Abrir menú de usuario"
                    >
                        {/* Aquí puedes poner un SVG o emoji */}
                        <span className="text-2xl cursor-pointer select-none">👤</span>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-50">
                            <Link
                                to="/profile"
                                className="block px-4 py-2 hover:bg-gray-100"
                                onClick={() => setMenuOpen(false)}
                            >
                                Perfil
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading && <p>Cargando...</p>}
            {!loading && assessments.length === 0 && (
                <p>No hay assessments disponibles.</p>
            )}
            <ul className="space-y-2">
                {assessments.map((assessment) => (
                    <li
                        key={assessment.id}
                        className="p-4 border rounded shadow-sm hover:bg-gray-100"
                    >
                        <Link to={`/assessment/${assessment.id}`} className="text-blue-600">
                            {assessment.title}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Home;
