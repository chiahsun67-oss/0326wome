import { Request, Response } from 'express';
import pool from '../db';
import { ApiResponse, Product } from '../types';

export async function getProductByCode(req: Request, res: Response): Promise<void> {
  const { code } = req.params;
  try {
    const result = await pool.query<Product>(
      'SELECT id, code, name, ref_code, unit, active FROM products WHERE code = $1 AND active = TRUE',
      [code.trim()]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: `品號「${code}」不存在於商品資料庫` } satisfies ApiResponse);
      return;
    }
    res.json({ success: true, data: result.rows[0] } satisfies ApiResponse<Product>);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  }
}

export async function searchProducts(req: Request, res: Response): Promise<void> {
  const q = String(req.query.q || '').trim();
  try {
    const result = await pool.query<Product>(
      `SELECT id, code, name, ref_code, unit
       FROM products
       WHERE active = TRUE AND (code ILIKE $1 OR name ILIKE $1)
       ORDER BY code LIMIT 20`,
      [`%${q}%`]
    );
    res.json({ success: true, data: result.rows } satisfies ApiResponse<Product[]>);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  }
}
