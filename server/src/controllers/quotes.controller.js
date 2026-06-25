const quotesService = require('../services/quotes.service');
const pdfService = require('../services/pdf.service');
const { parseNumber, requireString } = require('../utils/validators');

const listQuotes = async (req, res, next) => {
	try {
		const quotes = await quotesService.listQuotes();
		res.json(quotes);
	} catch (err) {
		next(err);
	}
};

const getQuote = async (req, res, next) => {
	try {
		const id = String(req.params.id);
		const quote = await quotesService.getQuoteById(id);
		if (!quote) {
			const err = new Error('Quote not found');
			err.status = 404;
			throw err;
		}
		res.json(quote);
	} catch (err) {
		next(err);
	}
};

// Minimal "persist" endpoint.
// Accepts either a flat payload or { inputs, result }.
const createQuote = async (req, res, next) => {
	try {
		const body = req.body ?? {};
		const inputs = body.inputs && typeof body.inputs === 'object' ? body.inputs : body;
		const result = body.result && typeof body.result === 'object' ? body.result : body;

		const clientId = requireString(body.clientId ?? inputs.clientId, 'clientId');
		const cropType = requireString(inputs.cropType, 'cropType');
		const wellDepth = parseNumber(inputs.wellDepth, { fieldName: 'wellDepth', required: true, min: 0 });
		const irrigationSurface = parseNumber(inputs.irrigationSurface, { fieldName: 'irrigationSurface', required: true, min: 0 });

		const panelCountRaw = result.panelCount ?? result?.outputs?.panelCount;
		const panelCount = Number.isInteger(panelCountRaw) ? panelCountRaw : Math.max(1, Math.round(Number(panelCountRaw) || 1));
		const pumpModel = requireString(result.pumpModel ?? result?.outputs?.pumpModel ?? 'Pompe', 'pumpModel');
		const basinVolume = parseNumber(result.basinVolume ?? result?.outputs?.basinVolume ?? 0, { fieldName: 'basinVolume', required: true, min: 0 });

		const totalPrice = parseNumber(
			body.totalPrice ?? result?.financial?.totalHT ?? result?.financial?.totalTTC ?? result.totalHT ?? result.totalTTC,
			{ fieldName: 'totalPrice', required: true, min: 0 }
		);

		// These fields are required by the current Prisma schema.
		// Until the full engineering model is implemented, we store pragmatic estimates.
		const dailyWaterNeed = parseNumber(body.dailyWaterNeed ?? inputs.dailyWaterNeed ?? irrigationSurface * 5, {
			fieldName: 'dailyWaterNeed',
			required: true,
			min: 0,
		});
		const requiredPower = parseNumber(body.requiredPower ?? inputs.requiredPower ?? panelCount * 250, {
			fieldName: 'requiredPower',
			required: true,
			min: 0,
		});

		let userId = body.userId ?? inputs.userId;
		if (!userId) {
			userId = req.auth?.userId;
		}
		if (!userId) {
			userId = await quotesService.findDefaultSalesUserId();
		}
		if (!userId) {
			const err = new Error('No SALES user found to attach the quote. Seed the database first.');
			err.status = 500;
			throw err;
		}

		const status = (body.status ?? 'PENDING').toUpperCase();
		const allowedStatus = new Set(['PENDING', 'ACCEPTED', 'REJECTED']);
		if (!allowedStatus.has(status)) {
			const err = new Error('status invalide (PENDING|ACCEPTED|REJECTED).');
			err.status = 400;
			throw err;
		}

		const quote = await quotesService.createQuote({
			clientId,
			userId,
			status,
			totalPrice,
			wellDepth,
			irrigationSurface,
			cropType,
			dailyWaterNeed,
			requiredPower,
			panelCount,
			pumpModel,
			basinVolume,
		});

		res.status(201).json(quote);
	} catch (err) {
		next(err);
	}
};

const generateQuotePDF = async (req, res, next) => {
	try {
		const id = String(req.params.id);
		const quote = await quotesService.getQuoteById(id);

		if (!quote) {
			const err = new Error('Quote not found');
			err.status = 404;
			throw err;
		}

		// Construire l'objet de données pour le service PDF
		const quoteData = {
			quoteId: quote.id,
			commercialName: quote.user?.email || 'AgriSolar',
			client: {
				name: quote.client?.name || 'Client',
				phone: quote.client?.phone || '',
				latitude: quote.client?.latitude || 0,
				longitude: quote.client?.longitude || 0,
			},
			inputs: {
				wellDepth: quote.wellDepth || 0,
				irrigationSurface: quote.irrigationSurface || 0,
				cropType: quote.cropType || 'Non spécifié',
				dailyWaterNeed: quote.dailyWaterNeed || 0,
			},
			result: {
				panelCount: quote.panelCount || 0,
				pumpModel: quote.pumpModel || 'Pompe',
				hmt: quote.wellDepth || 0,
				basinVolume: quote.basinVolume || 0,
				pvPower: quote.requiredPower || 0,
			},
			materials: [
				{
					name: `Panneaux Photovoltaïques`,
					brand: 'JinkoSolar',
					quantity: quote.panelCount || 0,
					unitPriceHT: 250,
				},
				{
					name: `Pompe Immergeable - ${quote.pumpModel}`,
					brand: 'Grundfos',
					quantity: 1,
					unitPriceHT: 1500,
				},
				{
					name: `Contrôleur MPPT`,
					brand: 'Victron',
					quantity: 1,
					unitPriceHT: 800,
				},
				{
					name: `Accessoires & Tuyauterie`,
					brand: 'AgriSolar',
					quantity: 1,
					unitPriceHT: 500,
				},
				{
					name: `Bâche du Bassin (${quote.basinVolume}m³)`,
					brand: 'Agriflex',
					quantity: 1,
					unitPriceHT: 300,
				},
			],
			totalHT: quote.totalPrice || 0,
		};

		// Générer le PDF
		const pdfStream = pdfService.generateQuotePDF(quoteData);

		// Configurer les headers HTTP
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `attachment; filename="devis-${quote.id}.pdf"`);

		// Streamer le PDF
		pdfStream.pipe(res);

		// Gérer les erreurs du stream
		pdfStream.on('error', (err) => {
			next(err);
		});
	} catch (err) {
		next(err);
	}
};

module.exports = {
	listQuotes,
	getQuote,
	createQuote,
	generateQuotePDF,
};
