// routes/metaRoutes.js or similar
const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');

router.get('/meta-data', metaController.getMetaData);

module.exports = router;
