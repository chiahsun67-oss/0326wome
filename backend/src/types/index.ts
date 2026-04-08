// ── 商品 ──────────────────────────────────────────────────
export interface Product {
  id: number;
  code: string;
  name: string;
  ref_code: string;
  unit: string;
  active: boolean;
}

// ── 採購單 ────────────────────────────────────────────────
export interface PurchaseOrder {
  id: number;
  po_no: string;
  po_date: string;
  supplier_name: string;
  remark: string;
  status: 'open' | 'closed' | 'cancelled';
  items: POItem[];
}

export interface POItem {
  id: number;
  po_id: number;
  line_no: number;
  product_code: string;
  product_name: string;
  ref_code: string;
  qty_per_box: number;
  total_qty: number;
  total_boxes: number;
  print_copies: number;
  mfg_date: string | null;
  exp_date: string | null;
  shelf_days: number | null;
}

// ── 列印 ──────────────────────────────────────────────────
export interface PrintJobItem {
  product_code: string;
  product_name: string;
  ref_code: string;
  qty_per_box: number;
  total_qty: number;
  total_boxes: number;
  print_copies: number;
  mfg_date: string | null;
  exp_date: string | null;
  shelf_days: number | null;
}

export interface CreatePrintJobRequest {
  source_module: 'WMSM020' | 'WMSM030';
  po_no?: string;
  import_batch?: string;
  operator: string;
  printer_name?: string;
  items: PrintJobItem[];
}

export interface PrintJob {
  id: number;
  job_no: string;
  source_module: string;
  operator: string;
  printer_name: string;
  total_copies: number;
  status: 'pending' | 'printing' | 'done' | 'failed';
  printed_at: string | null;
  created_at: string;
}

// ── 列印歷史 ──────────────────────────────────────────────
export interface PrintHistoryItem {
  id: number;
  printed_at: string | null;
  product_code: string;
  product_name: string;
  batch_no: string | null;
  copies: number;
  operator: string;
  module: string;
  status: string;
  is_duplicate: boolean;
}

export interface PrintHistoryQuery {
  date_from?: string;
  date_to?: string;
  product_code?: string;
  operator?: string;
  page?: number;
  page_size?: number;
}

export interface PrintHistoryStats {
  monthly_jobs: number;
  monthly_copies: number;
  monthly_duplicates: number;
  today_jobs: number;
}

// ── Excel 匯入 ────────────────────────────────────────────
export type RowStatus = 'ok' | 'warn' | 'error';

export interface ImportRowMessage {
  type: RowStatus;
  message: string;
}

export interface ImportBatchItem {
  row_no: number;
  product_code: string;
  product_name: string;
  ref_code: string;
  qty_per_box: number | null;
  total_qty: number | null;
  total_boxes: number | null;
  mfg_date: string | null;
  exp_date: string | null;
  shelf_days: number | null;
  print_copies: number | null;
  row_status: RowStatus;
  messages: ImportRowMessage[];
}

export interface ImportPreviewResult {
  batch_no: string;
  file_name: string;
  total_rows: number;
  ok_rows: number;
  warn_rows: number;
  err_rows: number;
  items: ImportBatchItem[];
}

// ── UAT 簽核 ──────────────────────────────────────────────
export interface UATConfirmRequest {
  confirmer_name: string;
  department: string;
  confirm_date: string;
  result: 'pass' | 'conditional_pass' | 'fail';
  check_items: Record<string, boolean>;
  remarks: string;
}

// ── API Response ──────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
