const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const skillRoutes = require('./routes/skillRoutes');
const languageRoutes = require('./routes/languageRoutes');
require('dotenv').config();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/skill', skillRoutes);
app.use('/api/language', languageRoutes);

// Default test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
