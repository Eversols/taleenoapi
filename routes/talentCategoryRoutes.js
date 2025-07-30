// routes/talentCategoryRoutes.js
const express = require('express');
const router = express.Router();
const talentCategoryController = require('../controllers/talentCategoryController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', talentCategoryController.getAllCategories);
router.post('/', talentCategoryController.createCategory);
router.put('/:id', talentCategoryController.updateCategory);
router.delete('/:id', talentCategoryController.deleteCategory);

module.exports = router;