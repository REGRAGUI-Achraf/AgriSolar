/**
 * Solar field sizing math utilities (pure functions).
 *
 * All functions are deterministic and do not access I/O or a database.
 */

const assertFiniteNumber = (name, value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
};

const assertNonNegative = (name, value) => {
  assertFiniteNumber(name, value);
  if (value < 0) {
    throw new RangeError(`${name} must be >= 0`);
  }
};

const assertPositive = (name, value) => {
  assertFiniteNumber(name, value);
  if (value <= 0) {
    throw new RangeError(`${name} must be > 0`);
  }
};

/**
 * Calcule la puissance crête requise ($P_c$) du champ solaire.
 *
 * Formule demandée :
 *  $P_c = \frac{E_{besoin}}{H_{soleil} \times PR}$
 *
 * Interprétation des unités (cohérente avec le dimensionnement PV) :
 * - $E_{besoin}$ en kWh/jour
 * - $H_{soleil}$ en "Peak Sun Hours" (h/jour)
 * - $PR$ ratio de performance (sans unité), typiquement 0.70 à 0.80
 *
 * Le résultat est retourné en Watts-crête (Wp) :
 *  $P_c(Wp) = P_c(kW) \times 1000$
 *
 * @param {number} energyNeedKWhPerDay - Énergie quotidienne nécessaire $E_{besoin}$ (kWh/jour).
 * @param {number} peakSunHoursHPerDay - Ensoleillement équivalent $H_{soleil}$ (h/jour).
 * @param {number} [performanceRatio=0.75] - Ratio de performance $PR$ (sans unité).
 * @returns {number} Puissance crête requise $P_c$ (Wp).
 */
export const calculateRequiredPeakPowerW = (
  energyNeedKWhPerDay,
  peakSunHoursHPerDay,
  performanceRatio = 0.75,
) => {
  assertNonNegative('energyNeedKWhPerDay', energyNeedKWhPerDay);
  assertPositive('peakSunHoursHPerDay', peakSunHoursHPerDay);
  assertPositive('performanceRatio', performanceRatio);

  if (energyNeedKWhPerDay === 0) return 0;

  // Pc (kW) = (kWh/day) / (h/day * -)
  const peakPowerKW = energyNeedKWhPerDay / (peakSunHoursHPerDay * performanceRatio);

  return peakPowerKW * 1000;
};

/**
 * Estime le nombre de panneaux PV nécessaires à partir d'une puissance crête cible.
 *
 * @param {number} requiredPeakPowerW - Puissance crête requise (Wp).
 * @param {number} [modulePowerW=450] - Puissance d'un module PV (W) (ex: 450W).
 * @returns {number} Nombre de panneaux (entier, arrondi au supérieur).
 */
export const estimatePanelCount = (requiredPeakPowerW, modulePowerW = 450) => {
  assertNonNegative('requiredPeakPowerW', requiredPeakPowerW);
  assertPositive('modulePowerW', modulePowerW);

  return Math.ceil(requiredPeakPowerW / modulePowerW);
};
