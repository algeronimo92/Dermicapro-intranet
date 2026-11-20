import { Router } from 'express';
import multer from 'multer';
import { config } from '../config/env';
import { ROLES } from '../constants/roles';
import { createInvoice, deleteInvoice, downloadInvoiceAttachment, exportInvoices, getInvoice, getInvoiceDefaults, invoiceReport, listInvoices, updateInvoice } from '../controllers/invoices.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();
const allowedTypes = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const uploadAttachments = multer({
  storage: multer.memoryStorage(),
  defParamCharset: 'utf8',
  limits: {
    fileSize: Math.min(config.upload.maxFileSize, 5 * 1024 * 1024),
    files: 5,
    fields: 19,
    fieldSize: 40000,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new AppError('Solo se permiten adjuntos JPG, PNG y PDF', 400));
    }
    callback(null, true);
  },
}).array('attachments', 5);

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.ACCOUNTANT));
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.get('/', listInvoices);
router.get('/report', invoiceReport);
router.get('/export', exportInvoices);
router.post('/', authorize(ROLES.ADMIN), uploadLimiter, uploadAttachments, createInvoice);
router.get('/defaults', authorize(ROLES.ADMIN), getInvoiceDefaults);
router.get('/:id', getInvoice);
router.put('/:id', authorize(ROLES.ADMIN), uploadLimiter, uploadAttachments, updateInvoice);
router.delete('/:id', authorize(ROLES.ADMIN), deleteInvoice);
router.get('/:id/attachments/:attachmentId', downloadInvoiceAttachment);

export default router;
