# 系統架構總覽

## 概述
WMSM 麥頭印標系統採用前後端分離架構：
- 前端 React SPA 透過 Vite proxy 呼叫後端 REST API
- 後端 Express 負責商品查詢、列印作業管理、Excel 匯入驗證、使用者認證
- PostgreSQL 儲存所有業務資料

## 架構圖

```
瀏覽器 (localhost:5173)
    │  Vite Dev Server
    │  proxy /api/* → localhost:3000
    ▼
┌──────────────────────────────────────────┐
│            React SPA (TSX)               │
│  Login │ ForgotPassword                  │
│  WMSM020 │ WMSM030 │ History ...         │
│  utils/printLabels.ts  (共用列印函式)     │
│  api/client.ts  (fetch wrapper)          │
└────────────────┬─────────────────────────┘
                 │ HTTP REST
┌────────────────▼─────────────────────────┐
│         Express API (port 3000)          │
│  routes/index.ts                         │
│  controllers/                            │
│    auth │ products │ purchaseOrders       │
│    printJobs │ imports │ uat             │
└────────────────┬─────────────────────────┘
                 │ node-postgres (pg)
┌────────────────▼─────────────────────────┐
│           PostgreSQL (wmsm)              │
│  users │ products │ purchase_orders      │
│  po_items │ print_jobs                   │
│  print_job_items │ import_batches        │
│  import_batch_items │ uat_…             │
│  v_duplicate_prints │ v_print_…        │
└──────────────────────────────────────────┘
```

## 資料表關聯

```
users
suppliers ──┐
            │ supplier_id (nullable)
purchase_orders ──────────────┐
    │ po_id                   │
po_items                      │ po_id (nullable)
                         print_jobs ──────────────┐
                              │ job_id             │
                         print_job_items    import_batches
                                                   │ batch_id
                                            import_batch_items
```

## 關鍵設計決策

### 1. Trigger 產生流水號
`print_jobs.job_no` 與 `import_batches.batch_no` 使用 BEFORE INSERT Trigger 產生，
而非 DEFAULT 子句。原因：PostgreSQL 在 CREATE TABLE 時會 parse-time 解析 `nextval(regclass)`，
sequence 必須事先存在才不會報錯，trigger 則是 execution-time。

### 2. pg Pool 設定
`db.ts` 讀取個別環境變數（`DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD`），
而非單一 `DATABASE_URL`，與 `.env` 格式對齊。

### 3. Pool 連線管理
所有使用 `pool.connect()` 的 controller 將 `connect()` 置於 `try` 內，
並在 `finally` 使用 `client?.release()` 避免連線洩漏。
早期 return（404 / 400）前必須先 `await client.query('ROLLBACK')`。

### 4. 前端錯誤防護
`api/client.ts` 使用 `res.text()` 先讀取 response body，再嘗試 `JSON.parse`，
避免空 body 或非 JSON 回應造成 `SyntaxError`。

### 5. Vite Proxy
開發時前端 proxy `/api/*` 至 `http://localhost:3000`（後端 port），
生產環境需自行設定 Nginx/reverse proxy。

### 6. 密碼安全
`auth.ts` 使用 `bcrypt.compare()`（cost=10）驗證密碼，明文密碼不落地。
`schema.sql` 種子資料中的密碼已預先 hash。
忘記密碼流程（`POST /api/auth/reset-password`）也以 bcrypt 重新 hash 後更新 DB。

### 7. 共用列印函式
`frontend/src/utils/printLabels.ts` 提供 `printLabels(labels: LabelData[]): string | null`，
WMSM020 與 WMSM030 共用。所有動態欄位（品號、品名、日期）透過 `esc()` 進行 HTML escape，
防止列印視窗中的 XSS。

## 效期計算邏輯（WMSM020）

三個欄位（製造日期、有效日期、保存期限）填任意兩個，第三個自動計算：

```
mfg + shelf → exp  = addDays(mfg, shelf)
mfg + exp   → shelf = diffDays(mfg, exp)
exp + shelf → mfg  = addDays(exp, -shelf)
```

此邏輯實作於前端 `pages/WMSM020/index.tsx: handleExpiryChange()`。

## Excel 匯入驗證流程（WMSM030）

```
上傳 .xlsx
  → XLSX.read() 解析
  → 逐列驗證（品號存在、數量 > 0、總箱數核算）
  → 分級：ok / warn / error
  → 存入 import_batches + import_batch_items（status: preview）
  → 回傳預覽結果

確認執行
  → 檢查 err_rows = 0
  → 批次 INSERT print_jobs + print_job_items（含 ref_code）
  → UPDATE import_batches status = executed
  → 前端開啟新視窗，每箱列印一張 8cm×11cm 標籤
```

## 忘記密碼流程

```
登入頁「忘記密碼？」
  → ForgotPassword 頁
  → 輸入帳號 + 新密碼（≥6 字元）
  → POST /api/auth/reset-password
      → 驗證帳號存在且 active=TRUE
      → bcrypt.hash(new_password, 10)
      → UPDATE users SET password=hash
      → 回傳 { hash }
  → 頁面顯示新密碼明文 + hash（各附複製按鈕）
  → 「返回登入並自動填入密碼」→ 密碼欄預填
```
