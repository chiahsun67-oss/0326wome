import { Request, Response } from 'express';
import pool from '../db';
import { ApiResponse, PurchaseOrder } from '../types';

export async function getPurchaseOrder(req: Request, res: Response): Promise<void> {
  const { poNo } = req.params;
  let client;
  try {
    client = await pool.connect();
    const poResult = await client.query(
      `SELECT id, po_no, TO_CHAR(po_date,'YYYY-MM-DD') AS po_date,
              supplier_name, remark, status
       FROM purchase_orders WHERE po_no = $1`,
      [poNo.trim()]
    );
    if (poResult.rowCount === 0) {
      res.status(404).json({ success: false, error: `採購單號「${poNo}」不存在` } satisfies ApiResponse);
      return;
    }
    const po = poResult.rows[0];

    const itemsResult = await client.query(
      `SELECT id, po_id, line_no, product_code, product_name, ref_code,
              qty_per_box, total_qty, total_boxes, print_copies,
              TO_CHAR(mfg_date,'YYYY-MM-DD') AS mfg_date,
              TO_CHAR(exp_date,'YYYY-MM-DD') AS exp_date,
              shelf_days
       FROM po_items WHERE po_id = $1 ORDER BY line_no`,
      [po.id]
    );

    const data: PurchaseOrder = { ...po, items: itemsResult.rows };
    res.json({ success: true, data } satisfies ApiResponse<PurchaseOrder>);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  } finally {
    client?.release();
  }
}
