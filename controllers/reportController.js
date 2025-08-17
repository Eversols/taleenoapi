const { Report, Booking } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.submitReport = async (req, res) => {
  try {
    const { booking_id, report_type, description } = req.body;
    const reporter_id = req.user.id;

    // Validate required fields
    if (!booking_id || !report_type) {
      return res.status(400).json(
        sendJson(false, 'Booking ID and report type are required')
      );
    }

    // Validate report type
     const validTypes = ['Harassment', 'Spam', 'Inappropriate Language', 'Abuse', 'Other'];
    if (!validTypes.includes(report_type)) {
      return res.status(400).json(
        sendJson(false, `Invalid report type. Valid types are: ${validTypes.join(', ')}`)
      );
    }

    // Verify booking exists
    const booking = await Booking.findByPk(booking_id);
    if (!booking) {
      return res.status(404).json(
        sendJson(false, 'Booking not found')
      );
    }

    // Create the report
    const report = await Report.create({
      reporter_id,
      booking_id,
      report_type,
      description: description || null,
      status: 'pending'
    });

    return res.status(201).json(
      sendJson(true, 'Report submitted successfully', {
        report: {
          id: report.id,
          report_type: report.report_type,
          status: report.status,
          booking: {
            id: booking.id,
            time_slot: booking.time_slot,
            status: booking.status
          },
          createdAt: report.createdAt
        }
      })
    );

  } catch (error) {
    console.error('Booking report error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to submit booking report', {
        error: error.message
      })
    );
  }
};
