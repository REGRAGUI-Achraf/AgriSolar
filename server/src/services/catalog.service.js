const { prisma } = require('../config/db');

const listCatalog = async () => {
	return prisma.product.findMany({
		where: { deletedAt: null },
		orderBy: [{ category: 'asc' }, { name: 'asc' }],
		select: {
			id: true,
			sku: true,
			name: true,
			brand: true,
			category: true,
			unit: true,
			stock: true,
			isActive: true,
			price: true,
			specifications: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
		},
	});
};

const createProduct = async ({ sku, name, brand, category, unit, stock, isActive, price, specifications }) =>
	prisma.product.create({
		data: {
			sku: sku || null,
			name,
			brand: brand || null,
			category,
			unit: unit || 'piece',
			stock: typeof stock === 'number' ? stock : 0,
			isActive: typeof isActive === 'boolean' ? isActive : true,
			price,
			specifications: specifications ?? {},
		},
		select: {
			id: true,
			sku: true,
			name: true,
			brand: true,
			category: true,
			unit: true,
			stock: true,
			isActive: true,
			price: true,
			specifications: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
		},
	});

const updateProduct = async (id, { sku, name, brand, category, unit, stock, isActive, price, specifications }) =>
	prisma.product.update({
		where: { id },
		data: {
			...(sku !== undefined ? { sku: sku || null } : null),
			...(name !== undefined ? { name } : null),
			...(brand !== undefined ? { brand: brand || null } : null),
			...(category !== undefined ? { category } : null),
			...(unit !== undefined ? { unit: unit || 'piece' } : null),
			...(stock !== undefined ? { stock } : null),
			...(isActive !== undefined ? { isActive } : null),
			...(price !== undefined ? { price } : null),
			...(specifications !== undefined ? { specifications } : null),
		},
		select: {
			id: true,
			sku: true,
			name: true,
			brand: true,
			category: true,
			unit: true,
			stock: true,
			isActive: true,
			price: true,
			specifications: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
		},
	});

const deleteProduct = async (id) =>
	prisma.product.update({
		where: { id },
		data: { deletedAt: new Date(), isActive: false },
		select: { id: true },
	});

const listMaterials = async () => {
	const [panneaux, pompes, variateurs] = await Promise.all([
		prisma.panneauPhotovoltaique.findMany({ orderBy: { puissanceCrete: 'asc' } }),
		prisma.pompeHydraulique.findMany({ orderBy: { puissance: 'asc' } }),
		prisma.variateurSolaire.findMany({ orderBy: { puissanceMax: 'asc' } }),
	]);
	return { panneaux, pompes, variateurs };
};

module.exports = {
	listCatalog,
	createProduct,
	updateProduct,
	deleteProduct,
	listMaterials,
};
