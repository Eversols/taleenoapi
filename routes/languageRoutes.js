const express = require('express');
const router = express.Router();
const languageController = require('../controllers/languageController');
const authMiddleware = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.use(authMiddleware);
router.use(isAdmin); // restrict all routes in this file to admin only

router.post('/', languageController.create);
router.get('/', languageController.getAll);
router.put('/:id', languageController.update);
router.delete('/:id', languageController.remove);

module.exports = router;
