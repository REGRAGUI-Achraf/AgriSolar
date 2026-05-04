const DEFAULT_TTL_MS = 1000 * 60 * 60 * 12; // 12h

const cache = new Map();

const buildCacheKey = (params) => JSON.stringify(params);

const getCached = (key) => {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return null;
	}
	return entry.value;
};

const setCached = (key, value, ttlMs = DEFAULT_TTL_MS) => {
	cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const parseFinite = (value) => {
	const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
	return Number.isFinite(n) ? n : null;
};

// PVGIS API docs: https://re.jrc.ec.europa.eu/pvg_tools/en/
// We use PVcalc as a pragmatic first step.
const pvcalc = async ({ lat, lon, peakpower = 1, loss = 14, angle = 30, aspect = 0, outputformat = 'json' }) => {
	const latitude = parseFinite(lat);
	const longitude = parseFinite(lon);
	if (latitude === null || longitude === null) {
		const err = new Error('lat/lon invalides');
		err.status = 400;
		throw err;
	}

	const params = {
		lat: latitude,
		lon: longitude,
		peakpower: parseFinite(peakpower) ?? 1,
		loss: parseFinite(loss) ?? 14,
		angle: parseFinite(angle) ?? 30,
		aspect: parseFinite(aspect) ?? 0,
		outputformat,
	};

	const key = buildCacheKey(params);
	const cached = getCached(key);
	if (cached) return cached;

	const url = new URL('https://re.jrc.ec.europa.eu/api/v5_2/PVcalc');
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
	url.searchParams.set('raddatabase', 'PVGIS-SARAH2');

	const response = await fetch(url, {
		headers: {
			Accept: 'application/json',
		},
	});

	if (!response.ok) {
		const text = await response.text().catch(() => '');
		const err = new Error(`PVGIS error (${response.status})${text ? `: ${text.slice(0, 200)}` : ''}`);
		err.status = 502;
		throw err;
	}

	const data = await response.json();
	setCached(key, data);
	return data;
};

module.exports = {
	pvcalc,
};
