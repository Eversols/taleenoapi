require('dotenv').config();
const express = require('express');
const sequelize = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profile');

const app = express();

// Middlewares
app.use(express.json());

// Routes
app.use('/api', authRoutes); // e.g., /api/register
app.use('/api', profileRoutes); // e.g., /api/profile/view

// DB Sync & Server Start
sequelize.sync()
  .then(() => {
    console.log('MySQL connected and synced');
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('❌ MySQL connection error:', err);
  });
