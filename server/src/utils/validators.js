const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const badRequest = (message) => {
	const err = new Error(message);
	err.status = 400;
	return err;
};

const parseJsonObject = (value, { fieldName = 'value', required = false } = {}) => {
	if (value === undefined || value === null || value === '') {
		if (required) throw badRequest(`${fieldName} est requis.`);
		return {};
	}

	if (typeof value === 'object' && !Array.isArray(value)) return value;

	if (typeof value === 'string') {
		try {
			const parsed = JSON.parse(value);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
		} catch {
			// ignore
		}
	}

	throw badRequest(`${fieldName} doit être un objet JSON.`);
};

const parseNumber = (value, { fieldName = 'value', required = false, min = null } = {}) => {
	if (value === undefined || value === null || value === '') {
		if (required) throw badRequest(`${fieldName} est requis.`);
		return null;
	}
	const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
	if (!Number.isFinite(n)) throw badRequest(`${fieldName} invalide.`);
	if (typeof min === 'number' && n < min) throw badRequest(`${fieldName} doit être ≥ ${min}.`);
	return n;
};

const requireString = (value, fieldName) => {
	if (!isNonEmptyString(value)) throw badRequest(`${fieldName} est requis.`);
	return String(value).trim();
};

module.exports = {
	badRequest,
	isNonEmptyString,
	parseJsonObject,
	parseNumber,
	requireString,
};
