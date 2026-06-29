const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const assertFinite = (value, field) => {
	if (!isFiniteNumber(value)) {
		const err = new Error(`${field} invalide.`);
		err.status = 400;
		throw err;
	}
};

const buildRoiSeries = ({ initialInvestment, solarAnnualCost, dieselAnnualCost, horizonYears }) => {
	return Array.from({ length: horizonYears + 1 }, (_, year) => ({
		year,
		solar: initialInvestment + year * solarAnnualCost,
		diesel: year * dieselAnnualCost,
	}));
};

const guessPumpModel = (wellDepth) => {
	if (!isFiniteNumber(wellDepth)) return 'Pompe immergée (modèle à sélectionner)';
	if (wellDepth <= 25) return 'Pompe immergée 1.5kW - 6m³/h';
	if (wellDepth <= 60) return 'Pompe immergée 2.2kW - 10m³/h';
	return 'Pompe immergée 4kW - 12m³/h';
};

const runSizing = async (payload) => {
	const latitude = payload?.latitude;
	const longitude = payload?.longitude;

	assertFinite(latitude, 'latitude');
	assertFinite(longitude, 'longitude');
	if (latitude < -90 || latitude > 90) {
		const err = new Error('Latitude invalide (entre -90 et 90).');
		err.status = 400;
		throw err;
	}
	if (longitude < -180 || longitude > 180) {
		const err = new Error('Longitude invalide (entre -180 et 180).');
		err.status = 400;
		throw err;
	}

	const irrigationSurface = isFiniteNumber(payload?.irrigationSurface) ? payload.irrigationSurface : 1;
	const wellDepth = isFiniteNumber(payload?.wellDepth) ? payload.wellDepth : 30;
	const distanceWellToBasin = isFiniteNumber(payload?.distanceWellToBasin) ? payload.distanceWellToBasin : 0;

	const panelCount = clamp(Math.round(irrigationSurface * 3 + wellDepth / 10 + distanceWellToBasin / 100), 4, 60);
	const pumpModel = guessPumpModel(wellDepth);
	const basinVolume = clamp(Math.round(irrigationSurface * 80), 30, 500);

	const { prisma } = require('../config/db');
	const [panel, inverter, pump, accessory] = await Promise.all([
		prisma.product.findFirst({ where: { category: 'PANEL' }, orderBy: [{ price: 'asc' }] }),
		prisma.product.findFirst({ where: { category: 'INVERTER' }, orderBy: [{ price: 'asc' }] }),
		prisma.product.findFirst({ where: { category: 'PUMP' }, orderBy: [{ price: 'asc' }] }),
		prisma.product.findFirst({ where: { category: 'ACCESSORY' }, orderBy: [{ price: 'asc' }] }),
	]);

	if (!panel || !inverter || !pump) {
		const err = new Error('Catalogue incomplet en base (PANEL/INVERTER/PUMP requis). Lance le seed Prisma.');
		err.status = 500;
		throw err;
	}

	const currency = 'MAD';
	const panelUnitPrice = panel.price;
	const inverterUnitPrice = inverter.price;
	const pumpUnitPrice = pump.price;
	const accessoryUnitPrice = accessory?.price ?? 0;

	const totalHT = panelCount * panelUnitPrice + inverterUnitPrice + pumpUnitPrice + accessoryUnitPrice;
	const totalTTC = Math.round(totalHT * 1.07);

	const initialInvestment = totalHT;
	const solarAnnualCost = 2500;
	const dieselAnnualCost = 26000;
	const horizonYears = 10;

	return {
		panelCount,
		pumpModel: pumpModel || pump.name,
		basinVolume,
		financial: {
			currency,
			totalHT,
			totalTTC,
			initialInvestment,
		},
		materials: [
			{ name: panel.name, brand: panel.brand ?? '—', category: 'PANEL', quantity: panelCount, unitPrice: panelUnitPrice },
			{ name: inverter.name, brand: inverter.brand ?? '—', category: 'INVERTER', quantity: 1, unitPrice: inverterUnitPrice },
			{ name: pump.name, brand: pump.brand ?? '—', category: 'PUMP', quantity: 1, unitPrice: pumpUnitPrice },
			accessory
				? { name: accessory.name, brand: accessory.brand ?? '—', category: 'ACCESSORY', quantity: 1, unitPrice: accessoryUnitPrice }
				: null,
		].filter(Boolean),
		roi: {
			series: buildRoiSeries({ initialInvestment, solarAnnualCost, dieselAnnualCost, horizonYears }),
			solarAnnualCost,
			dieselAnnualCost,
			solarInitialInvestment: initialInvestment,
		},
		inputs: payload,
	};
};

module.exports = {
	runSizing,
};
