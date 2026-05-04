import React, { useEffect, useMemo, useState } from 'react';

import { api } from '../services/api';

const toErrorMessage = (error) => {
	if (!error) return 'Erreur inconnue.';
	if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') return null;
	if (error.code === 'ERR_NETWORK') return 'Impossible de joindre le backend (réseau indisponible).';

	const status = error.response?.status;
	const serverMessage = error.response?.data?.message;
	if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
	if (typeof status === 'number') return `Erreur API (${status}).`;
	if (typeof error.message === 'string' && error.message.trim()) return error.message;
	return 'Erreur inconnue.';
};

const Input = ({ label, ...props }) => (
	<label className="block">
		<span className="text-sm font-medium text-slate-700">{label}</span>
		<input
			{...props}
			className={`mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 ${
				props.className ?? ''
			}`}
		/>
	</label>
);

const PrimaryButton = ({ children, ...props }) => (
	<button
		{...props}
		className={`rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${
			props.className ?? ''
		}`}
	/>
);

const SecondaryButton = ({ children, ...props }) => (
	<button
		{...props}
		className={`rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${
			props.className ?? ''
		}`}
	/>
);

const DangerButton = ({ children, ...props }) => (
	<button
		{...props}
		className={`rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${
			props.className ?? ''
		}`}
	/>
);

const parseFinite = (value) => {
	const n = Number(String(value).replace(',', '.'));
	return Number.isFinite(n) ? n : null;
};

export default function ClientsPage() {
	const [clients, setClients] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [editingId, setEditingId] = useState(null);
	const [form, setForm] = useState({ name: '', phone: '', latitude: '', longitude: '' });
	const [saving, setSaving] = useState(false);

	const sortedClients = useMemo(() => {
		return [...clients].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
	}, [clients]);

	const resetForm = () => {
		setEditingId(null);
		setForm({ name: '', phone: '', latitude: '', longitude: '' });
	};

	const load = async (signal) => {
		setLoading(true);
		setError(null);
		try {
			const items = await api.getClients({ signal });
			setClients(Array.isArray(items) ? items : []);
		} catch (err) {
			const msg = toErrorMessage(err);
			if (msg) setError(msg);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const controller = new AbortController();
		load(controller.signal);
		return () => controller.abort();
	}, []);

	const onEdit = (client) => {
		setEditingId(client.id);
		setForm({
			name: client.name ?? '',
			phone: client.phone ?? '',
			latitude: String(client.latitude ?? ''),
			longitude: String(client.longitude ?? ''),
		});
	};

	const onSubmit = async (e) => {
		e.preventDefault();
		setError(null);

		const latitude = parseFinite(form.latitude);
		const longitude = parseFinite(form.longitude);
		if (!form.name.trim()) return setError('Le nom est obligatoire.');
		if (latitude === null || longitude === null) return setError('Latitude/Longitude doivent être des nombres.');

		setSaving(true);
		try {
			const payload = {
				name: form.name.trim(),
				phone: form.phone.trim() ? form.phone.trim() : null,
				latitude,
				longitude,
			};

			if (editingId) {
				const updated = await api.updateClient(editingId, payload);
				setClients((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
			} else {
				const created = await api.createClient(payload);
				setClients((prev) => [created, ...prev]);
			}
			resetForm();
		} catch (err) {
			const msg = toErrorMessage(err);
			if (msg) setError(msg);
		} finally {
			setSaving(false);
		}
	};

	const onDelete = async (client) => {
		const ok = window.confirm(`Supprimer le client "${client.name}" ?`);
		if (!ok) return;

		setError(null);
		setSaving(true);
		try {
			await api.deleteClient(client.id);
			setClients((prev) => prev.filter((c) => c.id !== client.id));
			if (editingId === client.id) resetForm();
		} catch (err) {
			const msg = toErrorMessage(err);
			if (msg) setError(msg);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="mx-auto max-w-6xl p-6">
			<header className="mb-6">
				<h1 className="text-2xl font-semibold text-slate-900">Admin · Clients</h1>
				<p className="mt-1 text-sm text-slate-600">Créer, modifier et supprimer des clients (coordonnées incluses).</p>
			</header>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Modifier un client' : 'Nouveau client'}</h2>
						{editingId ? (
							<SecondaryButton type="button" onClick={resetForm} disabled={saving}>
								Annuler
							</SecondaryButton>
						) : null}
					</div>

					<form onSubmit={onSubmit} className="space-y-3">
						<Input
							label="Nom"
							value={form.name}
							onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
							placeholder="Ferme El Amine"
							required
						/>
						<Input
							label="Téléphone (optionnel)"
							value={form.phone}
							onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
							placeholder="+212..."
						/>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<Input
								label="Latitude"
								value={form.latitude}
								onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
								placeholder="34.02"
								required
							/>
							<Input
								label="Longitude"
								value={form.longitude}
								onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
								placeholder="-6.83"
								required
							/>
						</div>

						{error ? (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
						) : null}

						<div className="flex items-center gap-3">
							<PrimaryButton type="submit" disabled={saving}>
								{saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Créer'}
							</PrimaryButton>
							<SecondaryButton type="button" onClick={() => load()} disabled={loading || saving}>
								Rafraîchir
							</SecondaryButton>
						</div>
					</form>
				</section>

				<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-slate-900">Clients</h2>
						<span className="text-sm text-slate-500">{sortedClients.length}</span>
					</div>

					{loading ? (
						<div className="py-10 text-center text-sm text-slate-600">Chargement…</div>
					) : sortedClients.length === 0 ? (
						<div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
							Aucun client.
						</div>
					) : (
						<div className="overflow-hidden rounded-lg border border-slate-200">
							<table className="min-w-full divide-y divide-slate-200 text-sm">
								<thead className="bg-slate-50">
									<tr>
										<th className="px-3 py-2 text-left font-semibold text-slate-700">Nom</th>
										<th className="px-3 py-2 text-left font-semibold text-slate-700">Coordonnées</th>
										<th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200 bg-white">
									{sortedClients.map((c) => (
										<tr key={c.id} className={c.id === editingId ? 'bg-slate-50' : ''}>
											<td className="px-3 py-2">
												<div className="font-medium text-slate-900">{c.name}</div>
												{c.phone ? <div className="text-xs text-slate-500">{c.phone}</div> : null}
											</td>
											<td className="px-3 py-2 text-slate-700">
												<div className="font-mono text-xs">{Number(c.latitude).toFixed(5)}</div>
												<div className="font-mono text-xs">{Number(c.longitude).toFixed(5)}</div>
											</td>
											<td className="px-3 py-2 text-right">
												<div className="flex justify-end gap-2">
													<SecondaryButton type="button" onClick={() => onEdit(c)} disabled={saving}>
														Éditer
													</SecondaryButton>
													<DangerButton type="button" onClick={() => onDelete(c)} disabled={saving}>
														Supprimer
													</DangerButton>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
