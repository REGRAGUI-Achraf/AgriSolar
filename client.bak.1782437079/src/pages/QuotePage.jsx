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

const formatDate = (value) => {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const formatMoney = (value, currency = 'MAD') => {
	if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
	try {
		return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
	} catch {
		return `${value.toLocaleString('fr-FR')} ${currency}`;
	}
};

export default function QuotePage() {
	const [quotes, setQuotes] = useState([]);
	const [selectedId, setSelectedId] = useState(null);
	const [selectedQuote, setSelectedQuote] = useState(null);
	const [loading, setLoading] = useState(true);
	const [detailLoading, setDetailLoading] = useState(false);
	const [error, setError] = useState(null);
	const [detailError, setDetailError] = useState(null);
	const [pdfLoadingId, setPdfLoadingId] = useState(null);

	const selectedQuoteId = useMemo(() => selectedId || quotes[0]?.id || null, [selectedId, quotes]);

	const loadQuotes = async (signal) => {
		setLoading(true);
		setError(null);
		try {
			const items = await api.getQuotes({ signal });
			setQuotes(Array.isArray(items) ? items : []);
			setSelectedId((prev) => prev || items?.[0]?.id || null);
		} catch (err) {
			const msg = toErrorMessage(err);
			if (msg) setError(msg);
		} finally {
			setLoading(false);
		}
	};

	const loadQuoteDetail = async (id, signal) => {
		if (!id) {
			setSelectedQuote(null);
			return;
		}
		setDetailLoading(true);
		setDetailError(null);
		try {
			const quote = await api.getQuoteById(id, { signal });
			setSelectedQuote(quote);
		} catch (err) {
			const msg = toErrorMessage(err);
			if (msg) setDetailError(msg);
		} finally {
			setDetailLoading(false);
		}
	};

	useEffect(() => {
		const controller = new AbortController();
		loadQuotes(controller.signal);
		return () => controller.abort();
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		loadQuoteDetail(selectedQuoteId, controller.signal);
		return () => controller.abort();
	}, [selectedQuoteId]);

	const onRefresh = async () => {
		const controller = new AbortController();
		await loadQuotes(controller.signal);
	};

	const onDownloadPdf = async (quote) => {
		setPdfLoadingId(quote.id);
		try {
			const blob = await api.downloadQuotePdf(quote.id);
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `devis-${quote.quoteNumber || quote.id}.pdf`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		} catch (err) {
			const msg = toErrorMessage(err);
			if (msg) setDetailError(msg);
		} finally {
			setPdfLoadingId(null);
		}
	};

	return (
		<div className="mx-auto max-w-6xl p-6">
			<header className="mb-6 flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-slate-900">Devis</h1>
					<p className="mt-1 text-sm text-slate-600">Historique des devis enregistrés depuis le calcul de dimensionnement.</p>
				</div>
				<button
					type="button"
					onClick={onRefresh}
					className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
				>
					Rafraîchir
				</button>
			</header>

			{error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
				<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-slate-900">Liste</h2>
						<span className="text-sm text-slate-500">{quotes.length}</span>
					</div>

					{loading ? (
						<div className="py-10 text-center text-sm text-slate-600">Chargement…</div>
					) : quotes.length === 0 ? (
						<div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Aucun devis enregistré.</div>
					) : (
						<div className="overflow-hidden rounded-lg border border-slate-200">
							<table className="min-w-full divide-y divide-slate-200 text-sm">
								<thead className="bg-slate-50">
									<tr>
										<th className="px-3 py-2 text-left font-semibold text-slate-700">N°</th>
										<th className="px-3 py-2 text-left font-semibold text-slate-700">Client</th>
										<th className="px-3 py-2 text-left font-semibold text-slate-700">Statut</th>
										<th className="px-3 py-2 text-left font-semibold text-slate-700">Montant</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200 bg-white">
									{quotes.map((quote) => {
										const active = quote.id === selectedQuoteId;
										return (
											<tr
												key={quote.id}
												className={`cursor-pointer ${active ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
												onClick={() => setSelectedId(quote.id)}
											>
												<td className="px-3 py-2 font-medium text-slate-900">{quote.quoteNumber || quote.id}</td>
												<td className="px-3 py-2 text-slate-700">{quote.client?.name || '—'}</td>
												<td className="px-3 py-2 text-slate-700">{quote.status}</td>
												<td className="px-3 py-2 text-slate-700">{formatMoney(quote.totalPrice, quote.currency)}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</section>

				<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-slate-900">Détails</h2>
						{detailLoading ? <span className="text-sm text-slate-500">Chargement…</span> : null}
					</div>

					{detailError ? (
						<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{detailError}</div>
					) : null}

					{selectedQuote ? (
						<div className="space-y-4">
							<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<div className="text-sm font-semibold text-slate-900">{selectedQuote.quoteNumber || selectedQuote.id}</div>
								<div className="mt-1 text-sm text-slate-600">Client: {selectedQuote.client?.name || '—'}</div>
								<div className="mt-1 text-sm text-slate-600">Créé le: {formatDate(selectedQuote.createdAt)}</div>
							</div>

							<div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
								<div className="rounded-lg border border-slate-200 p-3">
									<p className="text-xs text-slate-500">Statut</p>
									<p className="font-medium text-slate-900">{selectedQuote.status}</p>
								</div>
								<div className="rounded-lg border border-slate-200 p-3">
									<p className="text-xs text-slate-500">Montant</p>
									<p className="font-medium text-slate-900">{formatMoney(selectedQuote.totalPrice, selectedQuote.currency)}</p>
								</div>
								<div className="rounded-lg border border-slate-200 p-3">
									<p className="text-xs text-slate-500">Culture</p>
									<p className="font-medium text-slate-900">{selectedQuote.cropType}</p>
								</div>
								<div className="rounded-lg border border-slate-200 p-3">
									<p className="text-xs text-slate-500">Pompe</p>
									<p className="font-medium text-slate-900">{selectedQuote.pumpModel}</p>
								</div>
							</div>

							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => onDownloadPdf(selectedQuote)}
									disabled={pdfLoadingId === selectedQuote.id}
									className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{pdfLoadingId === selectedQuote.id ? 'PDF…' : 'Télécharger PDF'}
								</button>
							</div>
						</div>
					) : (
						<div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
							Sélectionne un devis pour voir le détail.
						</div>
					)}
				</section>
			</div>
		</div>
	);
}