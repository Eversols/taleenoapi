require('dotenv').config();
const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await db.getConnection(); // MySQL connection check
    console.log('✅ MySQL Connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  }
};

startServer();
