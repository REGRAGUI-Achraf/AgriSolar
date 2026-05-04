import React, { useEffect, useState } from 'react';

import SizingStepper from '../components/SizingStepper';
import { apiClient } from '../services/api';

const normalizeClients = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.clients)) return payload.clients;
	return [];
};

export default function SizingPage() {
	const [clients, setClients] = useState([]);

	useEffect(() => {
		const controller = new AbortController();

		const run = async () => {
			try {
				const response = await apiClient.get('/api/clients', { signal: controller.signal });
				setClients(normalizeClients(response?.data));
			} catch {
				// Keep an empty list: SizingStepper falls back to manual client name.
				setClients([]);
			}
		};

		run();

		return () => {
			controller.abort();
		};
	}, []);

	return (
		<div className="mx-auto max-w-6xl p-6">
			<header className="mb-6">
				<h1 className="text-2xl font-semibold text-slate-900">Dimensionnement</h1>
				<p className="mt-1 text-sm text-slate-600">
					Formulaire multi-étapes pour guider la saisie et valider les données au fil des étapes.
				</p>
			</header>

			<SizingStepper clients={clients} />
		</div>
	);
}
