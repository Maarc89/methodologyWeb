/**
 * fetchWithAuth
 * Wrapper de fetch que añade Authorization: Token <token> usando
 * el token guardado en localStorage por el flujo de autenticación de Django.
 * También añade Content-Type: application/json por defecto si se envía body y
 * no se especifica otro Content-Type (y el body no es FormData).
 */
export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn("Usuario no autenticado");
    throw new Error("Usuario no autenticado");
  }

  // Preparar headers: añadir Authorization y conservar los existentes
  const headers = { ...(options.headers || {}) };

  // Si se envía body y no hay Content-Type y el body no es FormData, asumir JSON
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (hasBody && !headers['Content-Type'] && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const authHeaders = {
    Authorization: `Token ${token}`,
    ...headers,
  };

  return fetch(url, {
    ...options,
    headers: authHeaders,
  });
};
