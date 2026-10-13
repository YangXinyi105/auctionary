// Use the local API during Vite development and the current origin in production.
export const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3334' : '');

export const apiUrl = (path) => `${API}${path}`;
