import axios from 'axios';

const resolveBaseUrl = () => {
  const envBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_SERVER_URL;

  if (envBaseUrl) return envBaseUrl;

  // Sensible defaults:
  // - In dev, assume the backend runs locally.
  // - In production, prefer same-origin (empty baseURL).
  return import.meta.env.DEV ? 'http://localhost:3001' : '';
};

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('agrisolar.authToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('agrisolar.authToken');
      localStorage.removeItem('agrisolar.authUser');
    }
    return Promise.reject(error);
  },
);

const safeJsonObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
  }
  return {};
};

const normalizeProduct = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  return {
    ...raw,
    specifications: safeJsonObject(raw.specifications),
  };
};

/**
 * Récupère la liste des produits (matériel) depuis le backend.
 *
 * Offline-ready: gardez la logique réseau centralisée ici.
 * Plus tard, on pourra ajouter un cache IndexedDB (read-through / stale-while-revalidate)
 * sans modifier les composants UI.
 *
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Array>} Liste de produits normalisés.
 */
export const getProducts = async (options = {}) => {
  const { signal } = options;

  // Endpoint proposé dans le README: GET /api/catalog
  const response = await apiClient.get('/api/catalog', { signal });

  const payload = response?.data;
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.products) ? payload.products : [];

  return items.map(normalizeProduct).filter(Boolean);
};

export const getClients = async (options = {}) => {
  const { signal } = options;
  const response = await apiClient.get('/api/clients', { signal });
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.clients)) return payload.clients;
  return [];
};

export const createClient = async (input) => {
  const response = await apiClient.post('/api/clients', input);
  return response?.data;
};

export const updateClient = async (id, input) => {
  const response = await apiClient.put(`/api/clients/${encodeURIComponent(String(id))}`, input);
  return response?.data;
};

export const deleteClient = async (id) => {
  await apiClient.delete(`/api/clients/${encodeURIComponent(String(id))}`);
};

export const createProduct = async (input) => {
  const response = await apiClient.post('/api/catalog', input);
  return normalizeProduct(response?.data);
};

export const updateProduct = async (id, input) => {
  const response = await apiClient.put(`/api/catalog/${encodeURIComponent(String(id))}`, input);
  return normalizeProduct(response?.data);
};

export const deleteProduct = async (id) => {
  await apiClient.delete(`/api/catalog/${encodeURIComponent(String(id))}`);
};

export const getQuotes = async (options = {}) => {
  const { signal } = options;
  const response = await apiClient.get('/api/quotes', { signal });
  const payload = response?.data;
  return Array.isArray(payload) ? payload : [];
};

export const getQuoteById = async (id, options = {}) => {
  const { signal } = options;
  const response = await apiClient.get(`/api/quotes/${encodeURIComponent(String(id))}`, { signal });
  return response?.data ?? null;
};

export const createQuote = async (input) => {
  const response = await apiClient.post('/api/quotes', input);
  return response?.data;
};

export const downloadQuotePdf = async (id) => {
  const response = await apiClient.get(`/api/quotes/${encodeURIComponent(String(id))}/pdf`, {
    responseType: 'blob',
  });
  return response?.data ?? null;
};

export const authLogin = async ({ email, password }) => {
  const response = await apiClient.post('/api/auth/login', { email, password });
  return response?.data;
};

export const authMe = async () => {
  const response = await apiClient.get('/api/auth/me');
  return response?.data;
};

export const setAuthSession = ({ token, user }) => {
  if (token) localStorage.setItem('agrisolar.authToken', token);
  if (user) localStorage.setItem('agrisolar.authUser', JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem('agrisolar.authToken');
  localStorage.removeItem('agrisolar.authUser');
};

export const getStoredAuthSession = () => {
  const token = localStorage.getItem('agrisolar.authToken');
  const userRaw = localStorage.getItem('agrisolar.authUser');
  let user = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      user = null;
    }
  }
  return { token, user };
};

/**
 * Façade service (prête pour ajouter du cache offline).
 *
 * Exemple d'usage: `api.getProducts()`
 */
export const api = {
  getProducts,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  createProduct,
  updateProduct,
  deleteProduct,
  getQuotes,
  getQuoteById,
  createQuote,
  downloadQuotePdf,
  authLogin,
  authMe,
  setAuthSession,
  clearAuthSession,
  getStoredAuthSession,
};
