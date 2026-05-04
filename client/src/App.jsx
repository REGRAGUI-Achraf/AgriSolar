import React, { useEffect, useMemo, useState } from 'react';

import Layout from './components/Layout';
import CatalogPage from './pages/CatalogPage';
import ClientsPage from './pages/ClientsPage';
import ProductDashboard from './pages/ProductDashboard';
import SizingPage from './pages/SizingPage';

const normalizeRoute = (value) => {
	const route = String(value || '').replace(/^#/, '').trim();
	return route || 'sizing';
};

export default function App() {
	const routes = useMemo(
		() =>
			[
				{ key: 'sizing', label: 'Dimensionnement', element: <SizingPage /> },
				{ key: 'catalog-view', label: 'Catalogue (vue)', element: <ProductDashboard /> },
				{ key: 'admin-clients', label: 'Admin · Clients', element: <ClientsPage /> },
				{ key: 'admin-catalog', label: 'Admin · Catalogue', element: <CatalogPage /> },
			],
		[],
	);

	const [activeRoute, setActiveRoute] = useState(() => normalizeRoute(window.location.hash));

	useEffect(() => {
		const onHashChange = () => setActiveRoute(normalizeRoute(window.location.hash));
		window.addEventListener('hashchange', onHashChange);
		return () => window.removeEventListener('hashchange', onHashChange);
	}, []);

	const active = routes.find((r) => r.key === activeRoute) ?? routes[0];

	const onNavigate = (key) => {
		window.location.hash = key;
	};

	return (
		<div className="min-h-screen bg-slate-50">
			<Layout routes={routes} activeRoute={active.key} onNavigate={onNavigate} />
			{active.element}
		</div>
	);
}
