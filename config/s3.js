const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");
require('dotenv').config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

async function testConnection() {
  try {
    const response = await s3.send(new ListBucketsCommand({}));
    console.log("✅ S3 Connection Successful!");
    console.log("Buckets:", response.Buckets.map(b => b.Name));
  } catch (error) {
    console.error("❌ S3 Connection Failed:", error.message);
  }
}

// Only run test if this file is executed directly
if (require.main === module) {
  testConnection();
}

module.exports = s3;