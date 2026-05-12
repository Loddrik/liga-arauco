import axios from 'axios';

// En dev usamos el proxy de Vite ('/api' → localhost:3000).
// En prod inyectamos VITE_API_URL en build time (ej: https://api.liga-arauco.app/api).
const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const http = axios.create({ baseURL });
