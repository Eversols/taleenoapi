const Booking = require('../models/Booking');
const Talent = require('../models/Talent');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all bookings
// @route   GET /api/v1/bookings
// @route   GET /api/v1/talents/:talentId/bookings
// @access  Private
exports.getBookings = async (req, res, next) => {
  try {
    let query;

    if (req.params.talentId) {
      query = Booking.find({ talent: req.params.talentId })
        .populate({
          path: 'client',
          select: 'fullName profilePhoto',
        })
        .populate({
          path: 'talent',
          select: 'fullName mainTalent hourlyRate',
        });
    } else if (req.user.role === 'client') {
      query = Booking.find({ client: req.user.id })
        .populate({
          path: 'talent',
          select: 'fullName mainTalent hourlyRate profilePhoto',
        });
    } else if (req.user.role === 'talent') {
      query = Booking.find({ talent: req.user.id })
        .populate({
          path: 'client',
          select: 'fullName profilePhoto',
        });
    } else {
      query = Booking.find()
        .populate({
          path: 'client',
          select: 'fullName profilePhoto',
        })
        .populate({
          path: 'talent',
          select: 'fullName mainTalent hourlyRate profilePhoto',
        });
    }

    const bookings = await query;

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'client',
        select: 'fullName profilePhoto',
      })
      .populate({
        path: 'talent',
        select: 'fullName mainTalent hourlyRate profilePhoto',
      });

    if (!booking) {
      return next(
        new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is booking owner or admin
    if (
      booking.client._id.toString() !== req.user.id &&
      booking.talent._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this booking`,
          401
        )
      );
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create booking
// @route   POST /api/v1/talents/:talentId/bookings
// @access  Private/Client
exports.createBooking = async (req, res, next) => {
  try {
    // Check if user is client
    if (req.user.role !== 'client') {
      return next(
        new ErrorResponse(
          `User with role ${req.user.role} is not authorized to create a booking`,
          401
        )
      );
    }

    req.body.talent = req.params.talentId;
    req.body.client = req.user.id;

    const talent = await Talent.findById(req.params.talentId);
    if (!talent) {
      return next(
        new ErrorResponse(`Talent not found with id of ${req.params.talentId}`, 404)
      );
    }

    // Check if talent is available at requested time
    const isAvailable = await checkTalentAvailability(
      req.params.talentId,
      req.body.startTime,
      req.body.endTime
    );

    if (!isAvailable) {
      return next(
        new ErrorResponse('Talent is not available at the requested time', 400)
      );
    }

    const booking = await Booking.create(req.body);

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update booking status
// @route   PUT /api/v1/bookings/:id/status
// @access  Private/Talent
exports.updateBookingStatus = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return next(
        new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is talent owner or admin
    if (booking.talent.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to update this booking`,
          401
        )
      );
    }

    // Update status
    booking.status = req.body.status;
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete booking
// @route   DELETE /api/v1/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return next(
        new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is booking owner or admin
    if (
      booking.client.toString() !== req.user.id &&
      booking.talent.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to delete this booking`,
          401
        )
      );
    }

    await booking.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to check talent availability
const checkTalentAvailability = async (talentId, startTime, endTime) => {
  // Check if talent has availability set for the requested day
  const talent = await Talent.findById(talentId);
  if (!talent) return false;

  // Check if talent is already booked at the requested time
  const overlappingBookings = await Booking.find({
    talent: talentId,
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      },
    ],
    status: { $ne: 'cancelled' },
  });

  return overlappingBookings.length === 0;
};