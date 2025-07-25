const Talent = require('../models/Talent');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all talents
// @route   GET /api/v1/talents
// @access  Public
exports.getTalents = async (req, res, next) => {
  try {
    // Filtering
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    let query = Talent.find(JSON.parse(queryStr)).populate('user').populate('category');

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Talent.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const talents = await query;

    // Pagination result
    const pagination = {};
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: talents.length,
      pagination,
      data: talents,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single talent
// @route   GET /api/v1/talents/:id
// @access  Public
exports.getTalent = async (req, res, next) => {
  try {
    const talent = await Talent.findById(req.params.id).populate('user').populate('category');

    if (!talent) {
      return next(
        new ErrorResponse(`Talent not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: talent,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create talent profile
// @route   POST /api/v1/talents
// @access  Private/Talent
exports.createTalentProfile = async (req, res, next) => {
  try {
    // Check if user is talent
    if (req.user.role !== 'talent') {
      return next(
        new ErrorResponse(`User with role ${req.user.role} is not authorized to create talent profile`, 401)
      );
    }

    // Check if profile already exists
    const existingProfile = await Talent.findOne({ user: req.user.id });
    if (existingProfile) {
      return next(
        new ErrorResponse(`Talent profile already exists for user ${req.user.id}`, 400)
      );
    }

    req.body.user = req.user.id;
    const talent = await Talent.create(req.body);

    res.status(201).json({
      success: true,
      data: talent,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update talent profile
// @route   PUT /api/v1/talents/:id
// @access  Private/Talent
exports.updateTalentProfile = async (req, res, next) => {
  try {
    let talent = await Talent.findById(req.params.id);

    if (!talent) {
      return next(
        new ErrorResponse(`Talent not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is talent owner or admin
    if (talent.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(`User ${req.user.id} is not authorized to update this talent profile`, 401)
      );
    }

    talent = await Talent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: talent,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete talent profile
// @route   DELETE /api/v1/talents/:id
// @access  Private/Talent
exports.deleteTalentProfile = async (req, res, next) => {
  try {
    const talent = await Talent.findById(req.params.id);

    if (!talent) {
      return next(
        new ErrorResponse(`Talent not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is talent owner or admin
    if (talent.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(`User ${req.user.id} is not authorized to delete this talent profile`, 401)
      );
    }

    await talent.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};