const catalogService = require('../services/catalog.service');
const { parseJsonObject, parseNumber, requireString } = require('../utils/validators');

const normalizeCategory = (value) => {
	const category = String(value || '').trim().toUpperCase();
	const allowed = new Set(['PANEL', 'PUMP', 'INVERTER', 'ACCESSORY']);
	if (!allowed.has(category)) {
		const err = new Error('category invalide (PANEL|PUMP|INVERTER|ACCESSORY).');
		err.status = 400;
		throw err;
	}
	return category;
};

const listCatalog = async (req, res, next) => {
	try {
		const items = await catalogService.listCatalog();
		res.json(items);
	} catch (err) {
		next(err);
	}
};

module.exports = {
	listCatalog,
	createProduct: async (req, res, next) => {
		try {
			const name = requireString(req.body?.name, 'name');
			const brand = req.body?.brand;
			const category = normalizeCategory(req.body?.category);
			const price = parseNumber(req.body?.price, { fieldName: 'price', required: true, min: 0 });
			const specifications = parseJsonObject(req.body?.specifications, { fieldName: 'specifications', required: false });

			const created = await catalogService.createProduct({ name, brand, category, price, specifications });
			res.status(201).json(created);
		} catch (err) {
			next(err);
		}
	},
	updateProduct: async (req, res, next) => {
		try {
			const id = String(req.params.id);
			const name = req.body?.name !== undefined ? requireString(req.body?.name, 'name') : undefined;
			const brand = req.body?.brand;
			const category = req.body?.category !== undefined ? normalizeCategory(req.body?.category) : undefined;
			const price = req.body?.price !== undefined ? parseNumber(req.body?.price, { fieldName: 'price', required: true, min: 0 }) : undefined;
			const specifications =
				req.body?.specifications !== undefined
					? parseJsonObject(req.body?.specifications, { fieldName: 'specifications', required: false })
					: undefined;

			const updated = await catalogService.updateProduct(id, { name, brand, category, price, specifications });
			res.json(updated);
		} catch (err) {
			next(err);
		}
	},
	deleteProduct: async (req, res, next) => {
		try {
			const id = String(req.params.id);
			await catalogService.deleteProduct(id);
			res.status(204).send();
		} catch (err) {
			next(err);
		}
	},
};
