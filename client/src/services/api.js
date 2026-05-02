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
  return import.meta.env.DEV ? 'http://localhost:3000' : '';
};

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    Accept: 'application/json',
  },
});

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

/**
 * Façade service (prête pour ajouter du cache offline).
 *
 * Exemple d'usage: `api.getProducts()`
 */
export const api = {
  getProducts,
};
