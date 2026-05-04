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

export default function Layout({ routes, activeRoute, onNavigate }) {
	return (
		<div className="border-b border-slate-200 bg-white">
			<div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="text-lg font-semibold text-slate-900">AgriSolar</div>
					<div className="text-xs text-slate-500">Dimensionnement + catalogue + clients</div>
				</div>

				<nav className="flex flex-wrap gap-2">
					{routes.map((r) => (
						<NavButton key={r.key} active={r.key === activeRoute} onClick={() => onNavigate(r.key)}>
							{r.label}
						</NavButton>
					))}
				</nav>
			</div>
		</div>
	);
}

