const express = require('express');

const catalogController = require('../controllers/catalog.controller');

const router = express.Router();

router.get('/', catalogController.listCatalog);
router.post('/', catalogController.createProduct);
router.put('/:id', catalogController.updateProduct);
router.delete('/:id', catalogController.deleteProduct);

module.exports = router;
