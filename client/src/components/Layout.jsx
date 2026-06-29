import React from 'react';

const NavButton = ({ active, onClick, children }) => (
	<button
		type="button"
		onClick={onClick}
		className={
			active
				? 'rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
				: 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200'
		}
	>
		{children}
	</button>
);

export default function Layout({ routes, activeRoute, onNavigate, user, onLogout }) {
	return (
		<div className="border-b border-slate-200 bg-white">
			<div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<img src="/logo.png" alt="BAGHDAD S.A.R.L" className="h-12 w-auto" />
					<div>
						<div className="text-lg font-semibold text-slate-900">BAGHDAD S.A.R.L</div>
						<div className="text-xs text-slate-500">Dimensionnement + catalogue + clients</div>
					</div>
				</div>

				<div className="flex flex-col items-start gap-2 sm:items-end">
					<div className="text-sm text-slate-600">
						{user ? (
							<>
								{user.email} · <span className="font-medium uppercase">{user.role}</span>
							</>
						) : (
							'Non connecté'
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						{routes.map((r) => (
							<NavButton key={r.key} active={r.key === activeRoute} onClick={() => onNavigate(r.key)}>
								{r.label}
							</NavButton>
						))}
						{onLogout ? (
							<button
								type="button"
								onClick={onLogout}
								className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
							>
								Déconnexion
							</button>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}

