const express = require('express');

const clientsController = require('../controllers/clients.controller');
const { requireRole } = require('../middlewares/auth');

const router = express.Router();

router.get('/', requireRole('ADMIN', 'SALES'), clientsController.listClients);
router.post('/', requireRole('ADMIN'), clientsController.createClient);
router.put('/:id', requireRole('ADMIN'), clientsController.updateClient);
router.delete('/:id', requireRole('ADMIN'), clientsController.deleteClient);

module.exports = router;
