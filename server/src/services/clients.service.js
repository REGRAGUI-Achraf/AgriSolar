const { prisma } = require('../config/db');

const listClients = async () =>
	prisma.client.findMany({
		orderBy: [{ name: 'asc' }],
		select: {
			id: true,
			name: true,
			phone: true,
			latitude: true,
			longitude: true,
		},
	});

const createClient = async ({ name, phone, latitude, longitude }) =>
	prisma.client.create({
		data: {
			name,
			phone: phone || null,
			latitude,
			longitude,
		},
		select: {
			id: true,
			name: true,
			phone: true,
			latitude: true,
			longitude: true,
		},
	});

const updateClient = async (id, { name, phone, latitude, longitude }) =>
	prisma.client.update({
		where: { id },
		data: {
			...(name !== undefined ? { name } : null),
			...(phone !== undefined ? { phone: phone || null } : null),
			...(latitude !== undefined ? { latitude } : null),
			...(longitude !== undefined ? { longitude } : null),
		},
		select: {
			id: true,
			name: true,
			phone: true,
			latitude: true,
			longitude: true,
		},
	});

const deleteClient = async (id) =>
	prisma.client.delete({
		where: { id },
		select: { id: true },
	});

module.exports = {
	listClients,
	createClient,
	updateClient,
	deleteClient,
};
