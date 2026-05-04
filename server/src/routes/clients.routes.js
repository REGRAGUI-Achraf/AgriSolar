const express = require('express');

const clientsController = require('../controllers/clients.controller');

const router = express.Router();

router.get('/', clientsController.listClients);
router.post('/', clientsController.createClient);
router.put('/:id', clientsController.updateClient);
router.delete('/:id', clientsController.deleteClient);

module.exports = router;
