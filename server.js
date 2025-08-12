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
const talentCategoryRoutes = require('./routes/talentCategoryRoutes');
const feedRoutes = require('./routes/feedRoutes');
const levelRoutes = require('./routes/levelRoutes');
const metaRoutes = require('./routes/metaRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const talentRoutes = require('./routes/talentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const wishlistRoutes = require('./routes/mediaWishlistRoutes');

require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', metaRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/skill', skillRoutes);
app.use('/api/language', languageRoutes);
app.use('/api/country', countryRoutes);
app.use('/api/city', cityRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/talent-categories', talentCategoryRoutes); 
app.use('/api/follow', followRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/talent', talentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/media-wishlist', wishlistRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Default test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
