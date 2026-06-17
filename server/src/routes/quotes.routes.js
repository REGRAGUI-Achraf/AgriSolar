const express = require('express');

const quotesController = require('../controllers/quotes.controller');

const router = express.Router();

router.get('/', quotesController.listQuotes);
router.get('/:id', quotesController.getQuote);
router.get('/:id/pdf', quotesController.generateQuotePDF);
router.post('/', quotesController.createQuote);

module.exports = router;
