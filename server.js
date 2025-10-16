const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require('fs');

const app = express();
app.use(express.json());

const upload = multer({ dest: '/tmp/' }); // Render ephemeral storage - use stream in prod

const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.S3_BUCKET;
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// simple health
app.get('/', (req,res) => res.send('Hello from Node + S3 demo'));

// upload a file (multipart/form-data)
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const key = `uploads/${Date.now()}_${file.originalname}`;
    const body = fs.createReadStream(file.path);

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: file.mimetype
    }));

    // remove temp file
    fs.unlinkSync(file.path);

    res.json({ key, url: `s3://${BUCKET}/${key}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// generate presigned GET URL
app.get('/presign/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key }); // for PUT presign example
    // Example: sign for GET would use GetObjectCommand
    res.json({ note: 'Change to GetObjectCommand for download presign.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
