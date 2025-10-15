const { Report, Booking ,UserReport,User,sequelize} = require('../models');
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

exports.submitUser = async (req, res) => {
  try {
    const { user_id, report_type, description } = req.body;
    const reporter_id = req.user.id;

    // Validate required fields
    if (!user_id || !report_type) {
      return res.status(400).json(
        sendJson(false, 'User ID and report type are required')
      );
    }

    // Validate report type
    const validTypes = ['Harassment', 'Spam', 'Inappropriate Language', 'Abuse', 'Other'];
    if (!validTypes.includes(report_type)) {
      return res.status(400).json(
        sendJson(false, `Invalid report type. Valid types are: ${validTypes.join(', ')}`)
      );
    }

    // Verify reported user exists
    const userToReport = await User.findByPk(user_id);
    if (!userToReport) {
      return res.status(404).json(
        sendJson(false, 'User not found')
      );
    }

    // Create the report
    const report = await UserReport.create({
      reporter_id,
      user_id,
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
          reported_user: {
            id: userToReport.id,
            name: userToReport.username || null, // adjust field as per your User model
          },
          createdAt: report.createdAt
        }
      })
    );

  } catch (error) {
    console.error('User report error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to submit user report', {
        error: error.message
      })
    );
  }
};
exports.getMyReports = async (req, res) => {
  try {
    const reporter_id = req.user.id;

    // 🧠 Raw query: join userreports with users table to get reported user info
    const reports = await sequelize.query(`
      SELECT 
        ur.id,
        ur.report_type,
        ur.description,
        ur.status,
        ur.created_at,
        u.id AS reported_user_id,
        u.username AS reported_user_name,
        u.email AS reported_user_email
      FROM userreports ur
      JOIN users u ON u.id = ur.user_id
      WHERE ur.reporter_id = :reporter_id
      ORDER BY ur.created_at DESC
    `, {
      replacements: { reporter_id },
      type: sequelize.QueryTypes.SELECT
    });

    if (!reports || reports.length === 0) {
      return res.status(200).json(
        sendJson(true, 'No reports submitted by you yet', { reports: [] })
      );
    }

    return res.status(200).json(
      sendJson(true, 'Reports fetched successfully', { reports })
    );

  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to fetch reports', { error: error.message })
    );
  }
};
