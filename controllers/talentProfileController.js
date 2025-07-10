const talentProfileModel = require('../models/talentProfileModel');

// Create Talent Profile
exports.createTalentProfile = (req, res) => {
    const { user_id, main_categories, skills, experience_level, hourly_rate, currency, availability_per_week, about } = req.body;

    const data = {
        user_id,
        main_categories,
        skills,
        experience_level,
        hourly_rate,
        currency,
        availability_per_week,
        about,
        admin_approved: false // Default value
    };

    talentProfileModel.createTalentProfile(data, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(201).json({ message: 'Talent profile created successfully!', id: result.insertId });
    });
};

// Get All Talent Profiles
exports.getAllTalentProfiles = (req, res) => {
    talentProfileModel.getAllTalentProfiles((err, profiles) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json(profiles);
    });
};

// Get Talent Profile by ID
exports.getTalentProfileById = (req, res) => {
    const { id } = req.params;

    talentProfileModel.getTalentProfileById(id, (err, profile) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        if (!profile) return res.status(404).json({ message: 'Talent profile not found.' });
        res.status(200).json(profile);
    });
};

// Update Talent Profile
exports.updateTalentProfile = (req, res) => {
    const { id } = req.params;
    const { main_categories, skills, experience_level, hourly_rate, currency, availability_per_week, about, admin_approved } = req.body;

    const data = {
        main_categories,
        skills,
        experience_level,
        hourly_rate,
        currency,
        availability_per_week,
        about,
        admin_approved
    };

    talentProfileModel.updateTalentProfile(id, data, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json({ message: 'Talent profile updated successfully!' });
    });
};

// Delete Talent Profile
exports.deleteTalentProfile = (req, res) => {
    const { id } = req.params;

    talentProfileModel.deleteTalentProfile(id, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json({ message: 'Talent profile deleted successfully!' });
    });
};
