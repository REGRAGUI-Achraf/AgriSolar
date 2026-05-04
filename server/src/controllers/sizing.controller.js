const sizingService = require('../services/sizing.service');

const runSizing = async (req, res, next) => {
	try {
		const result = await sizingService.runSizing(req.body);
		res.json(result);
	} catch (err) {
		next(err);
	}
};

module.exports = {
	runSizing,
};
