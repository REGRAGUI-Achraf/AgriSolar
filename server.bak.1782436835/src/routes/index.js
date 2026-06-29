const express = require('express');

const authRoutes = require('./auth.routes');
const catalogRoutes = require('./catalog.routes');
const clientsRoutes = require('./clients.routes');
const pvgisRoutes = require('./pvgis.routes');
const sizingRoutes = require('./sizing.routes');
const quotesRoutes = require('./quotes.routes');
const { healthCheck } = require('../controllers/health.controller');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.get('/health', healthCheck);
router.use('/auth', authRoutes);

// Minimal endpoints needed by the current client UI
router.use('/clients', requireAuth, clientsRoutes);

router.use('/catalog', requireAuth, catalogRoutes);
router.use('/pvgis', pvgisRoutes);
router.use('/sizing', requireAuth, sizingRoutes);
router.use('/quotes', requireAuth, quotesRoutes);

module.exports = router;
