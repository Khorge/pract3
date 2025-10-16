// Load environment variables
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require('path');

const app = express();

// Serve static files (for index.html)
app.use(express.static(__dirname));

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// AWS S3 client configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Test endpoint
app.get('/api', (req, res) => {
  res.send('🚀 Node.js + S3 Demo running successfully!');
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).send({ error: "No file uploaded." });

    const key = `uploads/${Date.now()}_${file.originalname}`;
    const fileStream = fs.createReadStream(file.path);

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: fileStream,
      ContentType: file.mimetype,
    }));

    // Delete local temp file
    fs.unlinkSync(file.path);

    // Return clickable S3 URL
    const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.json({
      message: '✅ File uploaded successfully!',
      s3_url: s3Url
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
