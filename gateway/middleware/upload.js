// gateway/middleware/upload.js
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

const TMP_DIR = path.join(__dirname, "../tmp_uploads");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const ALLOWED = new Set([".pdf", ".docx", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg"]);

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },  // 50MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

module.exports = { upload };