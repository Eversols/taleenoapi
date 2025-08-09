const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', followController.getFollowing);
router.get('/getFollowers', followController.getFollowers);
router.post('/:userId', followController.follow);
router.delete('/:userId', followController.unfollow);

module.exports = router;