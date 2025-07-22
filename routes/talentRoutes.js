const express = require('express');
const {
  getTalents,
  getTalent,
  createTalentProfile,
  updateTalentProfile,
  deleteTalentProfile,
} = require('../controllers/talentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(getTalents)
  .post(protect, authorize('talent'), createTalentProfile);

router
  .route('/:id')
  .get(getTalent)
  .put(protect, authorize('talent', 'admin'), updateTalentProfile)
  .delete(protect, authorize('talent', 'admin'), deleteTalentProfile);

module.exports = router;