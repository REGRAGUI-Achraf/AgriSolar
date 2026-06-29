const { prisma } = require('../config/db');

const listClients = async () =>
	prisma.client.findMany({
		where: { deletedAt: null },
		orderBy: [{ name: 'asc' }],
		select: {
			id: true,
			name: true,
			phone: true,
			email: true,
			address: true,
			city: true,
			region: true,
			country: true,
			notes: true,
			latitude: true,
			longitude: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
		},
	});

const createClient = async ({ name, phone, email, address, city, region, country, notes, latitude, longitude }) =>
	prisma.client.create({
		data: {
			name,
			phone: phone || null,
			email: email || null,
			address: address || null,
			city: city || null,
			region: region || null,
			country: country || null,
			notes: notes || null,
			latitude,
			longitude,
		},
		select: {
			id: true,
			name: true,
			phone: true,
			email: true,
			address: true,
			city: true,
			region: true,
			country: true,
			notes: true,
			latitude: true,
			longitude: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
		},
	});

const updateClient = async (id, { name, phone, email, address, city, region, country, notes, latitude, longitude }) =>
	prisma.client.update({
		where: { id },
		data: {
			...(name !== undefined ? { name } : null),
			...(phone !== undefined ? { phone: phone || null } : null),
			...(email !== undefined ? { email: email || null } : null),
			...(address !== undefined ? { address: address || null } : null),
			...(city !== undefined ? { city: city || null } : null),
			...(region !== undefined ? { region: region || null } : null),
			...(country !== undefined ? { country: country || null } : null),
			...(notes !== undefined ? { notes: notes || null } : null),
			...(latitude !== undefined ? { latitude } : null),
			...(longitude !== undefined ? { longitude } : null),
		},
		select: {
			id: true,
			name: true,
			phone: true,
			email: true,
			address: true,
			city: true,
			region: true,
			country: true,
			notes: true,
			latitude: true,
			longitude: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
		},
	});

const deleteClient = async (id) =>
	prisma.client.update({
		where: { id },
		data: { deletedAt: new Date() },
		select: { id: true },
	});

module.exports = {
	listClients,
	createClient,
	updateClient,
	deleteClient,
};
