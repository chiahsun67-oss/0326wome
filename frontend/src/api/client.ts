import { ApiResponse, ImportPreviewResult, PrintHistoryItem, PrintStats, Product, PurchaseOrder, UserInfo } from '../types';

const BASE = '/api';

async function parseJSON<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  if (!text) return { success: false, error: `HTTP ${res.status} - 空回應` };
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return { success: false, error: `HTTP ${res.status} - 非 JSON 回應：${text.slice(0, 100)}` };
  }
}

async function get<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`);
  return parseJSON<T>(res);
}

async function post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJSON<T>(res);
}

export const api = {
  login: (username: string, password: string) =>
    post<UserInfo>('/auth/login', { username, password }),

  resetPassword: (username: string, new_password: string) =>
    post<{ hash: string }>('/auth/reset-password', { username, new_password }),

  getProduct: (code: string) => get<Product>(`/products/${encodeURIComponent(code)}`),

  getPurchaseOrder: (poNo: string) => get<PurchaseOrder>(`/purchase-orders/${encodeURIComponent(poNo)}`),

  createPrintJob: (payload: {
    source_module: 'WMSM020' | 'WMSM030';
    po_no?: string;
    import_batch?: string;
    operator: string;
    printer_name?: string;
    items: unknown[];
  }) => post<{ job_no: string; total_copies: number }>('/print-jobs', payload),

  getPrintHistory: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
    ).toString();
    return get<{ items: PrintHistoryItem[]; total: number }>(`/print-history?${qs}`);
  },

  getPrintStats: () => get<PrintStats>('/print-stats'),

  getOperators: () => get<string[]>('/operators'),

  previewImport: async (file: File): Promise<ApiResponse<ImportPreviewResult>> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/import/preview`, { method: 'POST', body: form });
    return parseJSON<ImportPreviewResult>(res);
  },

  executeImport: (batch_no: string, operator: string) =>
    post<{ job_no: string; total_copies: number }>('/import/execute', { batch_no, operator }),

  saveUATConfirmation: (payload: {
    confirmer_name: string;
    department: string;
    confirm_date: string;
    result: string;
    check_items: Record<string, boolean>;
    remarks: string;
  }) => post('/uat/confirm', payload),
};
