import React from 'react';

const formatNumber = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
};

const toTitle = (value) => {
  if (!value) return null;
  const str = String(value);
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getSpecRows = (category, specs) => {
  const rows = [];

  const add = (label, value) => {
    if (value === undefined || value === null || value === '') return;
    rows.push({ label, value });
  };

  const normalizedCategory = String(category || '').toUpperCase();

  if (normalizedCategory === 'PANEL') {
    add('Puissance', specs.powerW != null ? `${formatNumber(specs.powerW) ?? specs.powerW} W` : null);
    add('Vmp', specs.vmpV != null ? `${formatNumber(specs.vmpV) ?? specs.vmpV} V` : null);
    add('Imp', specs.impA != null ? `${formatNumber(specs.impA) ?? specs.impA} A` : null);
    add('Voc', specs.vocV != null ? `${formatNumber(specs.vocV) ?? specs.vocV} V` : null);
    add('Isc', specs.iscA != null ? `${formatNumber(specs.iscA) ?? specs.iscA} A` : null);
    add('Technologie', toTitle(specs.technology));
  } else if (normalizedCategory === 'PUMP') {
    add('Puissance', specs.powerKW != null ? `${formatNumber(specs.powerKW) ?? specs.powerKW} kW` : null);
    add('Débit nominal', specs.flowNominalM3H != null ? `${formatNumber(specs.flowNominalM3H) ?? specs.flowNominalM3H} m³/h` : null);
    add('HMT max', specs.headMaxM != null ? `${formatNumber(specs.headMaxM) ?? specs.headMaxM} m` : null);
    add('Type moteur', specs.motorType ? String(specs.motorType) : null);
    add('Tension', specs.voltageV != null ? `${formatNumber(specs.voltageV) ?? specs.voltageV} V` : null);
    add('Phases', specs.phases != null ? String(specs.phases) : null);
  } else if (normalizedCategory === 'INVERTER') {
    add('Puissance nominale', specs.ratedPowerKW != null ? `${formatNumber(specs.ratedPowerKW) ?? specs.ratedPowerKW} kW` : null);
    if (specs.pvInputVoltageMinV != null || specs.pvInputVoltageMaxV != null) {
      const minV = specs.pvInputVoltageMinV != null ? formatNumber(specs.pvInputVoltageMinV) ?? specs.pvInputVoltageMinV : '—';
      const maxV = specs.pvInputVoltageMaxV != null ? formatNumber(specs.pvInputVoltageMaxV) ?? specs.pvInputVoltageMaxV : '—';
      add('Entrée PV', `${minV}–${maxV} V`);
    }
    add('Sortie AC', specs.acOutputVoltageV != null ? `${formatNumber(specs.acOutputVoltageV) ?? specs.acOutputVoltageV} V` : null);
    add('Phases', specs.phases != null ? String(specs.phases) : null);
  }

  // Fallback: include other keys not already displayed (keeps UI useful when specs evolve)
  const knownKeysByCategory = {
    PANEL: ['powerW', 'vmpV', 'impA', 'vocV', 'iscA', 'technology'],
    PUMP: ['powerKW', 'flowNominalM3H', 'headMaxM', 'motorType', 'voltageV', 'phases'],
    INVERTER: ['ratedPowerKW', 'pvInputVoltageMinV', 'pvInputVoltageMaxV', 'acOutputVoltageV', 'phases'],
  };

  const knownKeys = new Set(knownKeysByCategory[normalizedCategory] ?? []);
  for (const [key, value] of Object.entries(specs || {})) {
    if (knownKeys.has(key)) continue;
    if (value === undefined || value === null) continue;

    const displayValue =
      typeof value === 'number'
        ? formatNumber(value) ?? value
        : typeof value === 'string'
          ? value
          : JSON.stringify(value);

    add(key, displayValue);
  }

  return rows;
};

/**
 * Carte produit "clean" pour afficher le matériel.
 *
 * @param {{ product: { id?: string, name: string, brand?: string, category?: string, price?: number, specifications?: object } }} props
 */
export default function ProductCard({ product }) {
  const name = product?.name ?? 'Produit';
  const brand = product?.brand ?? null;
  const category = product?.category ?? null;
  const price = product?.price;
  const specifications = product?.specifications && typeof product.specifications === 'object' ? product.specifications : {};

  const specRows = getSpecRows(category, specifications);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">{name}</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            {brand ? <span>{brand}</span> : <span className="italic">Marque non renseignée</span>}
          </p>
        </div>

        {category ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {String(category)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <p className="text-sm text-slate-600">Prix</p>
        <p className="text-lg font-semibold text-slate-900">
          {typeof price === 'number' ? formatNumber(price) : '—'}
        </p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-slate-900">Spécifications</p>
        {specRows.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">Aucune spécification disponible.</p>
        ) : (
          <dl className="mt-2 space-y-1">
            {specRows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3">
                <dt className="text-sm text-slate-600">{row.label}</dt>
                <dd className="text-sm font-medium text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
