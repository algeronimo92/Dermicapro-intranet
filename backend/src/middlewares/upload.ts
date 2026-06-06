import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.upload.directory);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const imageOnlyFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no válido. Solo se permiten imágenes JPEG, PNG y WebP'));
  }
};

const receiptFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no válido. Solo se permiten JPEG, PNG, WebP o PDF'));
  }
};

// For image-only uploads (treatment photos, user photos)
export const upload = multer({
  storage,
  fileFilter: imageOnlyFilter,
  limits: { fileSize: config.upload.maxFileSize },
});

// For receipt uploads (images + PDFs)
export const receiptUpload = multer({
  storage,
  fileFilter: receiptFilter,
  limits: { fileSize: config.upload.maxFileSize },
});

// Magic bytes for each MIME type
const MAGIC: Record<string, { offset: number; bytes: number[] }[]> = {
  'image/jpeg': [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  'image/jpg':  [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png':  [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
  'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }],
};

function checkMagicBytes(filePath: string, mimetype: string): boolean {
  const checks = MAGIC[mimetype];
  if (!checks) return true;
  try {
    const needed = Math.max(...checks.map(c => c.offset + c.bytes.length));
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(needed);
    fs.readSync(fd, buf, 0, needed, 0);
    fs.closeSync(fd);
    return checks.every(({ offset, bytes }) =>
      bytes.every((b, i) => buf[offset + i] === b)
    );
  } catch {
    return false;
  }
}

function safeDelete(filePath: string) {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
}

// Middleware applied after multer: validates magic bytes + converts images to WebP
export const processUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const files = req.files
    ? (req.files as Express.Multer.File[])
    : req.file
    ? [req.file]
    : [];

  if (files.length === 0) return next();

  for (const file of files) {
    if (!checkMagicBytes(file.path, file.mimetype)) {
      files.forEach(f => safeDelete(f.path));
      res.status(400).json({ error: 'El contenido del archivo no coincide con su extensión. Archivo rechazado por seguridad.' });
      return;
    }
  }

  try {
    for (const file of files) {
      if (file.mimetype === 'application/pdf') continue;

      const newFilename = file.filename.replace(/\.[^.]+$/, '.webp');
      const newPath = path.join(path.dirname(file.path), newFilename);

      await sharp(file.path)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(newPath);

      safeDelete(file.path);

      file.filename = newFilename;
      file.path = newPath;
      file.mimetype = 'image/webp';
    }
    next();
  } catch (err) {
    files.forEach(f => safeDelete(f.path));
    next(err);
  }
};
