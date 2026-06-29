const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const prisma = globalForPrisma.__agrisolarPrisma ?? new PrismaClient();

if ((process.env.NODE_ENV || 'development') !== 'production') {
	globalForPrisma.__agrisolarPrisma = prisma;
}

module.exports = {
	prisma,
};
