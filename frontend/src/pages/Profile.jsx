import keycloak from '../Keycloak.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { Loading } from '../components/ui/States.jsx';

const Profile = ({ userInfo }) => {
  if (!keycloak.authenticated) return <p className="container-main">No estás autenticado.</p>;
  if (!userInfo) return <Loading label="Cargando información del perfil…" />;

  const openAccountConsole = () => {
    try {
      const base = (keycloak && keycloak.authServerUrl) ? keycloak.authServerUrl : 'https://172.16.4.40/auth/';
      const realm = (keycloak && keycloak.realm) ? keycloak.realm : 'PIM-PAM';
      // Abrir el panel de gestión de cuenta (donde el usuario puede cambiar contraseña, configurar 2FA, etc.)
      window.location.href = `${base}realms/${realm}/account/`;
    } catch (e) {
      console.error('No se pudo abrir la gestión de cuenta:', e);
      if (typeof keycloak.accountManagement === 'function') keycloak.accountManagement();
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <Card className="p-4">
        <h1 className="text-2xl font-bold mb-4">Perfil de Usuario</h1>
        <p><strong>Nombre:</strong> {userInfo.name}</p>
        <p><strong>Usuario:</strong> {userInfo.preferred_username}</p>
        <p><strong>Correo electrónico:</strong> {userInfo.email}</p>

        <div className="mt-6 space-y-3">
          {/* Abrir panel de cuenta (gestión completa) */}
          <Button variant="muted" className="w-full" onClick={openAccountConsole}>Gestionar cuenta</Button>
          <Button variant="danger" className="w-full" onClick={() => keycloak.logout({ redirectUri: window.location.origin })}>Cerrar Sesión</Button>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
