const jwt = require('jsonwebtoken');

// Authenticate Token Middleware
exports.authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Get Bearer token

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token.' });
        }

        req.user = user; // Attach user info (id, role) to the request
        next();
    });
};

// Role and Permissions Middleware
exports.checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;

        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: 'Access denied: Insufficient permissions.' });
        }

        next(); // Role is valid, proceed
    };
};
