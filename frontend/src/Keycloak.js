import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'https://172.16.4.40/auth/',
  realm: 'PIM-PAM',
  clientId: 'methodologyWeb',
});

// ?? AÑADE ESTO
window.keycloak = keycloak;

export const initKeycloak = () => {
  return keycloak
    .init({
      onLoad: 'login-required',
      checkLoginIframe: true,
      pkceMethod: 'S256',
      enableLogging: true,
    })
    .then(authenticated => {
      if (!authenticated) console.warn('Usuario no autenticado');

      // ?? AÑADE ESTO TAMBIÉN
      console.log("TOKEN", keycloak.token);

      return keycloak;
    })
    .catch(err => {
      console.error('Error inicializando Keycloak:', err);
      return null;
    });
};

export default keycloak;
