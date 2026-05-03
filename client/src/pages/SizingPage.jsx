import React, { useEffect, useState } from 'react';

import SizingStepper from '../components/SizingStepper';
import { apiClient } from '../services/api';

const normalizeClients = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.clients)) return payload.clients;
	return [];
};

const isMockSizingEnabled = () =>
	import.meta.env.DEV && String(import.meta.env.VITE_MOCK_SIZING).toLowerCase() === 'true';

const buildMockResult = (payload) => {
	const currency = 'MAD';
	const initialInvestment = 148000;
	const solarAnnualCost = 2500;
	const dieselAnnualCost = 26000;
	const horizonYears = 10;

	const roiSeries = Array.from({ length: horizonYears + 1 }, (_, year) => ({
		year,
		solar: initialInvestment + year * solarAnnualCost,
		diesel: year * dieselAnnualCost,
	}));

	return {
		panelCount: 18,
		pumpModel: 'Pompe immergée 2.2kW - 10m³/h',
		basinVolume: 120,
		financial: {
			currency,
			totalHT: 148000,
			totalTTC: 159000,
			initialInvestment,
		},
		materials: [
			{ name: 'Panneau PV 550W Mono', brand: 'Jinko', category: 'PANEL', quantity: 18, unitPrice: 1850 },
			{ name: 'Variateur / MPPT 22kW', brand: 'INVT', category: 'INVERTER', quantity: 1, unitPrice: 38000 },
			{ name: 'Pompe immergée 2.2kW', brand: 'Pedrollo', category: 'PUMP', quantity: 1, unitPrice: 16500 },
			{ name: 'Câbles + protections', brand: '—', category: 'ACCESSORY', quantity: 1, unitPrice: 9000 },
		],
		roi: {
			series: roiSeries,
			solarAnnualCost,
			dieselAnnualCost,
			solarInitialInvestment: initialInvestment,
		},
		inputs: payload,
	};
};

const mockRunSizing = async (payload) => {
	await new Promise((r) => setTimeout(r, 600));
	return buildMockResult(payload);
};

export default function SizingPage() {
	const [clients, setClients] = useState([]);
	const mockSizing = isMockSizingEnabled();

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

			<SizingStepper clients={clients} onRunSizing={mockSizing ? mockRunSizing : undefined} />
		</div>
	);
}
