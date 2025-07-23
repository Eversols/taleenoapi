// routes/skillRoutes.js
const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.use(authMiddleware); // authenticate all requests
router.use(isAdmin); // restrict all routes in this file to admin only

router.post('/', skillController.create);
router.get('/', skillController.getAll);
router.put('/:id', skillController.update);
router.delete('/:id', skillController.remove);

module.exports = router;
