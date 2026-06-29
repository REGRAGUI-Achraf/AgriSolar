const express = require('express');

const catalogController = require('../controllers/catalog.controller');
const { requireRole } = require('../middlewares/auth');

const router = express.Router();

router.get('/', requireRole('ADMIN', 'SALES'), catalogController.listCatalog);
router.get('/materials', requireRole('ADMIN', 'SALES'), catalogController.listMaterials);
router.post('/', requireRole('ADMIN'), catalogController.createProduct);
router.put('/:id', requireRole('ADMIN'), catalogController.updateProduct);
router.delete('/:id', requireRole('ADMIN'), catalogController.deleteProduct);

module.exports = router;
