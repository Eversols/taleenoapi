const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// Register User
exports.registerUser = (req, res) => {
    const { full_name, username, email, password, role, gender, age, country, city } = req.body;

    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ message: 'Error hashing password.' });

        userModel.createUser(
            { full_name, username, email, password: hashedPassword, role, gender, age, country, city },
            (err, result) => {
                if (err) return res.status(500).json({ message: 'Database error.', error: err });
                res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });
            }
        );
    });
};

// Login User
exports.loginUser = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    userModel.getUserByEmail(email, (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // Compare passwords
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ message: 'Error comparing passwords.', error: err });
            if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

            // Generate JWT
            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.status(200).json({
                message: 'Login successful.',
                token,
            });
        });
    });
};

// Protected Route Example
exports.getProtectedData = (req, res) => {
    res.status(200).json({ message: 'This is protected data.', user: req.user });
};
