const express = require('express');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes');
const talentProfileRoutes = require('./routes/talentProfileRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const projectRoutes = require('./routes/projectRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const chatRoutes = require('./routes/chatRoutes');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/talent-profiles', talentProfileRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chats', chatRoutes);

// Start the Server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
