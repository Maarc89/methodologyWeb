import keycloak from "../Keycloak.js";

/**
 * fetchWithAuth
 * Wrapper de fetch que añade Authorization: Bearer <token>
 * y refresca token si es necesario antes de hacer la petición.
 * También añade Content-Type: application/json por defecto si se envía body y
 * no se especifica otro Content-Type (y el body no es FormData).
 */
export const fetchWithAuth = async (url, options = {}) => {
  if (!keycloak.authenticated) {
    console.warn("Usuario no autenticado en Keycloak");
    throw new Error("Usuario no autenticado");
  }

  // Refrescar token si falta menos de 60s para expirar
  await keycloak.updateToken(60).catch((err) => {
    console.error("Error refrescando token:", err);
    throw new Error("No se pudo refrescar token");
  });

  // Preparar headers: añadir Authorization y conservar los existentes
  const headers = { ...(options.headers || {}) };

  // Si se envía body y no hay Content-Type y el body no es FormData, asumir JSON
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (hasBody && !headers['Content-Type'] && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const authHeaders = {
    Authorization: `Bearer ${keycloak.token}`,
    ...headers,
  };

  return fetch(url, {
    ...options,
    headers: authHeaders,
  });
};
