import { useEffect, useState } from 'react';

import { api } from '../services/api';

const toErrorMessage = (error) => {
  if (!error) return 'Erreur inconnue.';

  // axios cancellation / AbortController
  if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
    return null;
  }

  // axios network errors
  if (error.code === 'ERR_NETWORK') {
    return 'Impossible de joindre le backend (réseau indisponible).';
  }

  const status = error.response?.status;
  const serverMessage = error.response?.data?.message;

  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
  if (typeof status === 'number') return `Erreur API (${status}).`;
  if (typeof error.message === 'string' && error.message.trim()) return error.message;

  return 'Erreur inconnue.';
};

/**
 * Hook de récupération du catalogue produits.
 *
 * @returns {{ products: Array, loading: boolean, error: string | null }}
 */
export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getProducts({ signal: controller.signal });
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (controller.signal.aborted) return;

        const message = toErrorMessage(err);
        if (message) setError(message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();

    return () => {
      controller.abort();
    };
  }, []);

  return { products, loading, error };
};
