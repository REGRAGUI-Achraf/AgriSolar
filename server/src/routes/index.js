const express = require('express');

const catalogRoutes = require('./catalog.routes');
const clientsRoutes = require('./clients.routes');
const pvgisRoutes = require('./pvgis.routes');
const sizingRoutes = require('./sizing.routes');
const quotesRoutes = require('./quotes.routes');
const { healthCheck } = require('../controllers/health.controller');

const router = express.Router();

router.get('/health', healthCheck);

// Minimal endpoints needed by the current client UI
router.use('/clients', clientsRoutes);

router.use('/catalog', catalogRoutes);
router.use('/pvgis', pvgisRoutes);
router.use('/sizing', sizingRoutes);
router.use('/quotes', quotesRoutes);

module.exports = router;
