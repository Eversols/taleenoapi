const express = require('express');
const router = express.Router();
const { register, login ,verifyByPincode} = require('../controllers/authController');

router.post('/register', register);
router.post('/verify-pincode-only', verifyByPincode);
router.post('/login', login);

module.exports = router;
