const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const skillRoutes = require('./routes/skillRoutes');
const languageRoutes = require('./routes/languageRoutes');
const countryRoutes = require('./routes/countryRoutes');
const cityRoutes = require('./routes/cityRoutes');
const contactRoutes = require('./routes/contactRoutes');
const followRoutes = require('./routes/followRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const { swaggerUi, swaggerDocument } = require('./swaggerDocument');
require('dotenv').config();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/skill', skillRoutes);
app.use('/api/language', languageRoutes);
app.use('/api/country', countryRoutes);
app.use('/api/city', cityRoutes);
app.use('/api/contact', contactRoutes);
// 
app.use('/api/follow', followRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Default test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
