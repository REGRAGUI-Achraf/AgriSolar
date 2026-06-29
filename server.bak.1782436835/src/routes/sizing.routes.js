const express = require('express');

const sizingController = require('../controllers/sizing.controller');

const router = express.Router();

router.post('/run', sizingController.runSizing);

module.exports = router;
