import { Request, Response } from 'express';
import pool from '../db';
import { ApiResponse, UATConfirmRequest } from '../types';

export async function saveUATConfirmation(req: Request, res: Response): Promise<void> {
  const body = req.body as UATConfirmRequest;

  if (!body.confirmer_name || !body.confirm_date || !body.result) {
    res.status(400).json({ success: false, error: '確認人員、日期、結果為必填' } satisfies ApiResponse);
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO uat_confirmations
         (confirmer_name, department, confirm_date, result, check_items, remarks)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, created_at`,
      [body.confirmer_name, body.department ?? '',
       body.confirm_date, body.result,
       JSON.stringify(body.check_items ?? {}),
       body.remarks ?? '']
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'UAT 簽核已儲存',
    } satisfies ApiResponse);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  }
}
