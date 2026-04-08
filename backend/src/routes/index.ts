import { Router } from 'express';
import multer from 'multer';
import { login, resetPassword } from '../controllers/auth';
import { getProductByCode, searchProducts } from '../controllers/products';
import { getPurchaseOrder } from '../controllers/purchaseOrders';
import { createPrintJob, getPrintHistory, getPrintStats, getOperators } from '../controllers/printJobs';
import { previewImport, executeImport, downloadTemplate } from '../controllers/imports';
import { saveUATConfirmation } from '../controllers/uat';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 認證
router.post('/auth/login', login);
router.post('/auth/reset-password', resetPassword);

// 商品
router.get('/products/search', searchProducts);
router.get('/products/:code', getProductByCode);

// 採購單
router.get('/purchase-orders/:poNo', getPurchaseOrder);

// 列印
router.post('/print-jobs', createPrintJob);
router.get('/print-history', getPrintHistory);
router.get('/print-stats', getPrintStats);
router.get('/operators', getOperators);

// Excel 匯入
router.get('/import/template', downloadTemplate);
router.post('/import/preview', upload.single('file'), previewImport);
router.post('/import/execute', executeImport);

// UAT
router.post('/uat/confirm', saveUATConfirmation);

export default router;
