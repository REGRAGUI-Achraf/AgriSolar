const { prisma } = require('../config/db');

const listCatalog = async () => {
	return prisma.product.findMany({
		orderBy: [{ category: 'asc' }, { name: 'asc' }],
	});
};

const createProduct = async ({ name, brand, category, price, specifications }) =>
	prisma.product.create({
		data: {
			name,
			brand: brand || null,
			category,
			price,
			specifications: specifications ?? {},
		},
	});

const updateProduct = async (id, { name, brand, category, price, specifications }) =>
	prisma.product.update({
		where: { id },
		data: {
			...(name !== undefined ? { name } : null),
			...(brand !== undefined ? { brand: brand || null } : null),
			...(category !== undefined ? { category } : null),
			...(price !== undefined ? { price } : null),
			...(specifications !== undefined ? { specifications } : null),
		},
	});

const deleteProduct = async (id) =>
	prisma.product.delete({
		where: { id },
		select: { id: true },
	});

module.exports = {
	listCatalog,
	createProduct,
	updateProduct,
	deleteProduct,
};
