import React, { useMemo, useState } from 'react';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { exportElementToPdf } from '../services/ExportService';

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const formatNumber = (value, options = {}) => {
  if (!isFiniteNumber(value)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
};

const formatMoney = (value, currency) => {
  if (!isFiniteNumber(value)) return '—';

  const code = typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : null;

  if (code) {
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      // Fallback below
    }
  }

  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)}${code ? ` ${code}` : ''}`;
};

const safeString = (value) => {
  if (value === undefined || value === null) return '—';
  const str = String(value).trim();
  return str ? str : '—';
};

const clampYears = (series, horizonYears) => {
  if (!Array.isArray(series)) return [];
  const max = typeof horizonYears === 'number' && horizonYears > 0 ? horizonYears : 10;

  // Keep at most 10 years of points (accept year 0 too).
  return series
    .filter((p) => p && typeof p === 'object' && isFiniteNumber(p.year))
    .sort((a, b) => a.year - b.year)
    .filter((p) => p.year <= max)
    .slice(0, max + 1);
};

const cumulativeFromAnnual = (annual) => {
  const out = [];
  let acc = 0;
  for (const value of annual) {
    acc += isFiniteNumber(value) ? value : 0;
    out.push(acc);
  }
  return out;
};

const buildRoiSeries = (result, horizonYears = 10) => {
  const roi = result?.roi ?? result?.financial?.roi ?? result?.analysis?.roi;
  if (!roi || typeof roi !== 'object') return [];

  // 1) Preferred: explicit series of points
  const seriesCandidates = roi.series ?? roi.points ?? roi.data;
  if (Array.isArray(seriesCandidates) && seriesCandidates.length > 0) {
    const normalized = seriesCandidates
      .map((p) => {
        const year = typeof p.year === 'number' ? p.year : typeof p.x === 'number' ? p.x : null;
        const solar = typeof p.solar === 'number' ? p.solar : typeof p.solarCumulative === 'number' ? p.solarCumulative : null;
        const diesel = typeof p.diesel === 'number' ? p.diesel : typeof p.dieselCumulative === 'number' ? p.dieselCumulative : null;
        if (!isFiniteNumber(year) || (!isFiniteNumber(solar) && !isFiniteNumber(diesel))) return null;
        return { year, solar: solar ?? null, diesel: diesel ?? null };
      })
      .filter(Boolean);

    return clampYears(normalized, horizonYears);
  }

  // 2) Arrays: cumulative costs
  const years = Array.isArray(roi.years) ? roi.years : null;
  const solarC = Array.isArray(roi.solarCumulative) ? roi.solarCumulative : Array.isArray(roi.solarCumulativeCost) ? roi.solarCumulativeCost : null;
  const dieselC = Array.isArray(roi.dieselCumulative) ? roi.dieselCumulative : Array.isArray(roi.dieselCumulativeCost) ? roi.dieselCumulativeCost : null;
  if (years && solarC && dieselC && years.length) {
    const len = Math.min(years.length, solarC.length, dieselC.length);
    const series = Array.from({ length: len }, (_, i) => ({
      year: Number(years[i]),
      solar: Number(solarC[i]),
      diesel: Number(dieselC[i]),
    }));
    return clampYears(series, horizonYears);
  }

  // 3) Arrays: annual costs → cumulative
  const solarA = Array.isArray(roi.solarAnnual) ? roi.solarAnnual : Array.isArray(roi.solarAnnualCost) ? roi.solarAnnualCost : null;
  const dieselA = Array.isArray(roi.dieselAnnual) ? roi.dieselAnnual : Array.isArray(roi.dieselAnnualCost) ? roi.dieselAnnualCost : null;
  if (solarA && dieselA && solarA.length && dieselA.length) {
    const len = Math.min(solarA.length, dieselA.length, horizonYears);
    const solarCum = cumulativeFromAnnual(solarA.slice(0, len));
    const dieselCum = cumulativeFromAnnual(dieselA.slice(0, len));
    const series = Array.from({ length: len }, (_, i) => ({
      year: i + 1,
      solar: solarCum[i],
      diesel: dieselCum[i],
    }));
    return clampYears(series, horizonYears);
  }

  // 4) Scalars: annual costs + initial investment
  if (isFiniteNumber(roi.solarAnnualCost) && isFiniteNumber(roi.dieselAnnualCost)) {
    const yearsCount = horizonYears;
    const initialSolar = isFiniteNumber(roi.solarInitialInvestment) ? roi.solarInitialInvestment : 0;
    const initialDiesel = isFiniteNumber(roi.dieselInitialInvestment) ? roi.dieselInitialInvestment : 0;

    const series = Array.from({ length: yearsCount + 1 }, (_, year) => ({
      year,
      solar: initialSolar + year * roi.solarAnnualCost,
      diesel: initialDiesel + year * roi.dieselAnnualCost,
    }));

    return clampYears(series, horizonYears);
  }

  return [];
};

const IconBase = ({ children, className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
);

const SolarPanelIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M3 11h18" />
    <path d="M5 11V5h14v6" />
    <path d="M7 5v6" />
    <path d="M11 5v6" />
    <path d="M15 5v6" />
    <path d="M19 5v6" />
    <path d="M12 11v7" />
    <path d="M8 18h8" />
  </IconBase>
);

const PumpIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M7 3h10v6H7z" />
    <path d="M9 9v4" />
    <path d="M15 9v4" />
    <path d="M6 13h12v8H6z" />
  </IconBase>
);

const BasinIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M4 7c2 2 14 2 16 0" />
    <path d="M4 7v8c0 3 16 3 16 0V7" />
  </IconBase>
);

const MoneyIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M3 7h18v10H3z" />
    <path d="M7 7v10" />
    <path d="M17 7v10" />
    <path d="M12 10.5c1.3 0 2.5.8 2.5 2s-1.2 2-2.5 2-2.5-.8-2.5-2 1.2-2 2.5-2Z" />
  </IconBase>
);

const ReceiptIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z" />
    <path d="M9 7h6" />
    <path d="M9 11h6" />
    <path d="M9 15h6" />
  </IconBase>
);

const DownloadIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M12 3v10" />
    <path d="m8 11 4 4 4-4" />
    <path d="M4 19h16" />
  </IconBase>
);

const KpiCard = ({ title, value, Icon, tone = 'default' }) => {
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50'
      : tone === 'danger'
        ? 'border-rose-200 bg-rose-50'
        : 'border-slate-200 bg-white';

  const iconClasses =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'danger'
        ? 'text-rose-700'
        : 'text-slate-700';

  return (
    <div className={`rounded-lg border p-4 ${toneClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-600">{title}</p>
          <p className="mt-1 truncate text-base font-semibold text-slate-900">{value}</p>
        </div>
        {Icon ? <Icon className={`h-5 w-5 shrink-0 ${iconClasses}`} /> : null}
      </div>
    </div>
  );
};

const SectionCard = ({ title, children }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <div className="mt-4">{children}</div>
  </section>
);

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3">
    <p className="text-xs text-slate-600">{label}</p>
    <p className="text-xs font-medium text-slate-900">{value}</p>
  </div>
);

const normalizeMaterials = (result) => {
  const items =
    result?.materials ??
    result?.billOfMaterials ??
    result?.selectedMaterials ??
    result?.items ??
    result?.quote?.items ??
    [];

  if (!Array.isArray(items)) return [];

  return items
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      return {
        id: raw.id ?? raw.productId ?? raw.sku ?? null,
        name: raw.name ?? raw.productName ?? raw.product?.name ?? '—',
        brand: raw.brand ?? raw.product?.brand ?? null,
        category: raw.category ?? raw.product?.category ?? null,
        quantity: raw.quantity ?? raw.qty ?? 1,
        unitPrice: raw.unitPrice ?? raw.price ?? raw.product?.price ?? null,
        total: raw.total ?? raw.lineTotal ?? null,
      };
    })
    .filter(Boolean);
};

/**
 * Dashboard final (Module C): KPIs + Finances + ROI + Export PDF.
 *
 * Attendu côté backend: idéalement `result.roi` avec une série/cumul sur 10 ans.
 */
export default function ResultsDashboard({
  result,
  client,
  company = { name: 'HelioFlow', logoUrl: null },
  horizonYears = 10,
  pdfElementId = 'results-dashboard-pdf',
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  const derived = useMemo(() => {
    const panelCount = result?.panelCount ?? result?.technical?.panelCount ?? null;
    const pumpModel = result?.pumpModel ?? result?.technical?.pumpModel ?? null;
    const basinVolume = result?.basinVolume ?? result?.technical?.basinVolume ?? null;

    const financial = result?.financial ?? result ?? {};
    const currency = financial.currency ?? financial.currencyCode ?? 'MAD';

    const totalHT =
      financial.totalHT ??
      financial.totalPriceHT ??
      financial.totalExclTax ??
      (isFiniteNumber(financial.totalPrice) ? financial.totalPrice : null);

    const totalTTC =
      financial.totalTTC ??
      financial.totalPriceTTC ??
      financial.totalInclTax ??
      (isFiniteNumber(result?.totalPrice) ? result.totalPrice : null);

    const initialInvestment =
      financial.initialInvestment ??
      financial.investmentInitial ??
      financial.capex ??
      (isFiniteNumber(totalHT) ? totalHT : isFiniteNumber(totalTTC) ? totalTTC : null);

    const roiSeries = buildRoiSeries(result, horizonYears);
    const materials = normalizeMaterials(result);

    const clientName =
      client?.name ??
      result?.client?.name ??
      result?.clientName ??
      (typeof client === 'string' ? client : null);

    const clientPhone = client?.phone ?? result?.client?.phone ?? result?.clientPhone ?? null;

    const latitude =
      client?.latitude ?? result?.client?.latitude ?? result?.latitude ?? result?.inputs?.latitude ?? null;

    const longitude =
      client?.longitude ?? result?.client?.longitude ?? result?.longitude ?? result?.inputs?.longitude ?? null;

    return {
      panelCount,
      pumpModel,
      basinVolume,
      currency,
      totalHT,
      totalTTC,
      initialInvestment,
      roiSeries,
      materials,
      clientName,
      clientPhone,
      latitude,
      longitude,
    };
  }, [result, client, horizonYears]);

  const hasRoi = derived.roiSeries.length >= 2;

  const fileName = useMemo(() => {
    const base = `Devis-${company?.name ?? 'HelioFlow'}-${derived.clientName ?? 'Client'}`;
    const date = new Intl.DateTimeFormat('fr-CA').format(new Date()); // YYYY-MM-DD
    return `${base}-${date}.pdf`;
  }, [company?.name, derived.clientName]);

  const handleDownloadPdf = async () => {
    setPdfError(null);
    setPdfLoading(true);

    try {
      await exportElementToPdf({
        elementId: pdfElementId,
        fileName,
        options: { scale: 2, marginMm: 10, backgroundColor: '#ffffff' },
      });
    } catch (error) {
      const message =
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Impossible de générer le PDF.';
      setPdfError(message);
    } finally {
      setPdfLoading(false);
    }
  };

  const tooltipFormatter = (value) => formatMoney(Number(value), derived.currency);

  return (
    <div className="space-y-4">
      <div id={pdfElementId} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {company?.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company?.name ?? 'Logo'}
                  className="h-10 w-10 rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
                  {(company?.name ?? 'H').slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{safeString(company?.name ?? 'HelioFlow')}</p>
                <p className="text-xs text-slate-600">Synthèse de dimensionnement</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <InfoRow label="Client" value={safeString(derived.clientName)} />
              <InfoRow label="Téléphone" value={derived.clientPhone ? safeString(derived.clientPhone) : '—'} />
              <InfoRow
                label="Latitude"
                value={isFiniteNumber(derived.latitude) ? formatNumber(derived.latitude) : safeString(derived.latitude)}
              />
              <InfoRow
                label="Longitude"
                value={isFiniteNumber(derived.longitude) ? formatNumber(derived.longitude) : safeString(derived.longitude)}
              />
            </div>
          </div>

          <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <p className="text-xs text-slate-600">Date</p>
            <p className="text-sm font-semibold text-slate-900">
              {new Intl.DateTimeFormat('fr-FR').format(new Date())}
            </p>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionCard title="Résumé Technique">
            <div className="grid grid-cols-1 gap-3">
              <KpiCard
                title="Nombre de panneaux"
                value={isFiniteNumber(derived.panelCount) ? String(derived.panelCount) : safeString(derived.panelCount)}
                Icon={SolarPanelIcon}
              />
              <KpiCard title="Modèle de pompe" value={safeString(derived.pumpModel)} Icon={PumpIcon} />
              <KpiCard
                title="Volume du bassin"
                value={isFiniteNumber(derived.basinVolume) ? `${formatNumber(derived.basinVolume)} m³` : safeString(derived.basinVolume)}
                Icon={BasinIcon}
              />
            </div>
          </SectionCard>

          <SectionCard title="Analyse Financière">
            <div className="grid grid-cols-1 gap-3">
              <KpiCard
                title="Prix total HT"
                value={formatMoney(derived.totalHT, derived.currency)}
                Icon={ReceiptIcon}
              />
              <KpiCard
                title="Prix total TTC"
                value={formatMoney(derived.totalTTC, derived.currency)}
                Icon={MoneyIcon}
              />
              <KpiCard
                title="Investissement initial"
                value={formatMoney(derived.initialInvestment, derived.currency)}
                Icon={MoneyIcon}
                tone="success"
              />
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-slate-900">Matériel sélectionné</p>
              {derived.materials.length === 0 ? (
                <p className="mt-2 text-xs text-slate-600">
                  Aucun détail matériel retourné par le backend (attendu: `materials[]`).
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full bg-white text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Désignation</th>
                        <th className="px-3 py-2 font-semibold">Catégorie</th>
                        <th className="px-3 py-2 font-semibold">Qté</th>
                        <th className="px-3 py-2 font-semibold">PU</th>
                        <th className="px-3 py-2 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {derived.materials.map((m, idx) => {
                        const displayName = m.brand ? `${m.name} (${m.brand})` : m.name;
                        const key = m.id ?? `${displayName}-${idx}`;
                        const lineTotal =
                          isFiniteNumber(m.total)
                            ? m.total
                            : isFiniteNumber(m.unitPrice) && isFiniteNumber(Number(m.quantity))
                              ? Number(m.quantity) * m.unitPrice
                              : null;

                        return (
                          <tr key={String(key)} className="text-slate-900">
                            <td className="whitespace-nowrap px-3 py-2">{safeString(displayName)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">{safeString(m.category)}</td>
                            <td className="whitespace-nowrap px-3 py-2">{safeString(m.quantity)}</td>
                            <td className="whitespace-nowrap px-3 py-2">{formatMoney(m.unitPrice, derived.currency)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right">{formatMoney(lineTotal, derived.currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-900">Disclaimer technique</p>
              <p className="mt-1 text-xs text-slate-700">
                Ce document est une estimation basée sur les données saisies et les hypothèses du modèle.
                Les performances réelles peuvent varier (site, météo, pertes hydrauliques, installation).
                La validation finale doit être réalisée par un technicien qualifié.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Graphique de Rentabilité (ROI)">
            {!hasRoi ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Données ROI indisponibles</p>
                <p className="mt-1 text-xs text-slate-600">
                  Le backend doit retourner une série ROI (ex: `result.roi.series`) pour comparer le coût cumulé
                  « Solaire » vs « Diesel » sur {horizonYears} ans.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={derived.roiSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="currentColor" className="text-slate-200" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12, fill: 'currentColor' }}
                      className="text-slate-600"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'currentColor' }}
                      className="text-slate-600"
                      tickLine={false}
                      axisLine={false}
                      width={56}
                    />
                    <Tooltip
                      formatter={tooltipFormatter}
                      labelFormatter={(label) => `Année ${label}`}
                      wrapperClassName="rounded-lg border border-slate-200 bg-white"
                      contentStyle={{ border: 'none', background: 'transparent' }}
                    />
                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="solar"
                      name="Solaire (cumulé)"
                      stroke="currentColor"
                      className="text-emerald-600"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="diesel"
                      name="Diesel (cumulé)"
                      stroke="currentColor"
                      className="text-slate-500"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <p className="mt-3 text-xs text-slate-600">
              Courbes cumulées sur {horizonYears} ans (données issues du backend).
            </p>
          </SectionCard>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-600">Export PDF basé sur la vue de synthèse ci-dessus.</div>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${
            pdfLoading ? 'cursor-not-allowed bg-slate-200 text-slate-600' : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {pdfLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Génération…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <DownloadIcon className="h-4 w-4" />
              Télécharger le Devis PDF
            </span>
          )}
        </button>
      </div>

      {pdfError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="text-sm font-semibold">Export PDF impossible</p>
          <p className="mt-1 text-sm">{pdfError}</p>
          <p className="mt-2 text-xs text-rose-800">
            Dépendances attendues: `html2canvas` et `jspdf`.
          </p>
        </div>
      ) : null}
    </div>
  );
}
