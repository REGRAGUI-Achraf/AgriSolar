/* eslint-disable no-console */

/**
 * Prisma seed script (PostgreSQL) for AgriSolar / HelioFlow.
 *
 * Goals:
 * - Insert realistic baseline data (users, products, clients, example quote)
 * - Idempotent: safe to re-run (uses upsert)
 * - Security: passwords are hashed with bcrypt
 *
 * Requirements (Prisma ORM v7+):
 * - `DATABASE_URL` must be set
 * - Install deps: `@prisma/client`, `prisma`, `@prisma/adapter-pg`, `pg`, `bcrypt`
 */

const SEED_IDS = {
	users: {
		admin: '11111111-1111-4111-8111-111111111111',
		sales: '22222222-2222-4222-8222-222222222222',
	},
	clients: {
		meknes: '33333333-3333-4333-8333-333333333333',
		soussMassa: '44444444-4444-4444-8444-444444444444',
		tafilalet: '55555555-5555-4555-8555-555555555555',
	},
	products: {
		panel400: 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a001',
		panel450: 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a002',
		panel550: 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a003',
		pump11kw: 'b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b001',
		pump22kw: 'b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b002',
		pump30kw: 'b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b003',
		inv22kw: 'c0c0c0c0-c0c0-4c0c-8c0c-c0c0c0c0c001',
		inv40kw: 'c0c0c0c0-c0c0-4c0c-8c0c-c0c0c0c0c002',
	},
	quotes: {
		example: '66666666-6666-4666-8666-666666666666',
	},
};

const getEnv = (name) => {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required env var: ${name}`);
	return value;
};

const pickModule = (moduleNs) => moduleNs?.default ?? moduleNs;

const createPrismaClient = async () => {
	const { PrismaClient } = await import('@prisma/client');
	const databaseUrl = getEnv('DATABASE_URL');

	// Prisma ORM v7+ expects a driver adapter (direct DB connection) or Accelerate.
	// Here we use the PostgreSQL adapter.
	const adapterNs = await import('@prisma/adapter-pg');
	const { PrismaPg } = adapterNs;

	let adapter;
	try {
		adapter = new PrismaPg({ connectionString: databaseUrl });
	} catch (error) {
		// Fallback for adapter versions expecting a pg Pool.
		const pgNs = await import('pg');
		const { Pool } = pickModule(pgNs);
		adapter = new PrismaPg(new Pool({ connectionString: databaseUrl }));
	}

	return new PrismaClient({ adapter });
};

const hashPassword = async (plainTextPassword) => {
	const bcryptNs = await import('bcrypt');
	const bcrypt = pickModule(bcryptNs);
	const saltRounds = 12;
	return bcrypt.hash(plainTextPassword, saltRounds);
};

async function main() {
	// Optional: load .env if dotenv is installed.
	try {
		await import('dotenv/config');
	} catch {
		// ignore
	}

	const prisma = await createPrismaClient();
	try {
		console.log('Seeding database...');

		// Passwords can be overridden via env for local testing.
		const adminPlainPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@agrisolar123';
		const salesPlainPassword = process.env.SEED_SALES_PASSWORD ?? 'Sales@agrisolar123';

		const [adminPasswordHash, salesPasswordHash] = await Promise.all([
			hashPassword(adminPlainPassword),
			hashPassword(salesPlainPassword),
		]);

		const adminUser = await prisma.user.upsert({
			where: { email: 'admin@agrisolar.com' },
			update: { role: 'ADMIN' },
			create: {
				id: SEED_IDS.users.admin,
				email: 'admin@agrisolar.com',
				password: adminPasswordHash,
				role: 'ADMIN',
			},
		});

		const salesUser = await prisma.user.upsert({
			where: { email: 'commercial@1' },
			update: { role: 'SALES' },
			create: {
				id: SEED_IDS.users.sales,
				email: 'commercial@1',
				password: salesPasswordHash,
				role: 'SALES',
			},
		});

		// Clients: Morocco (realistic coordinates for future solar/weather APIs)
		const clientMeknes = await prisma.client.upsert({
			where: { id: SEED_IDS.clients.meknes },
			update: {
				name: 'Domaine Oléicole Meknès',
				phone: '+212 6 12 34 56 78',
				latitude: 33.8935,
				longitude: -5.5473,
			},
			create: {
				id: SEED_IDS.clients.meknes,
				name: 'Domaine Oléicole Meknès',
				phone: '+212 6 12 34 56 78',
				latitude: 33.8935,
				longitude: -5.5473,
			},
		});

		const clientSoussMassa = await prisma.client.upsert({
			where: { id: SEED_IDS.clients.soussMassa },
			update: {
				name: 'Coopérative Agrumes Souss-Massa',
				phone: '+212 6 98 76 54 32',
				latitude: 30.4278,
				longitude: -9.5981,
			},
			create: {
				id: SEED_IDS.clients.soussMassa,
				name: 'Coopérative Agrumes Souss-Massa',
				phone: '+212 6 98 76 54 32',
				latitude: 30.4278,
				longitude: -9.5981,
			},
		});

		const clientTafilalet = await prisma.client.upsert({
			where: { id: SEED_IDS.clients.tafilalet },
			update: {
				name: 'Ferme Palmeraie Tafilalet',
				phone: '+212 6 55 44 33 22',
				latitude: 31.9314,
				longitude: -4.4247,
			},
			create: {
				id: SEED_IDS.clients.tafilalet,
				name: 'Ferme Palmeraie Tafilalet',
				phone: '+212 6 55 44 33 22',
				latitude: 31.9314,
				longitude: -4.4247,
			},
		});

		// Products (prices are indicative; use the currency of your choice, e.g. MAD)
		const products = [
			{
				id: SEED_IDS.products.panel400,
				name: 'Panneau PV 400W Mono',
				brand: 'Jinko',
				category: 'PANEL',
				price: 1200,
				specifications: {
					powerW: 400,
					vmpV: 31.0,
					impA: 12.9,
					vocV: 37.5,
					iscA: 13.7,
					technology: 'mono',
				},
			},
			{
				id: SEED_IDS.products.panel450,
				name: 'Panneau PV 450W Mono',
				brand: 'LONGi',
				category: 'PANEL',
				price: 1350,
				specifications: {
					powerW: 450,
					vmpV: 41.0,
					impA: 11.0,
					vocV: 49.5,
					iscA: 11.7,
					technology: 'mono',
				},
			},
			{
				id: SEED_IDS.products.panel550,
				name: 'Panneau PV 550W Mono',
				brand: 'Jinko',
				category: 'PANEL',
				price: 1850,
				specifications: {
					powerW: 550,
					vmpV: 41.8,
					impA: 13.2,
					vocV: 50.2,
					iscA: 13.9,
					technology: 'mono',
				},
			},
			{
				id: SEED_IDS.products.pump11kw,
				name: 'Pompe immergée 1.1kW - 5m³/h',
				brand: 'Pedrollo',
				category: 'PUMP',
				price: 9500,
				specifications: {
					powerKW: 1.1,
					flowNominalM3H: 5,
					headMaxM: 80,
					motorType: 'AC',
					voltageV: 220,
					phases: 1,
				},
			},
			{
				id: SEED_IDS.products.pump22kw,
				name: 'Pompe immergée 2.2kW - 10m³/h',
				brand: 'Pedrollo',
				category: 'PUMP',
				price: 16500,
				specifications: {
					powerKW: 2.2,
					flowNominalM3H: 10,
					headMaxM: 110,
					motorType: 'AC',
					voltageV: 380,
					phases: 3,
				},
			},
			{
				id: SEED_IDS.products.pump30kw,
				name: 'Pompe immergée 3.0kW - 15m³/h',
				brand: 'Caprari',
				category: 'PUMP',
				price: 21000,
				specifications: {
					powerKW: 3.0,
					flowNominalM3H: 15,
					headMaxM: 120,
					motorType: 'AC',
					voltageV: 380,
					phases: 3,
				},
			},
			{
				id: SEED_IDS.products.inv22kw,
				name: 'Variateur solaire 2.2kW (Pompage)',
				brand: 'INVT',
				category: 'INVERTER',
				price: 12500,
				specifications: {
					ratedPowerKW: 2.2,
					pvInputVoltageMinV: 250,
					pvInputVoltageMaxV: 800,
					acOutputVoltageV: 380,
					phases: 3,
					suggestedPumpPowerMaxKW: 2.2,
				},
			},
			{
				id: SEED_IDS.products.inv40kw,
				name: 'Variateur solaire 4.0kW (Pompage)',
				brand: 'INVT',
				category: 'INVERTER',
				price: 16500,
				specifications: {
					ratedPowerKW: 4.0,
					pvInputVoltageMinV: 250,
					pvInputVoltageMaxV: 850,
					acOutputVoltageV: 380,
					phases: 3,
					suggestedPumpPowerMaxKW: 4.0,
				},
			},
		];

		for (const product of products) {
			await prisma.product.upsert({
				where: { id: product.id },
				update: {
					name: product.name,
					brand: product.brand,
					category: product.category,
					price: product.price,
					specifications: product.specifications,
				},
				create: product,
			});
		}

		// Example Quote
		// Inputs: 60m well depth, 2 hectares irrigation surface (stored in m²).
		// Outputs are "fake" but coherent: around 80 m³/day and ~6.3 kWp for a 2.2kW pump scenario.
		const irrigationSurfaceM2 = 20_000;
		const dailyWaterNeedM3PerDay = 80;
		const requiredPowerW = 6300;
		const panelCount = 14; // 14 x 450W ≈ 6.3 kWp
		const basinVolumeM3 = 200; // e.g. ~2-3 days autonomy depending on demand

		const selectedPumpName = products.find((p) => p.id === SEED_IDS.products.pump22kw)?.name ??
			'Pompe immergée 2.2kW - 10m³/h';

		// A simple indicative total price (no BOM relation yet):
		// 14x 450W panel + pump + inverter + accessories margin.
		const totalPrice = (14 * 1350) + 16500 + 12500 + 6000;

		await prisma.quote.upsert({
			where: { id: SEED_IDS.quotes.example },
			update: {
				status: 'PENDING',
				totalPrice,
				wellDepth: 60,
				irrigationSurface: irrigationSurfaceM2,
				cropType: 'Olivier',
				dailyWaterNeed: dailyWaterNeedM3PerDay,
				requiredPower: requiredPowerW,
				panelCount,
				pumpModel: selectedPumpName,
				basinVolume: basinVolumeM3,
				client: { connect: { id: clientSoussMassa.id } },
				user: { connect: { id: salesUser.id } },
			},
			create: {
				id: SEED_IDS.quotes.example,
				status: 'PENDING',
				totalPrice,
				wellDepth: 60,
				irrigationSurface: irrigationSurfaceM2,
				cropType: 'Olivier',
				dailyWaterNeed: dailyWaterNeedM3PerDay,
				requiredPower: requiredPowerW,
				panelCount,
				pumpModel: selectedPumpName,
				basinVolume: basinVolumeM3,
				client: { connect: { id: clientSoussMassa.id } },
				user: { connect: { id: salesUser.id } },
			},
		});

		console.log('Seed complete.');
		console.log(`Users: ${adminUser.email}, ${salesUser.email}`);
		console.log(`Clients: ${clientMeknes.name}, ${clientSoussMassa.name}, ${clientTafilalet.name}`);
		console.log(`Products: ${products.length}`);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error) => {
	console.error('Seed failed');
	console.error(error);
	process.exitCode = 1;
});

