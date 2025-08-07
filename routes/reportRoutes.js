// talentRoutes.js (corrected)
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

router.use(auth);
router.post('/', reportController.submitReport);  // Fixed: reportController.likeTalent


module.exports = router;
