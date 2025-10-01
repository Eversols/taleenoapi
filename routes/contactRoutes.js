const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authenticate = require('../middleware/auth'); // assumes token middleware

router.post('/', authenticate, contactController.submit);
router.get('/getList', authenticate, contactController.getMyList);

module.exports = router;
