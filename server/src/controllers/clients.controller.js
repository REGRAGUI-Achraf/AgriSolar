const clientsService = require('../services/clients.service');
const { parseNumber, requireString } = require('../utils/validators');

const listClients = async (req, res, next) => {
	try {
		const clients = await clientsService.listClients();
		res.json(clients);
	} catch (err) {
		next(err);
	}
};

const createClient = async (req, res, next) => {
	try {
		const name = requireString(req.body?.name, 'name');
		const phone = req.body?.phone;
		const email = req.body?.email;
		const address = req.body?.address;
		const city = req.body?.city;
		const region = req.body?.region;
		const country = req.body?.country;
		const notes = req.body?.notes;
		const latitude = parseNumber(req.body?.latitude, { fieldName: 'latitude', required: true });
		const longitude = parseNumber(req.body?.longitude, { fieldName: 'longitude', required: true });

		const client = await clientsService.createClient({ name, phone, email, address, city, region, country, notes, latitude, longitude });
		res.status(201).json(client);
	} catch (err) {
		next(err);
	}
};

const updateClient = async (req, res, next) => {
	try {
		const id = String(req.params.id);
		const name = req.body?.name !== undefined ? requireString(req.body?.name, 'name') : undefined;
		const phone = req.body?.phone;
		const email = req.body?.email;
		const address = req.body?.address;
		const city = req.body?.city;
		const region = req.body?.region;
		const country = req.body?.country;
		const notes = req.body?.notes;
		const latitude = req.body?.latitude !== undefined ? parseNumber(req.body?.latitude, { fieldName: 'latitude', required: true }) : undefined;
		const longitude = req.body?.longitude !== undefined ? parseNumber(req.body?.longitude, { fieldName: 'longitude', required: true }) : undefined;

		const client = await clientsService.updateClient(id, { name, phone, email, address, city, region, country, notes, latitude, longitude });
		res.json(client);
	} catch (err) {
		next(err);
	}
};

const deleteClient = async (req, res, next) => {
	try {
		const id = String(req.params.id);
		await clientsService.deleteClient(id);
		res.status(204).send();
	} catch (err) {
		next(err);
	}
};

module.exports = {
	listClients,
	createClient,
	updateClient,
	deleteClient,
};
