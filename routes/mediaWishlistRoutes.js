const express = require('express');
const router = express.Router();
const controller = require('../controllers/mediaWishlistController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', controller.getAllWishlist);
router.get('/:id', controller.getWishlistById);
router.post('/', controller.addWishlist);
router.delete('/:id', controller.deleteWishlist);

module.exports = router;
