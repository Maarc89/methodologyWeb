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
        <header className="bg-white shadow p-4 flex justify-between items-center">
            <Link to="/" className="text-xl font-bold">Logo</Link>
            <nav className="space-x-4 relative" ref={dropdownRef}>
                {isAuthenticated ? (
                    <>
                        <button
                            onClick={() => setOpen(!open)}
                            className="text-blue-600 hover:underline focus:outline-none"
                        >
                            Perfil ▼
                        </button>
                        {open && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10">
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        navigate('/settings');
                                    }}
                                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                >
                                    Configuración
                                </button>
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        navigate('/my-assessments');
                                    }}
                                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                >
                                    My Assessments
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
                        <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;
