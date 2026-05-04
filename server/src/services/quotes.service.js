const { prisma } = require('../config/db');

const listQuotes = async () =>
	prisma.quote.findMany({
		orderBy: [{ createdAt: 'desc' }],
		include: {
			client: { select: { id: true, name: true, phone: true, latitude: true, longitude: true } },
			user: { select: { id: true, email: true, role: true } },
		},
	});

const getQuoteById = async (id) =>
	prisma.quote.findUnique({
		where: { id },
		include: {
			client: { select: { id: true, name: true, phone: true, latitude: true, longitude: true } },
			user: { select: { id: true, email: true, role: true } },
		},
	});

const findDefaultSalesUserId = async () => {
	const user = await prisma.user.findFirst({ where: { role: 'SALES' }, select: { id: true } });
	return user?.id ?? null;
};

const createQuote = async (data) => prisma.quote.create({ data, include: { client: true, user: true } });

module.exports = {
	listQuotes,
	getQuoteById,
	findDefaultSalesUserId,
	createQuote,
};
