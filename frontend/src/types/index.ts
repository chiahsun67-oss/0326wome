export type ModuleId = 'm020' | 'm030' | 'label' | 'history' | 'confirm';

export interface UserInfo {
  id: number;
  username: string;
  display_name: string;
  department: string;
  role: 'admin' | 'operator' | 'inspector';
}

export interface Product {
  id: number;
  code: string;
  name: string;
  ref_code: string;
  unit: string;
}

export interface POItem {
  id?: number;
  line_no?: number;
  product_code: string;
  product_name: string;
  ref_code: string;
  qty_per_box: number | '';
  total_qty: number | '';
  total_boxes: number | '';
  print_copies: number | '';
  mfg_date: string;
  exp_date: string;
  shelf_days: number | '';
}

export interface PurchaseOrder {
  id: number;
  po_no: string;
  po_date: string;
  supplier_name: string;
  remark: string;
  status: string;
  items: POItem[];
}

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

export interface PrintStats {
  monthly_jobs: number;
  monthly_copies: number;
  monthly_duplicates: number;
  today_jobs: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
