import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import pool from '../db';
import { ApiResponse, ImportBatchItem, ImportPreviewResult, ImportRowMessage, RowStatus } from '../types';

interface ExcelRow {
  品號?: string;
  對照號?: string;
  品名?: string;
  單箱數量?: number;
  總進貨數量?: number;
  總箱數?: number;
  製造日期?: string | number;
  有效日期?: string | number;
  保存期限?: number;
  列印張數?: number;
}

function parseExcelDate(val: string | number | undefined): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

export async function previewImport(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: '請上傳 Excel 檔案（.xlsx）' } satisfies ApiResponse);
    return;
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<ExcelRow>(sheet);

    let batchNo = '';

    // 取得已知品號
    const productResult = await pool.query(
      'SELECT code, name FROM products WHERE active = TRUE'
    );
    const productMap = new Map<string, string>(
      productResult.rows.map((r) => [r.code, r.name])
    );

    const items: ImportBatchItem[] = rawRows.map((row, i) => {
      const messages: ImportRowMessage[] = [];
      let rowStatus: RowStatus = 'ok';

      const code      = String(row['品號']    ?? '').trim();
      const refCode   = String(row['對照號']  ?? '').trim();
      const qtyPerBox = Number(row['單箱數量']  ?? 0);
      const totalQty  = Number(row['總進貨數量'] ?? 0);
      const totalBoxes   = row['總箱數']   ? Number(row['總箱數'])   : null;
      const printCopies  = Number(row['列印張數'] ?? 1);
      const mfgDate   = parseExcelDate(row['製造日期']);
      const expDate   = parseExcelDate(row['有效日期']);
      const shelfDays = row['保存期限'] ? Number(row['保存期限']) : null;

      // 必填驗證
      if (!code) {
        messages.push({ type: 'error', message: '品號不可為空' });
        rowStatus = 'error';
      } else if (!productMap.has(code)) {
        messages.push({ type: 'error', message: `品號「${code}」不存在於商品資料庫，請確認品號是否正確` });
        rowStatus = 'error';
      }
      if (!qtyPerBox || qtyPerBox <= 0) {
        messages.push({ type: 'error', message: '單箱數量必須大於 0' });
        rowStatus = 'error';
      }
      if (!totalQty || totalQty <= 0) {
        messages.push({ type: 'error', message: '總進貨數量必須大於 0' });
        rowStatus = 'error';
      }

      // 總箱數驗證（警告）
      let calculatedBoxes = totalBoxes;
      if (qtyPerBox > 0 && totalQty > 0) {
        const expected = Math.ceil(totalQty / qtyPerBox);
        calculatedBoxes = expected;
        if (totalBoxes !== null && totalBoxes !== expected) {
          messages.push({
            type: 'warn',
            message: `總箱數 ${totalBoxes}，但依「總進貨數量 ÷ 單箱數量」計算應為 ${expected}（${totalQty} ÷ ${qtyPerBox} = ${(totalQty/qtyPerBox).toFixed(1)}，進位 = ${expected}）。確認數量是否正確？`,
          });
          if (rowStatus === 'ok') rowStatus = 'warn';
        }
      }

      const productName = productMap.get(code) ?? (row['品名'] ? String(row['品名']) : '');

      return {
        row_no: i + 1,
        product_code: code,
        product_name: productName,
        ref_code: refCode,
        qty_per_box: qtyPerBox || null,
        total_qty: totalQty || null,
        total_boxes: calculatedBoxes,
        mfg_date: mfgDate,
        exp_date: expDate,
        shelf_days: shelfDays,
        print_copies: printCopies || 1,
        row_status: rowStatus,
        messages,
      };
    });

    const ok   = items.filter((i) => i.row_status === 'ok').length;
    const warn = items.filter((i) => i.row_status === 'warn').length;
    const err  = items.filter((i) => i.row_status === 'error').length;

    // 存入 DB（preview 狀態）
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const batchResult = await client.query(
        `INSERT INTO import_batches (file_name,operator,total_rows,ok_rows,warn_rows,err_rows,status)
         VALUES ($1,$2,$3,$4,$5,$6,'preview') RETURNING id, batch_no`,
        [req.file.originalname, '倉儲人員', items.length, ok, warn, err]
      );
      const { id: batchId, batch_no: dbBatchNo } = batchResult.rows[0];
      batchNo = dbBatchNo;

      for (const item of items) {
        await client.query(
          `INSERT INTO import_batch_items
             (batch_id,row_no,product_code,product_name,ref_code,
              qty_per_box,total_qty,total_boxes,
              mfg_date,exp_date,shelf_days,print_copies,row_status,messages)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [batchId, item.row_no, item.product_code, item.product_name, item.ref_code ?? '',
           item.qty_per_box, item.total_qty, item.total_boxes,
           item.mfg_date, item.exp_date, item.shelf_days, item.print_copies,
           item.row_status, JSON.stringify(item.messages)]
        );
      }
      await client.query('COMMIT');
    } catch (dbErr) {
      await client?.query('ROLLBACK');
      throw dbErr;
    } finally {
      client?.release();
    }

    const result: ImportPreviewResult = {
      batch_no: batchNo,
      file_name: req.file.originalname,
      total_rows: items.length,
      ok_rows: ok,
      warn_rows: warn,
      err_rows: err,
      items,
    };
    res.json({ success: true, data: result } satisfies ApiResponse<ImportPreviewResult>);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  }
}

export async function executeImport(req: Request, res: Response): Promise<void> {
  const { batch_no, operator, printer_name } = req.body as {
    batch_no: string;
    operator: string;
    printer_name?: string;
  };

  if (!batch_no?.trim() || !operator?.trim()) {
    res.status(400).json({ success: false, error: 'batch_no 與 operator 為必填' } satisfies ApiResponse);
    return;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const batchResult = await client.query(
      `SELECT id, err_rows FROM import_batches WHERE batch_no=$1 AND status='preview'`,
      [batch_no]
    );
    if (!batchResult.rowCount) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: '找不到匯入批次，或已執行過' } satisfies ApiResponse);
      return;
    }
    const { id: batchId, err_rows } = batchResult.rows[0];
    if (err_rows > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: '尚有錯誤列，請修正後再執行' } satisfies ApiResponse);
      return;
    }

    const itemsResult = await client.query(
      `SELECT product_code, product_name, ref_code, qty_per_box, total_qty, total_boxes,
              mfg_date, exp_date, shelf_days, print_copies
       FROM import_batch_items WHERE batch_id=$1 AND row_status <> 'error'`,
      [batchId]
    );

    const items = itemsResult.rows;
    const totalCopies = items.reduce((s: number, i: { print_copies: number }) => s + i.print_copies, 0);

    const jobResult = await client.query(
      `INSERT INTO print_jobs
         (source_module, import_batch, operator, printer_name, total_copies, status, printed_at)
       VALUES ('WMSM030',$1,$2,$3,$4,'done',NOW())
       RETURNING id, job_no`,
      [batch_no, operator, printer_name ?? 'Zebra ZT230 - 倉儲A線', totalCopies]
    );
    const { id: jobId, job_no } = jobResult.rows[0];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await client.query(
        `INSERT INTO print_job_items
           (job_id,line_no,product_code,product_name,ref_code,qty_per_box,total_qty,
            total_boxes,print_copies,mfg_date,exp_date,shelf_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [jobId, i+1, item.product_code, item.product_name, item.ref_code ?? '',
         item.qty_per_box, item.total_qty, item.total_boxes, item.print_copies,
         item.mfg_date, item.exp_date, item.shelf_days]
      );
    }

    await client.query(
      `UPDATE import_batches SET status='executed', job_id=$1 WHERE id=$2`,
      [jobId, batchId]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      data: { job_id: jobId, job_no, total_copies: totalCopies },
      message: `批次列印完成，共 ${totalCopies} 張`,
    } satisfies ApiResponse);
  } catch (err) {
    await client?.query('ROLLBACK');
    res.status(500).json({ success: false, error: String(err) } satisfies ApiResponse);
  } finally {
    client?.release();
  }
}

/** 下載 Excel 範本（欄位順序與 123.xlsx 一致） */
export function downloadTemplate(_req: Request, res: Response): void {
  const headers = ['品號','對照號','品名','單箱數量','總進貨數量','總箱數','製造日期','有效日期','保存期限','列印張數'];

  const sampleRows = [
    ['50037631','0741310','吉伊卡哇透明直傘', 24, 480, 20, '2024-06-01','2025-06-01', 365, 20],
    ['A100001',  '',       'Hello Kitty 保溫杯',12, 120, 10, '2024-08-15','2026-08-15', 731, 10],
  ];

  const wb = XLSX.utils.book_new();

  // 工作表1：範本（含說明列）
  const ws1 = XLSX.utils.aoa_to_sheet([
    headers,
    ...sampleRows,
  ]);
  // 欄寬
  ws1['!cols'] = [12,10,20,10,12,8,12,12,10,10].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws1, '工作表1');

  // 工作表2：欄位說明
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['欄位名稱','必填','格式說明'],
    ['品號',     '✓', '商品唯一編號，系統會自動帶入品名'],
    ['對照號',   '',  '選填，對應條碼下方文字'],
    ['品名',     '',  '可空白，系統依品號自動帶入'],
    ['單箱數量', '✓', '正整數'],
    ['總進貨數量','✓','正整數'],
    ['總箱數',   '',  '可空白，系統自動計算（進位）'],
    ['製造日期', '',  'YYYY-MM-DD 或 Excel 日期格式'],
    ['有效日期', '',  'YYYY-MM-DD 或 Excel 日期格式'],
    ['保存期限', '',  '天數（整數）'],
    ['列印張數', '✓', '預設 1，正整數'],
  ]);
  ws2['!cols'] = [14, 6, 36].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, '工作表2');

  // 工作表3（空白備用）
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), '工作表3');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="WMSM030_template.xlsx"');
  res.send(buf);
}
