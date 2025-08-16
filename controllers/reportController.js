const { Report, User } = require('../models');
const { sendJson } = require('../utils/helpers');

exports.submitReport = async (req, res) => {
  try {
    const { reported_id, report_type, description } = req.body;
    const reporter_id = req.user.id;

    // Validate required fields
    if (!reported_id || !report_type) {
      return res.status(400).json(
        sendJson(false, 'Reported user ID and report type are required')
      );
    }

    // Validate report type
    const validTypes = ['Harassment', 'Spam', 'Inappropriate Language', 'Abuse', 'Other'];
    if (!validTypes.includes(report_type)) {
      return res.status(400).json(
        sendJson(false, `Invalid report type. Valid types are: ${validTypes.join(', ')}`)
      );
    }

    // Check if user is trying to report themselves
    if (reporter_id === reported_id) {
      return res.status(400).json(
        sendJson(false, 'You cannot report yourself')
      );
    }

    // Verify reported user exists
    const reportedUser = await User.findByPk(reported_id);
    if (!reportedUser) {
      return res.status(404).json(
        sendJson(false, 'Reported user not found')
      );
    }

    // Create the report
    const report = await Report.create({
      reporter_id,
      reported_id,
      report_type,
      description: description || null,
      status: 'pending' // Default status
    });

    return res.status(201).json(
      sendJson(true, 'Report submitted successfully', {
        report: {
          id: report.id,
          report_type: report.report_type,
          status: report.status,
          reported_user: {
            id: reportedUser.id,
            username: reportedUser.username
          },
          createdAt: report.createdAt
        }
      })
    );

  } catch (error) {
    console.error('Report submission error:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to submit report', {
        error: error.message
      })
    );
  }
};