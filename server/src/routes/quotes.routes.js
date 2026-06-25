const express = require('express');

const quotesController = require('../controllers/quotes.controller');
const { requireRole } = require('../middlewares/auth');

const router = express.Router();

router.get('/', requireRole('ADMIN', 'SALES'), quotesController.listQuotes);
router.get('/:id', requireRole('ADMIN', 'SALES'), quotesController.getQuote);
router.get('/:id/pdf', requireRole('ADMIN', 'SALES'), quotesController.generateQuotePDF);
router.post('/', requireRole('ADMIN', 'SALES'), quotesController.createQuote);

module.exports = router;
