import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';

import { api, apiClient } from '../services/api';
import ResultsDashboard from './ResultsDashboard';

const LocationMap = lazy(() => import('./LocationMap'));

const STEP_KEYS = ['location', 'water', 'technical', 'result'];

const CROP_OPTIONS = [
  { value: 'agrumes', label: 'Agrumes (Clémentine, Orange...)' },
  { value: 'avocatier', label: 'Avocatier' },
  { value: 'bananier', label: 'Bananier' },
  { value: 'cereales', label: 'Céréales' },
  { value: 'cultures-sucrieres', label: 'Cultures sucrières (Betterave, Canne à sucre)' },
  { value: 'fruits-rouges', label: 'Fruits rouges (Fraise, Framboise, Myrtille)' },
  { value: 'luzerne-fourrage', label: 'Luzerne / Fourrage' },
  { value: 'maraichage-divers', label: 'Maraîchage divers' },
  { value: 'olivier', label: 'Olivier' },
  { value: 'tomate-industrielle', label: 'Tomate industrielle' },
];

const WATER_NEEDS_PER_HA = {
  agrumes: 40,
  avocatier: 50,
  bananier: 60,
  cereales: 20,
  'cultures-sucrieres': 50,
  'fruits-rouges': 45,
  'luzerne-fourrage': 60,
  'maraichage-divers': 40,
  olivier: 30,
  'tomate-industrielle': 45,
};

const TECH_INSTALLATION_OPTIONS = [
  { value: 'pompage-direct', label: 'Pompage direct (Puits → Bassin)' },
  { value: 'reprise', label: 'Reprise (Bassin → Irrigation)' },
  { value: 'fil-de-leau', label: "Fil de l'eau (Puits → Réseau)" },
];

const SYSTEM_TENSION_OPTIONS = [
  { value: '380V', label: 'Triphasé (380V)' },
  { value: '220V', label: 'Monophasé (220V)' },
];

const OPTIMAL_TILT_DEGREES = 30;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const parseFiniteNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatNumber = (value, fractionDigits = 0) => {
  const num = parseFiniteNumber(value);
  if (num === null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(num);
};

const getOptionLabel = (options, value) => {
  if (!Array.isArray(options)) return String(value || '—');
  const option = options.find((item) => item.value === value);
  return option?.label ?? (value || '—');
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const toErrorMessage = (error) => {
  if (!error) return 'Erreur inconnue.';

  if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
    return null;
  }

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
  const { requireClientSelection, isNewClient } = options;

  const errors = {};

  const latitude = parseFiniteNumber(formData.latitude);
  const longitude = parseFiniteNumber(formData.longitude);

  if (stepIndex === 0) {
    if (isNewClient || !requireClientSelection) {
      if (!isNonEmptyString(formData.clientName)) {
        errors.clientName = 'Renseigne le client.';
      }
    } else if (!isNonEmptyString(formData.clientId)) {
      errors.clientId = 'Sélectionne un client.';
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
    const dailyWaterNeed = parseFiniteNumber(formData.dailyWaterNeed);

    if (!isNonEmptyString(formData.cropType)) {
      errors.cropType = 'Choisis une culture.';
    }

    if (irrigationSurface === null || irrigationSurface <= 0) {
      errors.irrigationSurface = 'Surface invalide (doit être > 0).';
    }

    if (wellDepth === null || wellDepth <= 0) {
      errors.wellDepth = 'Profondeur invalide (doit être > 0).';
    }

    if (dailyWaterNeed === null || dailyWaterNeed <= 0) {
      errors.dailyWaterNeed = 'Volume invalide (doit être > 0).';
    }
  }

  if (stepIndex === 2) {
    const typeInstallation = formData.typeInstallation;
    const selectedPanelId = formData.selectedPanelId;
    const selectedPumpId = formData.selectedPumpId;
    const selectedInverterId = formData.selectedInverterId;
    const tension = formData.tension;
    const distanceWellToBasin = parseFiniteNumber(formData.distanceWellToBasin);
    const panelTilt = parseFiniteNumber(formData.panelTilt);

    if (!isNonEmptyString(typeInstallation)) {
      errors.typeInstallation = "Choisis un type d'installation.";
    }

    if (distanceWellToBasin === null || distanceWellToBasin < 0) {
      errors.distanceWellToBasin = 'Distance invalide (doit être ≥ 0).';
    }

    if (!isNonEmptyString(selectedPanelId)) {
      errors.selectedPanelId = 'Choisis un modèle de panneau.';
    }

    if (!isNonEmptyString(selectedPumpId)) {
      errors.selectedPumpId = 'Choisis un modèle de pompe.';
    }

    if (!isNonEmptyString(selectedInverterId)) {
      errors.selectedInverterId = 'Choisis un variateur.';
    }

    if (!isNonEmptyString(tension)) {
      errors.tension = 'Choisis la tension du système.';
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

const extractClientCoordinates = (client) => {
  if (!client || typeof client !== 'object') return { latitude: null, longitude: null };

  const latitude = parseFiniteNumber(client.latitude ?? client.lat ?? client.coords?.latitude);
  const longitude = parseFiniteNumber(client.longitude ?? client.lng ?? client.lon ?? client.coords?.longitude);

  return { latitude, longitude };
};

const hasValidCoordinates = (latitude, longitude) => {
  return latitude !== null && longitude !== null && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

const LocationPreview = ({ latitude, longitude }) => {
  const isReady = hasValidCoordinates(latitude, longitude);

  return (
    <Suspense
      fallback={
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Aperçu de la position</p>
            <p className="mt-1 text-xs text-slate-500">Chargement de la carte interactive…</p>
          </div>
          <div className="flex h-72 items-center justify-center bg-slate-50 text-sm text-slate-500">
            Carte en cours de chargement…
          </div>
        </div>
      }
    >
      <LocationMap latitude={isReady ? Number(latitude) : null} longitude={isReady ? Number(longitude) : null} />
    </Suspense>
  );
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
  const canSelectExistingClient = requireClientSelection;

  const [availablePanels, setAvailablePanels] = useState([]);
  const [availablePumps, setAvailablePumps] = useState([]);
  const [availableInverters, setAvailableInverters] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const [isCalculating, setIsCalculating] = useState(true);
  const [sizingResult, setSizingResult] = useState(null);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectSavedAt, setProjectSavedAt] = useState(null);
  const [projectSaveError, setProjectSaveError] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);

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
    dailyWaterNeed: '', // m³/jour

    // Step 3
    typeInstallation: '',
    useOptimalTilt: true,
    selectedPanelId: '',
    selectedPumpId: '',
    selectedInverterId: '',
    tension: '',
    distanceWellToBasin: '', // m
    panelTilt: String(OPTIMAL_TILT_DEGREES), // deg
  });

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState(null);
  const [result, setResult] = useState(null);

  const [quoteSaving, setQuoteSaving] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const [savedQuote, setSavedQuote] = useState(null);

  const options = useMemo(() => ({ requireClientSelection, isNewClient }), [requireClientSelection, isNewClient]);

  const stepErrors = useMemo(() => validateStep(currentStep, formData, options), [currentStep, formData, options]);
  const stepValid = Object.keys(stepErrors).length === 0;
  const canGoNext = currentStep === 2 ? stepValid && !isLoadingCatalog : stepValid;

  const progress = useMemo(() => {
    const ratio = (currentStep + 1) / STEP_KEYS.length;
    return clamp(Math.round(ratio * 100), 0, 100);
  }, [currentStep]);

  const current = STEPS[currentStep];

  const updateForm = (patch) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      setIsLoadingCatalog(true);

      try {
        const response = await apiClient.get('/api/catalog/materials');
        if (!isMounted) return;

        const mappedPanels = (response.data.panneaux || []).map((p) => ({
          ...p,
          name: `${p.marque} ${p.modele}`,
          power: Number(p.puissanceCrete),
        }));

        setAvailablePanels(mappedPanels);
        setAvailablePumps(response.data.pompes || []);
        setAvailableInverters(response.data.variateurs || []);
      } catch (err) {
        console.error('Failed to load materials catalog', err);
      } finally {
        if (isMounted) {
          setIsLoadingCatalog(false);
        }
      }
    };

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const cropType = formData.cropType;
    const irrigationSurface = parseFiniteNumber(formData.irrigationSurface);

    if (!cropType || !WATER_NEEDS_PER_HA[cropType] || irrigationSurface === null || irrigationSurface <= 0) {
      return;
    }

    const waterNeedPerHa = WATER_NEEDS_PER_HA[cropType];
    const calculatedVolume = Math.ceil(irrigationSurface * waterNeedPerHa);

    updateForm({ dailyWaterNeed: String(calculatedVolume) });
  }, [formData.cropType, formData.irrigationSurface]);

  useEffect(() => {
    if (!formData.useOptimalTilt) return;

    if (formData.panelTilt !== String(OPTIMAL_TILT_DEGREES)) {
      updateForm({ panelTilt: String(OPTIMAL_TILT_DEGREES) });
    }
  }, [formData.useOptimalTilt, formData.panelTilt]);

  useEffect(() => {
    if (currentStep !== 3) return;

    let isActive = true;
    setIsCalculating(true);
    setSizingResult(null);
    setProjectSavedAt(null);
    setProjectSaveError(null);
    setPdfError(null);

    const timer = setTimeout(() => {
      if (!isActive) return;

      const selectedPanel =
        availablePanels.find((panel) => String(panel.id) === String(formData.selectedPanelId)) ?? availablePanels[0] ?? null;
      const selectedPump =
        availablePumps.find((pump) => String(pump.id) === String(formData.selectedPumpId)) ?? availablePumps[0] ?? null;
      const selectedInverter =
        availableInverters.find((inv) => String(inv.id) === String(formData.selectedInverterId)) ?? availableInverters[0] ?? null;

      const latitude = parseFiniteNumber(formData.latitude);
      const longitude = parseFiniteNumber(formData.longitude);
      const dailyWaterNeed = parseFiniteNumber(formData.dailyWaterNeed) ?? 0;
      const distanceWellToBasin = parseFiniteNumber(formData.distanceWellToBasin) ?? 0;
      const panelPowerW = selectedPanel?.power ?? 550;

      const totalPowerKw = Math.max(1, Math.round(((dailyWaterNeed / 45) + (distanceWellToBasin / 150)) * 10) / 10);
      const panelCount = Math.max(2, Math.ceil((totalPowerKw * 1000) / panelPowerW));
      const panelSeries = formData.tension === '380V' ? 3 : 2;
      const panelParallel = Math.max(1, Math.ceil(panelCount / panelSeries));

      setSizingResult({
        project: {
          clientLabel: requireClientSelection
            ? extractClientById(clients, formData.clientId)?.name ?? formData.clientName ?? '—'
            : formData.clientName || '—',
          locationLabel:
            latitude !== null && longitude !== null ? `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}` : '—',
          cultureLabel: getOptionLabel(CROP_OPTIONS, formData.cropType),
          dailyWaterNeed,
          distanceWellToBasin,
        },
        technical: {
          installationLabel: getOptionLabel(TECH_INSTALLATION_OPTIONS, formData.typeInstallation),
          totalPowerKw,
          panelCount,
          panelSeries,
          panelParallel,
          panelLabel: selectedPanel ? `${selectedPanel.name} (${selectedPanel.power} Wc)` : '—',
          pumpLabel: selectedPump ? `${selectedPump.marque} ${selectedPump.modele} (${selectedPump.puissance} kW)` : '—',
          inverterLabel: selectedInverter ? `${selectedInverter.marque} ${selectedInverter.modele} (${selectedInverter.puissanceMax} kW)` : '—',
          tensionLabel: getOptionLabel(SYSTEM_TENSION_OPTIONS, formData.tension),
          tiltLabel: formData.useOptimalTilt ? `Optimal (${OPTIMAL_TILT_DEGREES}°)` : `${formData.panelTilt || '—'}°`,
        },
      });

      setIsCalculating(false);
    }, 1500);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [
    availablePanels,
    availablePumps,
    currentStep,
    formData.clientId,
    formData.clientName,
    formData.cropType,
    formData.dailyWaterNeed,
    formData.distanceWellToBasin,
    formData.latitude,
    formData.longitude,
    formData.panelTilt,
    formData.selectedPanelId,
    formData.selectedPumpId,
    formData.selectedInverterId,
    formData.tension,
    formData.typeInstallation,
    formData.useOptimalTilt,
    requireClientSelection,
    clients,
  ]);

  const handleSelectClient = (event) => {
    const selectedId = event.target.value;
    const selected = extractClientById(clients, selectedId);
    const coordinates = extractClientCoordinates(selected);

    setIsNewClient(false);
    updateForm({
      clientId: selectedId,
      clientName: selected?.name ?? '',
      // TODO: si le client est édité plus tard, garder ces coordonnées synchronisées côté fiche client.
      latitude: coordinates.latitude !== null ? String(coordinates.latitude) : formData.latitude,
      longitude: coordinates.longitude !== null ? String(coordinates.longitude) : formData.longitude,
    });
  };

  const toggleClientMode = () => {
    setShowErrors(false);
    setIsNewClient((previous) => {
      const next = !previous;
      updateForm({ clientId: '', clientName: '' });
      return next;
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
    } catch (error) {
      if (error?.code === 1 || error?.name === 'NotAllowedError') {
        setGpsError('Accès à la géolocalisation refusé. Autorise la permission puis réessaie.');
      } else if (error?.code === 2) {
        setGpsError('Position GPS indisponible pour le moment.');
      } else if (error?.code === 3) {
        setGpsError('Délai de géolocalisation dépassé.');
      } else {
        setGpsError("Impossible de récupérer la position GPS.");
      }
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
    if (!canGoNext) {
      setShowErrors(true);
      return;
    }

    setShowErrors(false);
    setGpsError(null);
    setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const runSizing = async () => {
    setRunError(null);
    setQuoteError(null);
    setSavedQuote(null);
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
      clientId: !isNewClient && requireClientSelection ? formData.clientId : undefined,
      clientName: isNewClient || !requireClientSelection ? formData.clientName : undefined,
      latitude: parseFiniteNumber(formData.latitude),
      longitude: parseFiniteNumber(formData.longitude),
      cropType: formData.cropType,
      irrigationSurface: parseFiniteNumber(formData.irrigationSurface),
      wellDepth: parseFiniteNumber(formData.wellDepth),
      dailyWaterNeed: parseFiniteNumber(formData.dailyWaterNeed),
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

  const getCalculatedMaterialsAndPrice = (effectiveResult) => {
    const dailyWaterNeed = parseFiniteNumber(formData.dailyWaterNeed) ?? 0;
    const selectedPanel = availablePanels.find((panel) => String(panel.id) === String(formData.selectedPanelId)) ?? null;
    const selectedPump = availablePumps.find((pump) => String(pump.id) === String(formData.selectedPumpId)) ?? null;
    const selectedInverter = availableInverters.find((inv) => String(inv.id) === String(formData.selectedInverterId)) ?? null;
    const panelCount = Math.max(1, Number(effectiveResult.technical?.panelCount || 1));
    const distanceWellToBasin = parseFiniteNumber(formData.distanceWellToBasin) ?? 0;

    const resultFinancial = effectiveResult.financial ?? {};
    const baseTotalPrice = Math.max(
      0,
      Number.isFinite(resultFinancial.totalHT)
        ? resultFinancial.totalHT
        : Number.isFinite(resultFinancial.totalPrice)
        ? resultFinancial.totalPrice
        : Math.round((effectiveResult.technical?.totalPowerKw || 0) * 1200),
    );

    const materials = [];

    if (selectedPanel) {
      materials.push({
        name: selectedPanel.name || 'Panneaux photovoltaïques',
        brand: selectedPanel.marque || 'Panneau',
        quantity: panelCount,
        unitPriceHT: Number(selectedPanel.prixIndicatif) || Math.round(baseTotalPrice * 0.42 / panelCount),
      });
    } else if (effectiveResult.materials?.find(m => m.category === 'PANEL')) {
      const p = effectiveResult.materials.find(m => m.category === 'PANEL');
      materials.push({
        name: p.name || 'Panneaux photovoltaïques',
        brand: p.brand || 'Panneau',
        quantity: p.quantity || panelCount,
        unitPriceHT: p.unitPrice || p.unitPriceHT || Math.round(baseTotalPrice * 0.42 / panelCount),
      });
    }

    if (selectedPump) {
      materials.push({
        name: `${selectedPump.marque} ${selectedPump.modele}`,
        brand: selectedPump.marque || 'Pompe Hydraulique',
        quantity: 1,
        unitPriceHT: Number(selectedPump.prixIndicatif) || 15000,
      });
    } else if (effectiveResult.materials?.find(m => m.category === 'PUMP')) {
      const p = effectiveResult.materials.find(m => m.category === 'PUMP');
      materials.push({
        name: p.name || 'Pompe',
        brand: p.brand || '—',
        quantity: p.quantity || 1,
        unitPriceHT: p.unitPrice || p.unitPriceHT || 15000,
      });
    }

    if (selectedInverter) {
      materials.push({
        name: `${selectedInverter.marque} ${selectedInverter.modele}`,
        brand: selectedInverter.marque,
        quantity: 1,
        unitPriceHT: Number(selectedInverter.prixIndicatif) || 5000,
      });
    } else if (effectiveResult.materials?.find(m => m.category === 'INVERTER')) {
      const p = effectiveResult.materials.find(m => m.category === 'INVERTER');
      materials.push({
        name: p.name || 'Variateur',
        brand: p.brand || '—',
        quantity: p.quantity || 1,
        unitPriceHT: p.unitPrice || p.unitPriceHT || 5000,
      });
    }
    
    // Calculate total materials price to infer accessories price
    const materialsTotal = materials.reduce((sum, item) => sum + (item.quantity * item.unitPriceHT), 0);
    const accessoriesPrice = Math.max(0, baseTotalPrice - materialsTotal);

    materials.push({
      name: 'Accessoires & Tuyauterie',
      brand: `Distance ${distanceWellToBasin} m`,
      quantity: 1,
      unitPriceHT: accessoriesPrice,
    });

    const realTotalHT = materialsTotal + accessoriesPrice;

    return {
      materials,
      realTotalHT,
      selectedPanel,
      selectedPump,
      selectedInverter,
      panelCount,
      distanceWellToBasin,
      dailyWaterNeed
    };
  };

  const buildQuotePayload = () => {
    const selectedClient = requireClientSelection ? extractClientById(clients, formData.clientId) : null;

    if (!selectedClient?.id) {
      throw new Error('Sélectionne un client enregistré pour sauvegarder le devis.');
    }

    const effectiveResult = result || sizingResult;
    if (!effectiveResult) {
      throw new Error('Le dimensionnement doit être calculé avant de générer le devis.');
    }

    const {
      materials,
      realTotalHT,
      selectedPanel,
      selectedPump,
      selectedInverter,
      panelCount,
      distanceWellToBasin,
      dailyWaterNeed
    } = getCalculatedMaterialsAndPrice(effectiveResult);

    const payload = {
      clientId: selectedClient.id,
      inputs: {
        clientId: selectedClient.id,
        cropType: formData.cropType,
        wellDepth: parseFiniteNumber(formData.wellDepth),
        irrigationSurface: parseFiniteNumber(formData.irrigationSurface),
        dailyWaterNeed,
        typeInstallation: formData.typeInstallation,
        useOptimalTilt: formData.useOptimalTilt,
        selectedPanelId: formData.selectedPanelId,
        selectedPanelLabel: selectedPanel?.name || effectiveResult.technical?.panelLabel || 'Panneau photovoltaïque',
        selectedPumpId: formData.selectedPumpId,
        selectedPumpLabel: selectedPump ? `${selectedPump.marque} ${selectedPump.modele}` : 'Pompe',
        selectedInverterId: formData.selectedInverterId,
        selectedInverterLabel: selectedInverter ? `${selectedInverter.marque} ${selectedInverter.modele}` : 'Variateur',
        tension: formData.tension,
        distanceWellToBasin,
        panelTilt: parseFiniteNumber(formData.panelTilt),
        latitude: parseFiniteNumber(formData.latitude),
        longitude: parseFiniteNumber(formData.longitude),
      },
      result: {
        panelCount: panelCount,
        pumpModel: selectedPump ? `${selectedPump.marque} ${selectedPump.modele}` : effectiveResult.technical?.pumpLabel,
        inverterModel: selectedInverter ? `${selectedInverter.marque} ${selectedInverter.modele}` : null,
        basinVolume: effectiveResult.basinVolume ?? Math.max(10, Math.ceil(dailyWaterNeed * 2.5)),
        financial: {
          totalHT: realTotalHT,
          tva: Math.round(realTotalHT * 0.2),
          totalTTC: Math.round(realTotalHT * 1.2),
        },
        materials: materials,
        roi: effectiveResult.roi ?? null,
      },
      totalPrice: realTotalHT,
      dailyWaterNeed,
      requiredPower: effectiveResult.technical?.totalPowerKw ?? 0,
      notes: JSON.stringify({
        typeInstallation: formData.typeInstallation,
        materials: materials,
      }),
    };

    return { payload, selectedClient };
  };

  const saveQuote = async () => {
    setQuoteError(null);
    setQuoteSaving(true);

    try {
      const { payload } = buildQuotePayload();
      const created = await api.createQuote(payload);
      setSavedQuote(created);
      setProjectSavedAt(new Date());
      return created;
    } catch (err) {
      const message = toErrorMessage(err) || 'Impossible d’enregistrer le projet.';
      setQuoteError(message);
      return null;
    } finally {
      setQuoteSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setPdfError(null);
    setPdfGenerating(true);

    try {
      let quote = savedQuote;

      if (!quote?.id) {
        quote = await saveQuote();
      }

      if (!quote?.id) {
        return;
      }

      const { blob, filename } = await api.downloadQuotePdf(quote.id);
      if (!blob) {
        throw new Error('Le PDF n’a pas pu être généré.');
      }

      downloadBlob(blob, filename);
    } catch (err) {
      const message = toErrorMessage(err) || 'Impossible de générer le devis PDF.';
      setPdfError(message);
    } finally {
      setPdfGenerating(false);
    }
  };

  const renderStepContent = () => {
    if (current.key === 'location') {
      const selectedClient = requireClientSelection ? extractClientById(clients, formData.clientId) : null;
      const selectedCoordinates = extractClientCoordinates(selectedClient);
      const liveLatitude = parseFiniteNumber(formData.latitude);
      const liveLongitude = parseFiniteNumber(formData.longitude);
      const previewLatitude = hasValidCoordinates(liveLatitude, liveLongitude) ? liveLatitude : selectedCoordinates.latitude;
      const previewLongitude = hasValidCoordinates(liveLatitude, liveLongitude) ? liveLongitude : selectedCoordinates.longitude;

      return (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-slate-900">
                Client<span className="text-red-600"> *</span>
              </label>

              {canSelectExistingClient ? (
                <button
                  type="button"
                  onClick={toggleClientMode}
                  className="text-xs font-medium text-slate-600 transition-colors hover:text-slate-900"
                >
                  {isNewClient ? 'Client existant' : '+ Nouveau client'}
                </button>
              ) : null}
            </div>

            <div className="mt-1">
              {canSelectExistingClient && !isNewClient ? (
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
              ) : (
                <input
                  type="text"
                  className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                    showErrors && stepErrors.clientName ? 'border-red-300' : 'border-slate-200'
                  }`}
                  placeholder="Nom du nouveau client..."
                  value={formData.clientName}
                  onChange={(e) => {
                    setIsNewClient(true);
                    updateForm({ clientId: '', clientName: e.target.value });
                  }}
                />
              )}
            </div>

            {canSelectExistingClient && !isNewClient ? (
              <p className="mt-1 text-xs text-slate-500">
                Sélectionne un client existant pour reprendre ses coordonnées automatiquement.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Coordonnées de localisation</p>
              <p className="text-xs text-slate-600">Latitude/Longitude sont requises pour le calcul PVGIS.</p>
            </div>
            <button
              type="button"
              onClick={handleGetGps}
              disabled={gpsLoading}
              className={getButtonClasses('secondary', gpsLoading)}
            >
              {gpsLoading ? '📍 Localisation…' : '📍 Me localiser'}
            </button>
          </div>

          {gpsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{gpsError}</div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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

            <LocationPreview latitude={previewLatitude} longitude={previewLongitude} />
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

          <Field
            label="Volume journalier (m³/jour)"
            required
            error={showErrors ? stepErrors.dailyWaterNeed : null}
            hint="Calculé automatiquement (modifiable)"
          >
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                showErrors && stepErrors.dailyWaterNeed ? 'border-red-300' : 'border-slate-200'
              }`}
              value={formData.dailyWaterNeed}
              onChange={(e) => updateForm({ dailyWaterNeed: e.target.value })}
            />
          </Field>
        </div>
      );
    }

    if (current.key === 'technical') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-900">A. Configuration Hydraulique</h4>
              <p className="mt-1 text-xs text-slate-500">Paramètres de circulation et de transfert de l’eau.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Type d'installation"
                required
                error={showErrors ? stepErrors.typeInstallation : null}
              >
                <select
                  className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                    showErrors && stepErrors.typeInstallation ? 'border-red-300' : 'border-slate-200'
                  }`}
                  value={formData.typeInstallation}
                  onChange={(e) => updateForm({ typeInstallation: e.target.value })}
                >
                  <option value="">— Choisir un type d'installation —</option>
                  {TECH_INSTALLATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

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
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-900">B. Panneaux & Inclinaison</h4>
              <p className="mt-1 text-xs text-slate-500">Sélection du module PV et réglage d’angle.</p>
            </div>

            <div className="space-y-4">
              <Field
                label="Modèle de Panneau"
                required
                error={showErrors ? stepErrors.selectedPanelId : null}
              >
                <select
                  className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                    showErrors && stepErrors.selectedPanelId ? 'border-red-300' : 'border-slate-200'
                  }`}
                  value={formData.selectedPanelId}
                  onChange={(e) => updateForm({ selectedPanelId: e.target.value })}
                  disabled={isLoadingCatalog}
                >
                  {isLoadingCatalog ? (
                    <option value="">Chargement...</option>
                  ) : (
                    <>
                      <option value="">— Choisir un panneau —</option>
                      {availablePanels.map((panel) => (
                        <option key={panel.id} value={panel.id}>
                          {panel.name} — {panel.power} Wc
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </Field>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    checked={formData.useOptimalTilt}
                    onChange={(e) => updateForm({ useOptimalTilt: e.target.checked })}
                  />
                  Utiliser l'inclinaison optimale (30°)
                </label>
              </div>

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
                  disabled={formData.useOptimalTilt}
                  className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                    showErrors && stepErrors.panelTilt ? 'border-red-300' : 'border-slate-200'
                  }`}
                  value={formData.useOptimalTilt ? String(OPTIMAL_TILT_DEGREES) : formData.panelTilt}
                  onChange={(e) => updateForm({ panelTilt: e.target.value, useOptimalTilt: false })}
                />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-900">C. Pompe & Électricité</h4>
              <p className="mt-1 text-xs text-slate-500">Choix de la pompe, du variateur et de la tension.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Modèle de la Pompe"
                required
                error={showErrors ? stepErrors.selectedPumpId : null}
              >
                <select
                  className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                    showErrors && stepErrors.selectedPumpId ? 'border-red-300' : 'border-slate-200'
                  }`}
                  value={formData.selectedPumpId}
                  onChange={(e) => updateForm({ selectedPumpId: e.target.value })}
                  disabled={isLoadingCatalog}
                >
                  {isLoadingCatalog ? (
                    <option value="">Chargement...</option>
                  ) : (
                    <>
                      <option value="">— Choisir une pompe —</option>
                      {availablePumps.map((pump) => (
                        <option key={pump.id} value={pump.id}>
                          {pump.marque} {pump.modele} ({Number(pump.puissance)} kW)
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </Field>

              <Field
                label="Modèle du Variateur"
                required
                error={showErrors ? stepErrors.selectedInverterId : null}
              >
                <select
                  className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                    showErrors && stepErrors.selectedInverterId ? 'border-red-300' : 'border-slate-200'
                  }`}
                  value={formData.selectedInverterId}
                  onChange={(e) => updateForm({ selectedInverterId: e.target.value })}
                  disabled={isLoadingCatalog}
                >
                  {isLoadingCatalog ? (
                    <option value="">Chargement...</option>
                  ) : (
                    <>
                      <option value="">— Choisir un variateur —</option>
                      {availableInverters.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.marque} {inv.modele} ({Number(inv.puissanceMax)} kW)
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </Field>

              <Field
                label="Tension du système"
                required
                error={showErrors ? stepErrors.tension : null}
              >
                <select
                  className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                    showErrors && stepErrors.tension ? 'border-red-300' : 'border-slate-200'
                  }`}
                  value={formData.tension}
                  onChange={(e) => updateForm({ tension: e.target.value })}
                >
                  <option value="">— Choisir une tension —</option>
                  {SYSTEM_TENSION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
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

        {result ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <button
              type="button"
              onClick={saveQuote}
              disabled={quoteSaving || !requireClientSelection || !formData.clientId}
              className={getButtonClasses('secondary', quoteSaving || !requireClientSelection || !formData.clientId)}
              title={!requireClientSelection || !formData.clientId ? 'Choisis un client enregistré pour sauvegarder le devis.' : undefined}
            >
              {quoteSaving ? 'Sauvegarde…' : 'Sauvegarder le devis'}
            </button>
            <p className="text-xs text-slate-600">
              Le devis sera enregistré dans l’historique et disponible en PDF.
            </p>
          </div>
        ) : null}

        {quoteError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{quoteError}</div>
        ) : null}

        {savedQuote ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Devis enregistré: {savedQuote.quoteNumber || savedQuote.id}
          </div>
        ) : null}

        {runError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-semibold">Erreur de calcul</p>
            <p className="mt-1 text-sm">{runError}</p>
          </div>
        ) : null}

        {result ? (
          (() => {
            const { materials, realTotalHT, selectedPump, selectedInverter } = getCalculatedMaterialsAndPrice(result);
            
            const dashboardResult = {
              ...result,
              pumpModel: selectedPump ? `${selectedPump.marque} ${selectedPump.modele}` : result.pumpModel,
              inverterModel: selectedInverter ? `${selectedInverter.marque} ${selectedInverter.modele}` : (result.inverterModel || null),
              financial: {
                ...result.financial,
                totalHT: realTotalHT,
                tva: Math.round(realTotalHT * 0.2),
                totalTTC: Math.round(realTotalHT * 1.2),
              }
            };

            return (
              <ResultsDashboard
                result={dashboardResult}
                client={clientForDashboard}
                horizonYears={10}
                onDownloadPdf={handleDownloadPDF}
              />
            );
          })()
        ) : null}
      </div>
    );
  };

  return (
    <section className="mx-auto w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Dimensionnement</h2>
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
        <div>
          {currentStep > 0 ? (
            <button type="button" onClick={goPrev} className={getButtonClasses('secondary', false)}>
              Précédent
            </button>
          ) : null}
        </div>

        {currentStep < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className={getButtonClasses('primary', !canGoNext)}
            title={!canGoNext ? 'Complète les champs obligatoires pour continuer.' : undefined}
          >
            Suivant
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={saveQuote}
              disabled={projectSaving || isCalculating}
              className={getButtonClasses('secondary', projectSaving || isCalculating)}
            >
              {projectSaving ? 'Enregistrement…' : 'Enregistrer le projet'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={pdfGenerating || isCalculating || (!result && !savedQuote)}
              className={getButtonClasses('primary', pdfGenerating || isCalculating || (!result && !savedQuote))}
              title={!result && !savedQuote ? 'Exécute le calcul puis enregistre le devis pour générer le PDF.' : undefined}
            >
              {pdfGenerating ? 'Génération…' : 'Générer le Devis PDF'}
            </button>
          </div>
        )}
      </footer>
    </section>
  );
}
