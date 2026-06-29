/**
 * Irrigation math utilities (pure functions).
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

/**
 * Calcule le volume d'eau quotidien nécessaire pour l'irrigation.
 *
 * Hypothèse de base : l'ET est exprimée en mm/jour et s'applique uniformément.
 * Conversion : 1 mm d'eau sur 1 m² = 1 litre = 0,001 m³.
 *
 * Formule :
 *  $V_{eau} = Surface \times K_c \times ET_0 \times 0.001$
 *
 * @param {number} surfaceM2 - Surface irriguée (m²).
 * @param {number} cropCoefficientKc - Coefficient cultural $K_c$ (sans unité).
 * @param {number} evapotranspirationMmPerDay - Évapotranspiration de référence $ET_0$ (mm/jour).
 * @returns {number} Volume d'eau journalier $V_{eau}$ (m³/jour).
 */
export const calculateDailyWaterNeedM3 = (
  surfaceM2,
  cropCoefficientKc,
  evapotranspirationMmPerDay,
) => {
  assertNonNegative('surfaceM2', surfaceM2);
  assertNonNegative('cropCoefficientKc', cropCoefficientKc);
  assertNonNegative('evapotranspirationMmPerDay', evapotranspirationMmPerDay);

  // (m²) * (-) * (mm/day) * (m³ per mm·m²)
  return surfaceM2 * cropCoefficientKc * evapotranspirationMmPerDay * 0.001;
};

/**
 * Calcule la Hauteur Manométrique Totale (HMT) / Total Dynamic Head (TDH).
 *
 * Dans une version simplifiée, on additionne :
 * - la profondeur de pompage (profondeur du puits),
 * - le dénivelé (différence d'altitude entre la source et le point de refoulement),
 * - les pertes de charge (tuyaux, coudes, filtres, etc.).
 *
 * Formule :
 *  $HMT = H_{puits} + H_{denivele} + H_{pertes}$
 *
 * @param {number} wellDepthM - Profondeur du puits / hauteur d'aspiration (m).
 * @param {number} elevationGainM - Dénivelé entre source et point d'usage (m).
 * @param {number} headLossesM - Pertes de charge totales (m).
 * @returns {number} HMT (m).
 */
export const calculateTotalDynamicHeadM = (
  wellDepthM,
  elevationGainM,
  headLossesM,
) => {
  assertNonNegative('wellDepthM', wellDepthM);
  assertNonNegative('elevationGainM', elevationGainM);
  assertNonNegative('headLossesM', headLossesM);

  return wellDepthM + elevationGainM + headLossesM;
};
