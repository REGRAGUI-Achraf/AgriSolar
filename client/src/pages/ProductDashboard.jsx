import React from 'react';

import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
  </div>
);

const ErrorBanner = ({ message }) => (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
    <p className="font-semibold">Backend injoignable</p>
    <p className="mt-1 text-sm">{message}</p>
  </div>
);

const EmptyState = () => (
  <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-700">
    <p className="font-semibold">Aucun produit trouvé</p>
    <p className="mt-1 text-sm text-slate-600">
      Vérifie que le backend expose bien <span className="font-mono">GET /api/catalog</span>.
    </p>
  </div>
);

export default function ProductDashboard() {
  const { products, loading, error } = useProducts();

  return (
    <div className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Tableau de bord produits</h1>
        <p className="mt-1 text-sm text-slate-600">Catalogue matériel (panneaux, pompes, onduleurs, accessoires)</p>
      </header>

      {loading ? <Spinner /> : null}

      {!loading && error ? <ErrorBanner message={error} /> : null}

      {!loading && !error ? (
        products.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id ?? `${product.name}-${product.brand ?? ''}`} product={product} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
