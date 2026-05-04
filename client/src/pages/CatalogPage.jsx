import React, { useEffect, useMemo, useState } from 'react';

import { api } from '../services/api';

const CATEGORIES = [
	{ value: 'PANEL', label: 'PANEL' },
	{ value: 'PUMP', label: 'PUMP' },
	{ value: 'INVERTER', label: 'INVERTER' },
	{ value: 'ACCESSORY', label: 'ACCESSORY' },
];

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

const TextArea = ({ label, ...props }) => (
	<label className="block">
		<span className="text-sm font-medium text-slate-700">{label}</span>
		<textarea
			{...props}
			className={`mt-1 min-h-32 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 ${
				props.className ?? ''
			}`}
		/>
	</label>
);

const Select = ({ label, children, ...props }) => (
	<label className="block">
		<span className="text-sm font-medium text-slate-700">{label}</span>
		<select
			{...props}
			className={`mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 ${
				props.className ?? ''
			}`}
		>
			{children}
		</select>
	</label>
);

const PrimaryButton = (props) => (
	<button
		{...props}
		className={`rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${
			props.className ?? ''
		}`}
	/>
);

const SecondaryButton = (props) => (
	<button
		{...props}
		className={`rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${
			props.className ?? ''
		}`}
	/>
);

const DangerButton = (props) => (
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

const toJsonText = (value) => {
	if (!value || typeof value !== 'object') return '{\n  \n}';
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return '{\n  \n}';
	}
};

export default function CatalogPage() {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [editingId, setEditingId] = useState(null);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({
		name: '',
		brand: '',
		category: 'PANEL',
		price: '',
		specificationsText: '{\n  \n}',
	});

	const sortedProducts = useMemo(() => {
		return [...products].sort((a, b) => {
			const c = String(a.category || '').localeCompare(String(b.category || ''));
			if (c !== 0) return c;
			return String(a.name || '').localeCompare(String(b.name || ''));
		});
	}, [products]);

	const resetForm = () => {
		setEditingId(null);
		setForm({ name: '', brand: '', category: 'PANEL', price: '', specificationsText: '{\n  \n}' });
	};

	const load = async (signal) => {
		setLoading(true);
		setError(null);
		try {
			const items = await api.getProducts({ signal });
			setProducts(Array.isArray(items) ? items : []);
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

	const onEdit = (product) => {
		setEditingId(product.id);
		setForm({
			name: product.name ?? '',
			brand: product.brand ?? '',
			category: String(product.category ?? 'PANEL').toUpperCase(),
			price: String(product.price ?? ''),
			specificationsText: toJsonText(product.specifications),
		});
	};

	const parseSpecifications = () => {
		const txt = form.specificationsText;
		if (!txt || !String(txt).trim()) return {};
		try {
			const parsed = JSON.parse(txt);
			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
				return { __error: 'specifications doit être un objet JSON (pas un tableau).' };
			}
			return parsed;
		} catch {
			return { __error: 'specifications JSON invalide.' };
		}
	};

	const onSubmit = async (e) => {
		e.preventDefault();
		setError(null);

		if (!form.name.trim()) return setError('Le nom est obligatoire.');
		const price = parseFinite(form.price);
		if (price === null || price < 0) return setError('Le prix doit être un nombre >= 0.');

		const specs = parseSpecifications();
		if (specs && typeof specs === 'object' && specs.__error) return setError(specs.__error);

		setSaving(true);
		try {
			const payload = {
				name: form.name.trim(),
				brand: form.brand.trim() ? form.brand.trim() : null,
				category: form.category,
				price,
				specifications: specs,
			};

			if (editingId) {
				const updated = await api.updateProduct(editingId, payload);
				setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
			} else {
				const created = await api.createProduct(payload);
				setProducts((prev) => [created, ...prev]);
			}
			resetForm();
		} catch (err) {
			const msg = toErrorMessage(err);
			if (msg) setError(msg);
		} finally {
			setSaving(false);
		}
	};

	const onDelete = async (product) => {
		const ok = window.confirm(`Supprimer le produit "${product.name}" ?`);
		if (!ok) return;

		setError(null);
		setSaving(true);
		try {
			await api.deleteProduct(product.id);
			setProducts((prev) => prev.filter((p) => p.id !== product.id));
			if (editingId === product.id) resetForm();
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
				<h1 className="text-2xl font-semibold text-slate-900">Admin · Catalogue</h1>
				<p className="mt-1 text-sm text-slate-600">Créer, modifier et supprimer les produits (JSON specs inclus).</p>
			</header>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Modifier un produit' : 'Nouveau produit'}</h2>
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
							placeholder="Panneau 550W"
							required
						/>
						<Input
							label="Marque (optionnel)"
							value={form.brand}
							onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
							placeholder="Jinko"
						/>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<Select
								label="Catégorie"
								value={form.category}
								onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
							>
								{CATEGORIES.map((c) => (
									<option key={c.value} value={c.value}>
										{c.label}
									</option>
								))}
							</Select>
							<Input
								label="Prix"
								value={form.price}
								onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
								placeholder="1234"
								required
							/>
						</div>

						<TextArea
							label="Spécifications (JSON)"
							value={form.specificationsText}
							onChange={(e) => setForm((p) => ({ ...p, specificationsText: e.target.value }))}
							spellCheck={false}
						/>

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
						<h2 className="text-lg font-semibold text-slate-900">Produits</h2>
						<span className="text-sm text-slate-500">{sortedProducts.length}</span>
					</div>

					{loading ? (
						<div className="py-10 text-center text-sm text-slate-600">Chargement…</div>
					) : sortedProducts.length === 0 ? (
						<div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
							Aucun produit.
						</div>
					) : (
						<div className="overflow-hidden rounded-lg border border-slate-200">
							<table className="min-w-full divide-y divide-slate-200 text-sm">
								<thead className="bg-slate-50">
									<tr>
										<th className="px-3 py-2 text-left font-semibold text-slate-700">Produit</th>
										<th className="px-3 py-2 text-left font-semibold text-slate-700">Catégorie</th>
										<th className="px-3 py-2 text-left font-semibold text-slate-700">Prix</th>
										<th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200 bg-white">
									{sortedProducts.map((p) => (
										<tr key={p.id} className={p.id === editingId ? 'bg-slate-50' : ''}>
											<td className="px-3 py-2">
												<div className="font-medium text-slate-900">{p.name}</div>
												{p.brand ? <div className="text-xs text-slate-500">{p.brand}</div> : null}
											</td>
											<td className="px-3 py-2 text-slate-700">{p.category}</td>
											<td className="px-3 py-2 text-slate-700">{Number(p.price).toFixed(2)}</td>
											<td className="px-3 py-2 text-right">
												<div className="flex justify-end gap-2">
													<SecondaryButton type="button" onClick={() => onEdit(p)} disabled={saving}>
														Éditer
													</SecondaryButton>
													<DangerButton type="button" onClick={() => onDelete(p)} disabled={saving}>
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

