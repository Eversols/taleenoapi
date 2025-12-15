// talentRoutes.js (corrected)
const express = require('express');
const router = express.Router();
const talentController = require('../controllers/talentController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', talentController.getUserDetails);
router.post('/deleteTalent', talentController.deleteTalent);
router.post('/like', talentController.likeTalent);  // Fixed: talentController.likeTalent
router.post('/share', talentController.shareTalent); // Fixed: talentController.shareTalent

router.get('/getTalentDetails', talentController.getTalentDetails);
router.post('/wishlist', talentController.addToWishlist);
router.get('/wishlist', talentController.getWishlist);
router.delete('/wishlist/:id', talentController.removeFromWishlist);
router.post('/viewTalent', talentController.viewTalent); 

module.exports = router;