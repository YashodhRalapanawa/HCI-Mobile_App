import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';

// Upload directory outside public static paths and gitignored
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/requests');

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB development limit

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `req-doc-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, safeName);
  },
});

export const documentUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF, JPEG, and PNG files are accepted.'));
    }
  },
});

/**
 * Validates the magic numbers (file signature) of the uploaded document.
 * Returns true if valid, false otherwise.
 */
export async function validateFileSignature(filePath: string): Promise<boolean> {
  let fd: number | null = null;
  try {
    const buffer = Buffer.alloc(8);
    fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);

    // PDF magic bytes: %PDF (0x25, 0x50, 0x44, 0x46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return true;
    }

    // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return true;
    }

    // JPEG magic bytes: 0xFF 0xD8 0xFF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    return false;
  } catch {
    return false;
  } finally {
    if (fd !== null) {
      fs.closeSync(fd);
    }
  }
}

/**
 * Safely removes a file from disk if validation or database persistence fails.
 */
export function removeUploadedFile(filePath?: string): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('[upload] Failed to clean up file:', filePath, err);
  }
}
