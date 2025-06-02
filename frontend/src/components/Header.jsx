import {Link, useNavigate} from 'react-router-dom';
import {useState, useRef, useEffect} from 'react';

const Header = ({isAuthenticated}) => {
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
        navigate('/login');
        setOpen(false);
    };

    return (
        <header className="header-container">
            <Link to="/" className="logo-text">Logo</Link>
            <nav className="nav-container" ref={dropdownRef}>
                {isAuthenticated ? (
                    <>
                        <button
                            onClick={() => setOpen(!open)}
                            className="btn-profile"
                        >
                            Perfil ▼
                        </button>
                        {open && (
                            <div className="dropdown-menu">
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        navigate('/settings');
                                    }}
                                    className="dropdown-item"
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
                                    Mis Assessments
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="dropdown-item text-red-600"
                                >
                                    Cerrar Sesión
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <Link to="/login" className="btn-link">Login</Link>
                        <Link to="/register" className="btn-link">Register</Link>
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;
