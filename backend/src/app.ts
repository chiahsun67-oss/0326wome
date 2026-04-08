import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import pool from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 診斷：測試 DB 連線 + 列出所有資料表
app.get('/api/db-check', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    res.json({
      status: 'connected',
      tables: result.rows.map((r) => r.table_name),
      db: process.env.DB_NAME,
      user: process.env.DB_USER,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: String(err) });
  }
});

// 全域錯誤 middleware — 確保所有未捕捉的錯誤都回傳 JSON（不回傳空 body）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, error: err.message || String(err) });
});

app.listen(PORT, () => {
  console.log(`WMSM Backend 啟動於 http://localhost:${PORT}`);
});

export default app;
