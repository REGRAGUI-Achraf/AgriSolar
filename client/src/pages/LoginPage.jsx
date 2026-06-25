import React, { useState } from 'react';

import { api } from '../services/api';

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

export default function LoginPage({ onLogin }) {
	const [email, setEmail] = useState('admin@agrisolar.com');
	const [password, setPassword] = useState('Admin@agrisolar123');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const submit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const result = await api.authLogin({ email, password });
			onLogin?.(result);
		} catch (err) {
			const message = err?.response?.data?.message || err?.message || 'Connexion impossible.';
			setError(message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center px-6 py-10">
			<div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h1 className="text-2xl font-semibold text-slate-900">Connexion</h1>
				<p className="mt-1 text-sm text-slate-600">Accède à l’espace commercial et admin avec un compte seedé.</p>

				<form onSubmit={submit} className="mt-6 space-y-4">
					<Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
					<Input label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

					{error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}

					<button
						type="submit"
						disabled={loading}
						className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Connexion…' : 'Se connecter'}
					</button>

					<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
						Démo: <span className="font-medium">admin@agrisolar.com / Admin@agrisolar123</span> ou <span className="font-medium">commercial@1 / Sales@agrisolar123</span>
					</div>
				</form>
			</div>
		</div>
	);
}