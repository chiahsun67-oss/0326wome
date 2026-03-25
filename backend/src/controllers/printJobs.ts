import { Request, Response } from 'express';
import pool from '../db';
import {
  ApiResponse, CreatePrintJobRequest, PrintHistoryItem,
  PrintHistoryQuery, PrintHistoryStats,
} from '../types';

export async function createPrintJob(req: Request, res: Response): Promise<void> {
  const body = req.body as CreatePrintJobRequest;
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // 查 PO ID
    let poId: number | null = null;
    if (body.po_no) {
      const r = await client.query('SELECT id FROM purchase_orders WHERE po_no=$1', [body.po_no]);
      if (r.rowCount && r.rowCount > 0) poId = r.rows[0].id;
    }

    const totalCopies = body.items.reduce((s, i) => s + i.print_copies, 0);

    const jobResult = await client.query(
      `INSERT INTO print_jobs
         (source_module, po_id, import_batch, operator, printer_name, total_copies, status, printed_at)
       VALUES ($1,$2,$3,$4,$5,$6,'done',NOW())
       RETURNING id, job_no`,
      [body.source_module, poId, body.import_batch ?? null,
       body.operator, body.printer_name ?? 'Zebra ZT230 - 倉儲A線', totalCopies]
    );
    const { id: jobId, job_no } = jobResult.rows[0];

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      await client.query(
        `INSERT INTO print_job_items
           (job_id, line_no, product_code, product_name, ref_code,
            qty_per_box, total_qty, total_boxes, print_copies,
            mfg_date, exp_date, shelf_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [jobId, i + 1, item.product_code, item.product_name, item.ref_code,
         item.qty_per_box, item.total_qty, item.total_boxes, item.print_copies,
         item.mfg_date ?? null, item.exp_date ?? null, item.shelf_days ?? null]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      data: { job_id: jobId, job_no, total_copies: totalCopies },
      message: `列印指令已送出，共 ${totalCopies} 張，請至條碼機取件`,
    } satisfies ApiResponse);
  } catch (err) {
    await client?.query('ROLLBACK');
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  } finally {
    client?.release();
  }
}

export async function getPrintHistory(req: Request, res: Response): Promise<void> {
  const q = req.query as PrintHistoryQuery;
  const page = Math.max(1, parseInt(String(q.page ?? '1')));
  const pageSize = Math.min(100, parseInt(String(q.page_size ?? '20')));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let idx = 1;

  if (q.date_from) { conditions.push(`pj.printed_at >= $${idx++}`); params.push(q.date_from); }
  if (q.date_to)   { conditions.push(`pj.printed_at <  $${idx++}`); params.push(q.date_to + ' 23:59:59'); }
  if (q.product_code) { conditions.push(`pji.product_code ILIKE $${idx++}`); params.push(`%${q.product_code}%`); }
  if (q.operator && q.operator !== '全部人員') {
    conditions.push(`pj.operator = $${idx++}`);
    params.push(q.operator);
  }

  const where = conditions.join(' AND ');

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM print_job_items pji
       JOIN print_jobs pj ON pj.id = pji.job_id
       WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query<PrintHistoryItem>(
      `SELECT pji.id,
              TO_CHAR(pj.printed_at,'YYYY-MM-DD HH24:MI') AS printed_at,
              pji.product_code, pji.product_name,
              po.po_no AS batch_no,
              pji.print_copies AS copies,
              pj.operator, pj.source_module AS module, pj.status,
              EXISTS(
                SELECT 1 FROM print_job_items pji2
                JOIN print_jobs pj2 ON pj2.id = pji2.job_id
                WHERE pji2.product_code = pji.product_code
                  AND pj2.po_id = pj.po_id
                  AND pj2.id <> pj.id
                  AND pj2.status = 'done'
              ) AS is_duplicate
       FROM print_job_items pji
       JOIN print_jobs pj ON pj.id = pji.job_id
       LEFT JOIN purchase_orders po ON po.id = pj.po_id
       WHERE ${where}
       ORDER BY pj.printed_at DESC NULLS LAST
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, pageSize, offset]
    );

    res.json({
      success: true,
      data: { items: dataResult.rows, total, page, page_size: pageSize },
    } satisfies ApiResponse);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  }
}

export async function getPrintStats(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query<PrintHistoryStats>(`
      SELECT
        COUNT(DISTINCT CASE WHEN date_trunc('month',printed_at) = date_trunc('month',NOW())
                            THEN id END)::INT AS monthly_jobs,
        COALESCE(SUM(CASE WHEN date_trunc('month',printed_at) = date_trunc('month',NOW())
                          THEN total_copies END),0)::INT AS monthly_copies,
        COUNT(DISTINCT CASE WHEN date_trunc('day',printed_at) = date_trunc('day',NOW())
                            THEN id END)::INT AS today_jobs,
        0::INT AS monthly_duplicates
      FROM print_jobs
      WHERE status = 'done'
    `);
    res.json({ success: true, data: result.rows[0] } satisfies ApiResponse<PrintHistoryStats>);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  }
}

export async function getOperators(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT operator FROM print_jobs ORDER BY operator`
    );
    res.json({ success: true, data: result.rows.map((r) => r.operator) } satisfies ApiResponse<string[]>);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  }
}
