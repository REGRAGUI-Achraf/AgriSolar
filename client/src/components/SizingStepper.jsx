import React, { useMemo, useState } from 'react';

import { apiClient } from '../services/api';
import ResultsDashboard from './ResultsDashboard';

const STEP_KEYS = ['location', 'water', 'technical', 'result'];

const CROP_OPTIONS = [
  { value: 'olivier', label: 'Olivier' },
  { value: 'agrumes', label: 'Agrumes' },
  { value: 'maraichage', label: 'Maraîchage' },
  { value: 'cereales', label: 'Céréales' },
  { value: 'luzerne', label: 'Luzerne' },
];

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const parseFiniteNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toErrorMessage = (error) => {
  if (!error) return 'Erreur inconnue.';

  // axios cancellation / AbortController
  if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
    return null;
  }

  // axios network errors
  if (error.code === 'ERR_NETWORK') {
    return 'Impossible de joindre le backend (réseau indisponible).';
  }

  const status = error.response?.status;
  const serverMessage = error.response?.data?.message;

  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
  if (typeof status === 'number') return `Erreur API (${status}).`;
  if (typeof error.message === 'string' && error.message.trim()) return error.message;

  return 'Erreur inconnue.';
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

const MapPinIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M12 22s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12Z" />
    <circle cx="12" cy="10" r="2.5" />
  </IconBase>
);

const DropletIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M12 2s6 6.3 6 12a6 6 0 0 1-12 0c0-5.7 6-12 6-12Z" />
  </IconBase>
);

const SlidersIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M4 6h10" />
    <path d="M18 6h2" />
    <circle cx="16" cy="6" r="2" />

    <path d="M4 12h2" />
    <path d="M10 12h10" />
    <circle cx="8" cy="12" r="2" />

    <path d="M4 18h12" />
    <path d="M20 18h0" />
    <circle cx="18" cy="18" r="2" />
  </IconBase>
);

const CheckIcon = ({ className }) => (
  <IconBase className={className}>
    <path d="M20 7 10 17l-5-5" />
  </IconBase>
);

const STEPS = [
  { key: 'location', title: 'Localisation', Icon: MapPinIcon },
  { key: 'water', title: 'Besoins Hydriques', Icon: DropletIcon },
  { key: 'technical', title: 'Paramètres Techniques', Icon: SlidersIcon },
  { key: 'result', title: 'Résultat & Validation', Icon: CheckIcon },
];

const validateStep = (stepIndex, formData, options) => {
  const { requireClientSelection } = options;

  const errors = {};

  const latitude = parseFiniteNumber(formData.latitude);
  const longitude = parseFiniteNumber(formData.longitude);

  if (stepIndex === 0) {
    if (requireClientSelection) {
      if (!isNonEmptyString(formData.clientId)) {
        errors.clientId = 'Sélectionne un client.';
      }
    } else {
      if (!isNonEmptyString(formData.clientName)) {
        errors.clientName = 'Renseigne le client.';
      }
    }

    if (latitude === null || latitude < -90 || latitude > 90) {
      errors.latitude = 'Latitude invalide (entre -90 et 90).';
    }

    if (longitude === null || longitude < -180 || longitude > 180) {
      errors.longitude = 'Longitude invalide (entre -180 et 180).';
    }
  }

  if (stepIndex === 1) {
    const irrigationSurface = parseFiniteNumber(formData.irrigationSurface);
    const wellDepth = parseFiniteNumber(formData.wellDepth);

    if (!isNonEmptyString(formData.cropType)) {
      errors.cropType = 'Choisis une culture.';
    }

    if (irrigationSurface === null || irrigationSurface <= 0) {
      errors.irrigationSurface = 'Surface invalide (doit être > 0).';
    }

    if (wellDepth === null || wellDepth <= 0) {
      errors.wellDepth = 'Profondeur invalide (doit être > 0).';
    }
  }

  if (stepIndex === 2) {
    const distanceWellToBasin = parseFiniteNumber(formData.distanceWellToBasin);
    const panelTilt = parseFiniteNumber(formData.panelTilt);

    if (distanceWellToBasin === null || distanceWellToBasin < 0) {
      errors.distanceWellToBasin = 'Distance invalide (doit être ≥ 0).';
    }

    if (panelTilt === null || panelTilt < 0 || panelTilt > 90) {
      errors.panelTilt = 'Inclinaison invalide (entre 0° et 90°).';
    }
  }

  return errors;
};

const validateAll = (formData, options) => {
  for (let i = 0; i < 3; i += 1) {
    const errors = validateStep(i, formData, options);
    if (Object.keys(errors).length > 0) return { firstInvalidStep: i, errors };
  }
  return { firstInvalidStep: null, errors: {} };
};

const SummaryRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3">
    <dt className="text-sm text-slate-600">{label}</dt>
    <dd className="text-sm font-medium text-slate-900">{value}</dd>
  </div>
);

const Field = ({ label, required, error, children, hint }) => (
  <div>
    <label className="block text-sm font-medium text-slate-900">
      {label}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
    <div className="mt-1">{children}</div>
    {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
  </div>
);

const getButtonClasses = (variant, disabled) => {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2';

  if (variant === 'secondary') {
    return `${base} ${
      disabled
        ? 'cursor-not-allowed bg-slate-100 text-slate-400'
        : 'bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50'
    }`;
  }

  return `${base} ${
    disabled
      ? 'cursor-not-allowed bg-slate-200 text-slate-500'
      : 'bg-slate-900 text-white hover:bg-slate-800'
  }`;
};

const extractClientById = (clients, clientId) => {
  if (!Array.isArray(clients) || clients.length === 0) return null;
  return clients.find((c) => String(c.id) === String(clientId)) ?? null;
};

const defaultRunSizing = async (payload) => {
  const response = await apiClient.post('/api/sizing/run', payload);
  return response?.data;
};

/**
 * Formulaire multi-étapes (Stepper) pour le module de dimensionnement.
 *
 * - Un seul état `formData` pour toutes les données utilisateur.
 * - Validation granulaire par étape + navigation Suivant/Précédent.
 * - Barre de progression (25/50/75/100) et icônes.
 * - Prêt à afficher les résultats d'un calcul backend (Module C).
 */
export default function SizingStepper({ clients = [], onRunSizing }) {
  const requireClientSelection = Array.isArray(clients) && clients.length > 0;

  const [currentStep, setCurrentStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1
    clientId: '',
    clientName: '',
    latitude: '',
    longitude: '',

    // Step 2
    cropType: '',
    irrigationSurface: '', // ha
    wellDepth: '', // m

    // Step 3
    distanceWellToBasin: '', // m
    panelTilt: '', // deg
  });

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState(null);
  const [result, setResult] = useState(null);

  const options = useMemo(() => ({ requireClientSelection }), [requireClientSelection]);

  const stepErrors = useMemo(() => validateStep(currentStep, formData, options), [currentStep, formData, options]);
  const stepValid = Object.keys(stepErrors).length === 0;

  const progress = useMemo(() => {
    const ratio = (currentStep + 1) / STEP_KEYS.length;
    return clamp(Math.round(ratio * 100), 0, 100);
  }, [currentStep]);

  const current = STEPS[currentStep];

  const updateForm = (patch) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const handleSelectClient = (event) => {
    const selectedId = event.target.value;
    const selected = extractClientById(clients, selectedId);

    updateForm({
      clientId: selectedId,
      clientName: selected?.name ?? '',
      latitude: selected?.latitude != null ? String(selected.latitude) : formData.latitude,
      longitude: selected?.longitude != null ? String(selected.longitude) : formData.longitude,
    });
  };

  const handleGetGps = async () => {
    setGpsError(null);
    setShowErrors(false);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    setGpsLoading(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 30_000,
        });
      });

      const lat = position?.coords?.latitude;
      const lon = position?.coords?.longitude;

      if (typeof lat !== 'number' || typeof lon !== 'number') {
        setGpsError("Impossible de lire la position GPS.");
        return;
      }

      updateForm({
        latitude: String(Number(lat.toFixed(6))),
        longitude: String(Number(lon.toFixed(6))),
      });
    } catch {
      setGpsError("Impossible de récupérer la position GPS.");
    } finally {
      setGpsLoading(false);
    }
  };

  const goPrev = () => {
    setShowErrors(false);
    setGpsError(null);
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const goNext = () => {
    if (!stepValid) {
      setShowErrors(true);
      return;
    }

    setShowErrors(false);
    setGpsError(null);
    setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const runSizing = async () => {
    setRunError(null);
    setResult(null);

    const { firstInvalidStep, errors } = validateAll(formData, options);
    if (firstInvalidStep != null) {
      setCurrentStep(firstInvalidStep);
      setShowErrors(true);
      // Also surface GPS error when coordinates are the issue
      if (firstInvalidStep === 0 && (errors.latitude || errors.longitude)) {
        setGpsError(null);
      }
      return;
    }

    const payload = {
      clientId: requireClientSelection ? formData.clientId : undefined,
      clientName: requireClientSelection ? undefined : formData.clientName,
      latitude: parseFiniteNumber(formData.latitude),
      longitude: parseFiniteNumber(formData.longitude),
      cropType: formData.cropType,
      irrigationSurface: parseFiniteNumber(formData.irrigationSurface),
      wellDepth: parseFiniteNumber(formData.wellDepth),
      distanceWellToBasin: parseFiniteNumber(formData.distanceWellToBasin),
      panelTilt: parseFiniteNumber(formData.panelTilt),
    };

    setRunLoading(true);
    try {
      const runner = typeof onRunSizing === 'function' ? onRunSizing : defaultRunSizing;
      const data = await runner(payload);
      setResult(data ?? null);
    } catch (err) {
      const message = toErrorMessage(err);
      if (message) setRunError(message);
    } finally {
      setRunLoading(false);
    }
  };

  const renderStepContent = () => {
    if (current.key === 'location') {
      return (
        <div className="space-y-4">
          {requireClientSelection ? (
            <Field
              label="Client"
              required
              error={showErrors ? stepErrors.clientId : null}
              hint="Sélectionne le client afin d'utiliser ses coordonnées (si disponibles)."
            >
              <select
                className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  showErrors && stepErrors.clientId ? 'border-red-300' : 'border-slate-200'
                }`}
                value={formData.clientId}
                onChange={handleSelectClient}
              >
                <option value="">— Choisir un client —</option>
                {clients.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Client" required error={showErrors ? stepErrors.clientName : null}>
              <input
                type="text"
                className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  showErrors && stepErrors.clientName ? 'border-red-300' : 'border-slate-200'
                }`}
                placeholder="Nom du client"
                value={formData.clientName}
                onChange={(e) => updateForm({ clientName: e.target.value })}
              />
            </Field>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGetGps}
              disabled={gpsLoading}
              className={getButtonClasses('secondary', gpsLoading)}
            >
              {gpsLoading ? 'Récupération GPS...' : 'Récupérer GPS'}
            </button>
            <p className="text-xs text-slate-600">Latitude/Longitude requises pour le calcul PVGIS.</p>
          </div>

          {gpsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{gpsError}</div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Latitude"
              required
              error={showErrors ? stepErrors.latitude : null}
              hint="Ex: 33.8935"
            >
              <input
                type="number"
                step="0.000001"
                inputMode="decimal"
                className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  showErrors && stepErrors.latitude ? 'border-red-300' : 'border-slate-200'
                }`}
                value={formData.latitude}
                onChange={(e) => updateForm({ latitude: e.target.value })}
              />
            </Field>

            <Field
              label="Longitude"
              required
              error={showErrors ? stepErrors.longitude : null}
              hint="Ex: -5.5473"
            >
              <input
                type="number"
                step="0.000001"
                inputMode="decimal"
                className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  showErrors && stepErrors.longitude ? 'border-red-300' : 'border-slate-200'
                }`}
                value={formData.longitude}
                onChange={(e) => updateForm({ longitude: e.target.value })}
              />
            </Field>
          </div>
        </div>
      );
    }

    if (current.key === 'water') {
      return (
        <div className="space-y-4">
          <Field label="Culture" required error={showErrors ? stepErrors.cropType : null}>
            <select
              className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                showErrors && stepErrors.cropType ? 'border-red-300' : 'border-slate-200'
              }`}
              value={formData.cropType}
              onChange={(e) => updateForm({ cropType: e.target.value })}
            >
              <option value="">— Choisir une culture —</option>
              {CROP_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Surface du terrain (ha)"
              required
              error={showErrors ? stepErrors.irrigationSurface : null}
              hint="Surface irriguée en hectares"
            >
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  showErrors && stepErrors.irrigationSurface ? 'border-red-300' : 'border-slate-200'
                }`}
                value={formData.irrigationSurface}
                onChange={(e) => updateForm({ irrigationSurface: e.target.value })}
              />
            </Field>

            <Field
              label="Profondeur du puits (m)"
              required
              error={showErrors ? stepErrors.wellDepth : null}
              hint="Profondeur jusqu'au niveau d'aspiration"
            >
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  showErrors && stepErrors.wellDepth ? 'border-red-300' : 'border-slate-200'
                }`}
                value={formData.wellDepth}
                onChange={(e) => updateForm({ wellDepth: e.target.value })}
              />
            </Field>
          </div>
        </div>
      );
    }

    if (current.key === 'technical') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Distance puits → bassin (m)"
              required
              error={showErrors ? stepErrors.distanceWellToBasin : null}
              hint="Distance horizontale (approximative)"
            >
              <input
                type="number"
                step="1"
                inputMode="numeric"
                className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  showErrors && stepErrors.distanceWellToBasin ? 'border-red-300' : 'border-slate-200'
                }`}
                value={formData.distanceWellToBasin}
                onChange={(e) => updateForm({ distanceWellToBasin: e.target.value })}
              />
            </Field>

            <Field
              label="Inclinaison souhaitée des panneaux (°)"
              required
              error={showErrors ? stepErrors.panelTilt : null}
              hint="Valeur typique: 20–35°"
            >
              <input
                type="number"
                step="1"
                min="0"
                max="90"
                inputMode="numeric"
                className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  showErrors && stepErrors.panelTilt ? 'border-red-300' : 'border-slate-200'
                }`}
                value={formData.panelTilt}
                onChange={(e) => updateForm({ panelTilt: e.target.value })}
              />
            </Field>
          </div>
        </div>
      );
    }

    // Step 4: Résultat & Validation
    const selectedClient = requireClientSelection ? extractClientById(clients, formData.clientId) : null;
    const displayClient =
      selectedClient?.name || (isNonEmptyString(formData.clientName) ? formData.clientName : '—');

    const lat = parseFiniteNumber(formData.latitude);
    const lon = parseFiniteNumber(formData.longitude);

    const safeNumber = (n) => (typeof n === 'number' && Number.isFinite(n) ? String(n) : '—');

    const clientForDashboard = selectedClient
      ? selectedClient
      : {
          name: isNonEmptyString(formData.clientName) ? formData.clientName : null,
          latitude: lat,
          longitude: lon,
        };

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Résumé</p>
          <dl className="mt-3 space-y-2">
            <SummaryRow label="Client" value={displayClient} />
            <SummaryRow label="Latitude" value={safeNumber(lat)} />
            <SummaryRow label="Longitude" value={safeNumber(lon)} />
            <SummaryRow label="Culture" value={formData.cropType || '—'} />
            <SummaryRow label="Surface (ha)" value={formData.irrigationSurface || '—'} />
            <SummaryRow label="Profondeur puits (m)" value={formData.wellDepth || '—'} />
            <SummaryRow label="Distance puits → bassin (m)" value={formData.distanceWellToBasin || '—'} />
            <SummaryRow label="Inclinaison panneaux (°)" value={formData.panelTilt || '—'} />
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runSizing}
            disabled={runLoading}
            className={getButtonClasses('primary', runLoading)}
          >
            {runLoading ? 'Calcul en cours…' : 'Lancer le calcul'}
          </button>
          <p className="text-xs text-slate-600">Les résultats s'afficheront ci-dessous (Module C).</p>
        </div>

        {runError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-semibold">Erreur de calcul</p>
            <p className="mt-1 text-sm">{runError}</p>
          </div>
        ) : null}

        {result ? (
          <ResultsDashboard result={result} client={clientForDashboard} horizonYears={10} />
        ) : null}
      </div>
    );
  };

  return (
    <section className="mx-auto w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Dimensionnement (Stepper)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Étape {currentStep + 1} / {STEPS.length} — {current.title}
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {progress}%
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-slate-900"
              style={{ width: `${progress}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {STEPS.map((step, index) => {
            const active = index === currentStep;
            const completed = index < currentStep;

            const CircleIcon = step.Icon;

            return (
              <div key={step.key} className="flex flex-col items-center text-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                    active || completed
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <CircleIcon className="h-5 w-5" />
                </div>
                <p className={`mt-2 text-xs font-medium ${active ? 'text-slate-900' : 'text-slate-600'}`}>
                  {step.title}
                </p>
              </div>
            );
          })}
        </div>
      </header>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <current.Icon className="h-5 w-5 text-slate-900" />
          <h3 className="text-base font-semibold text-slate-900">{current.title}</h3>
        </div>
        <div className="mt-4">{renderStepContent()}</div>
      </div>

      <footer className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentStep === 0}
          className={getButtonClasses('secondary', currentStep === 0)}
        >
          Précédent
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!stepValid}
            className={getButtonClasses('primary', !stepValid)}
            title={!stepValid ? 'Complète les champs obligatoires pour continuer.' : undefined}
          >
            Suivant
          </button>
        ) : (
          <div className="text-sm text-slate-600">Vérifie le résumé avant calcul.</div>
        )}
      </footer>
    </section>
  );
}
