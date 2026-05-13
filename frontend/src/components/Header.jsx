import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import eurecatLogo from '../assets/eurecat-logo.png';
import userAvatar from '../assets/profile-icon.png';
import keycloak from '../Keycloak.js';
import ThemeToggle from './ThemeToggle';
import Button from './ui/Button.jsx';
import IconButton from './ui/IconButton.jsx';

const Header = ({ isAuthenticated }) => {
  const [open, setOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(keycloak.tokenParsed || null);
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

  useEffect(() => {
    if (keycloak.authenticated) {
      keycloak.loadUserInfo().then((info) => {
        setUserInfo((prev) => ({ ...prev, ...info }));
      }).catch((err) => {
        console.error('Error al cargar userInfo:', err);
      });
    }
  }, [isAuthenticated]);

  const isAdmin = () => {
    const parsed = keycloak.tokenParsed || {};
    // busca roles en distintos lugares
    const realmRoles = parsed?.realm_access?.roles || (parsed?.realm_access || {}).roles || [];
    const resourceRoles = parsed?.resource_access || {};
    const hasRealmAdmin = realmRoles.includes('admin') || realmRoles.includes('realm-admin');
    // también revisa roles en resource_access
    let hasResourceAdmin = false;
    Object.values(resourceRoles).forEach(r => { if (r?.roles?.includes('admin')) hasResourceAdmin = true; });
    return hasRealmAdmin || hasResourceAdmin;
  };

  const handleLogout = () => {
    setOpen(false);
    keycloak.logout({ redirectUri: window.location.origin });
  };

  const handleLogin = () => keycloak.login();
  const handleRegister = () => keycloak.register();

  return (
    <header className="header-container">
      <Link to="/" className="logo-text">
        <img src={eurecatLogo} alt="Eurecat" className="logo-image" />
      </Link>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <nav className="nav-container" ref={dropdownRef} aria-label="Menú de usuario">
          {isAuthenticated ? (
            <>
              <IconButton
                onClick={() => setOpen(!open)}
                className="p-0"
                ariaLabel="Abrir menú de perfil"
                size="md"
                variant="ghost"
              >
                <img src={userAvatar} alt="Perfil" className="profile-icon rounded-full" />
              </IconButton>

              {open && (
                <div id="user-menu" className="dropdown-menu" role="menu">
                  <div className="px-4 py-2 text-sm text-gray-600 border-b flex justify-center items-center" role="none">
                    {userInfo?.name || userInfo?.preferred_username || 'Usuario'}
                  </div>

                  <Link to="/settings" onClick={() => setOpen(false)} className="dropdown-item" role="menuitem">Perfil</Link>

                  <Link to="/my-assessments" onClick={() => setOpen(false)} className="dropdown-item" role="menuitem">Mis Evaluaciones</Link>

                  {isAdmin() && (
                    <Link to="/admin/assessments" onClick={() => setOpen(false)} className="dropdown-item" role="menuitem">Evaluaciones (admin)</Link>
                  )}

                  {isAdmin() && (
                    <Link to="/admin/manage-users" onClick={() => setOpen(false)} className="dropdown-item" role="menuitem">Gestionar Usuarios</Link>
                  )}

                  <div className="px-4 py-2">
                    <Button variant="ghost" className="w-full text-left" onClick={handleLogout} role="menuitem">Cerrar Sesión</Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleLogin} className="px-3 py-1">Iniciar Sesión</Button>
              <Button variant="brand" onClick={handleRegister} className="px-3 py-1">Registrarse</Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
