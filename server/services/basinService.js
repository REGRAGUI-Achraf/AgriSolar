/**
 * Storage basin sizing math utilities (pure functions).
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
 * Calcule le volume de stockage nécessaire pour garantir une autonomie d'irrigation.
 *
 * Formule :
 *  $V_{bassin} = V_{eau\_jour} \times X$
 *
 * @param {number} dailyWaterNeedM3 - Besoin en eau quotidien (m³/jour).
 * @param {number} autonomyDays - Autonomie souhaitée $X$ (jours).
 * @returns {number} Volume de stockage recommandé (m³).
 */
export const calculateOptimalBasinVolumeM3 = (dailyWaterNeedM3, autonomyDays) => {
  assertNonNegative('dailyWaterNeedM3', dailyWaterNeedM3);
  assertNonNegative('autonomyDays', autonomyDays);

  return dailyWaterNeedM3 * autonomyDays;
};

/**
 * Calcule la surface de géomembrane (liner) nécessaire pour étanchéifier un bassin.
 *
 * Hypothèse : bassin parallélépipédique rectangle, parois verticales.
 * La surface intérieure à couvrir est :
 *  - fond : L × W
 *  - parois : 2 × D × (L + W)
 *
 * Formule :
 *  $S = (L \times W) + 2 \times D \times (L + W)$
 *
 * @param {number} lengthM - Longueur intérieure du bassin (m).
 * @param {number} widthM - Largeur intérieure du bassin (m).
 * @param {number} depthM - Profondeur intérieure du bassin (m).
 * @returns {number} Surface de liner nécessaire (m²).
 */
export const calculateGeomembraneAreaM2 = (lengthM, widthM, depthM) => {
  assertNonNegative('lengthM', lengthM);
  assertNonNegative('widthM', widthM);
  assertNonNegative('depthM', depthM);

  return (lengthM * widthM) + (2 * depthM * (lengthM + widthM));
};
