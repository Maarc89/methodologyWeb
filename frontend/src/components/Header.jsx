import {Link, useNavigate} from 'react-router-dom';
import {useState, useRef, useEffect} from 'react';
import eurecatLogo from '../assets/eurecat-logo.png';
import userAvatar from '../assets/profile-icon.png';


const Header = ({isAuthenticated, onLogout}) => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const dropdownRef = useRef();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setOpen(false);
        onLogout()
        navigate('/login');
    };

    return (
        <header className="header-container">
            <Link to="/" className="logo-text">
                <img src={eurecatLogo} alt="Eurecat Logo" className="logo-image"/>
            </Link>
            <nav className="nav-container" ref={dropdownRef}>
                {isAuthenticated ? (
                    <>
                        <button
                            onClick={() => setOpen(!open)}
                            className="btn-profile"
                        >
                            <img
                                src={userAvatar}
                                alt="Perfil ▼"
                                className="profile-icon"
                            />
                        </button>
                        {open && (
                            <div className="dropdown-menu">
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        navigate('/settings');
                                    }}
                                    className="dropdown-item rounded-t-xl"
                                >
                                    Configuración
                                </button>
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        navigate('/my-assessments');
                                    }}
                                    className="dropdown-item"
                                >
                                    Mis Evaluaciones
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="dropdown-item rounded-b-xl"
                                >
                                    Cerrar Sesión
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <Link to="/login"
                              className="font-bold text-blau hover:bg-blue-100 hover:text-blue-800 px-3 py-1 rounded-xl transition duration-200">Iniciar
                            Sesión</Link>
                        <Link to="/register"
                              className="font-bold text-blau hover:bg-blue-100 hover:text-blue-800 px-3 py-1 rounded-xl transition duration-200">Registrarse</Link>
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;
