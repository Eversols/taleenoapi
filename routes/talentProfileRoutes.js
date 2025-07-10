const express = require('express');
const router = express.Router();
const talentProfileController = require('../controllers/talentProfileController');
const { authenticateToken, checkRole } = require('../middleware/authMiddleware');

// Public Routes
router.get('/', talentProfileController.getAllTalentProfiles); // Get all talent profiles
router.get('/:id', talentProfileController.getTalentProfileById); // Get a talent profile by ID

// Protected Routes
router.post('/', authenticateToken, checkRole(['admin', 'talent']), talentProfileController.createTalentProfile); // Create talent profile
router.put('/:id', authenticateToken, checkRole(['admin', 'talent']), talentProfileController.updateTalentProfile); // Update talent profile
router.delete('/:id', authenticateToken, checkRole(['admin','talent']), talentProfileController.deleteTalentProfile); // Delete talent profile (Admin only)

module.exports = router;
