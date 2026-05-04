const express = require('express');

const pvgisService = require('../services/pvgis.service');

const router = express.Router();

// GET /api/pvgis/pvcalc?lat=...&lon=...&angle=...&aspect=...
router.get('/pvcalc', async (req, res, next) => {
	try {
		const data = await pvgisService.pvcalc({
			lat: req.query.lat,
			lon: req.query.lon,
			angle: req.query.angle,
			aspect: req.query.aspect,
			loss: req.query.loss,
			peakpower: req.query.peakpower,
		});
		res.json(data);
	} catch (err) {
		next(err);
	}
});

module.exports = router;
