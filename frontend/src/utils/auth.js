const AUTH_TOKEN_KEY = 'token';

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const hasAuthToken = () => Boolean(getAuthToken());

export const setAuthToken = (token) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const authHeaders = (headers = {}) => {
    const token = getAuthToken();
    return token ? {...headers, Authorization: `Token ${token}`} : {...headers};
};

export const authFetch = (url, init = {}) => {
    const {headers, ...rest} = init;
    return fetch(url, {
        ...rest,
        headers: authHeaders(headers),
    });
};

export const authAxiosConfig = (config = {}) => {
    const {headers, ...rest} = config;
    return {
        ...rest,
        headers: authHeaders(headers),
    };
};
