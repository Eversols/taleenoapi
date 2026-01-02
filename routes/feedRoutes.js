const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', feedController.getFeed);
router.get('/testingFeed', feedController.testingFeed);

module.exports = router;
