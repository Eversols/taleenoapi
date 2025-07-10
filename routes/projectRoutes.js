const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken, checkRole } = require('../middleware/authMiddleware');

// Public Routes
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);

// Protected Routes
router.post('/', authenticateToken, checkRole(['talent', 'admin']), projectController.createProject);
router.put('/:id', authenticateToken, checkRole(['talent', 'admin']), projectController.updateProject);
router.delete('/:id', authenticateToken, checkRole(['admin']), projectController.deleteProject);

module.exports = router;
