// src/components/Header.jsx
import {Link} from 'react-router-dom';

const Header = ({isAuthenticated}) => {
    return (
        <header className="bg-white shadow p-4 flex justify-between items-center">
            <Link to="/" className="text-xl font-bold">MiLogo</Link>
            <nav className="space-x-4">
                {isAuthenticated ? (
                    <Link to="/profile" className="text-blue-600 hover:underline">Perfil</Link>
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
