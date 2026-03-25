# 資料持久層上下文

## 職責
所有 PostgreSQL 讀寫操作集中於此，上層 controller 透過此層存取資料。

## 連線設定（backend/src/db.ts）

```typescript
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
});
```

## 資料表一覽

| 資料表 | 說明 |
|--------|------|
| `products` | 商品主檔（品號、品名、對照號） |
| `suppliers` | 供應商主檔 |
| `purchase_orders` | 採購單主檔 |
| `po_items` | 採購單明細（含 GENERATED 總箱數） |
| `print_jobs` | 列印批次（job_no 由 trigger 產生） |
| `print_job_items` | 列印明細 |
| `import_batches` | Excel 匯入批次（batch_no 由 trigger 產生） |
| `import_batch_items` | 匯入明細（含驗證結果 JSONB） |
| `uat_confirmations` | UAT 簽核紀錄 |

## View

| View | 說明 |
|------|------|
| `v_duplicate_prints` | 重複列印偵測（同品號同採購單列印 > 1 次） |
| `v_print_history` | 列印歷史（含 is_duplicate 欄位） |

## 規範
- 所有 SQL 使用參數化查詢（`$1, $2, ...`），禁止字串拼接
- 需要 transaction 的操作使用 `pool.connect()` + BEGIN/COMMIT/ROLLBACK
- `pool.connect()` 必須在 `try` 區塊內，`finally` 使用 `client?.release()`
- `pool.query()` 可直接使用（簡單查詢，無需 transaction）
- 日期欄位統一以 `TO_CHAR(date, 'YYYY-MM-DD')` 格式回傳
