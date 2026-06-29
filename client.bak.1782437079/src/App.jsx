import React, { useEffect, useMemo, useState } from 'react';

import Layout from './components/Layout';
import CatalogPage from './pages/CatalogPage';
import ClientsPage from './pages/ClientsPage';
import LoginPage from './pages/LoginPage';
import QuotePage from './pages/QuotePage';
import ProductDashboard from './pages/ProductDashboard';
import SizingPage from './pages/SizingPage';
import { api } from './services/api';

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
				{ key: 'quotes', label: 'Devis', element: <QuotePage /> },
				{ key: 'admin-clients', label: 'Admin · Clients', element: <ClientsPage /> },
				{ key: 'admin-catalog', label: 'Admin · Catalogue', element: <CatalogPage /> },
			],
		[],
	);

	const [session, setSession] = useState(() => api.getStoredAuthSession());
	const [activeRoute, setActiveRoute] = useState(() => normalizeRoute(window.location.hash));
	const isAuthenticated = Boolean(session?.token);


	useEffect(() => {
		const onHashChange = () => setActiveRoute(normalizeRoute(window.location.hash));
		window.addEventListener('hashchange', onHashChange);
		return () => window.removeEventListener('hashchange', onHashChange);
	}, []);

	useEffect(() => {
		const bootstrap = async () => {
			if (!session?.token) return;
			try {
				const response = await api.authMe();
				const user = response?.user ?? null;
				if (user) {
					api.setAuthSession({ token: session.token, user });
					setSession({ token: session.token, user });
				}
			} catch {
				api.clearAuthSession();
				setSession({ token: null, user: null });
			}
		};
		bootstrap();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const active = routes.find((r) => r.key === activeRoute) ?? routes[0];
	const protectedRoute = isAuthenticated ? active : null;

	const onNavigate = (key) => {
		window.location.hash = key;
	};

	const onLogin = ({ token, user }) => {
		api.setAuthSession({ token, user });
		setSession({ token, user });
		window.location.hash = 'sizing';
	};

	const onLogout = () => {
		api.clearAuthSession();
		setSession({ token: null, user: null });
		window.location.hash = 'login';
	};

	return (
		<div className="min-h-screen bg-slate-50">
			{isAuthenticated ? (
				<>
					<Layout routes={routes} activeRoute={active.key} onNavigate={onNavigate} user={session.user} onLogout={onLogout} />
					{protectedRoute?.element}
				</>
			) : (
				<>
					<Layout routes={[{ key: 'login', label: 'Connexion', element: null }]} activeRoute="login" onNavigate={onNavigate} />
					<LoginPage onLogin={onLogin} />
				</>
			)}
		</div>
	);
}
