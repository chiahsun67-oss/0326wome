# 快速啟動指南

## 前置需求

- Node.js 20+
- PostgreSQL 14+（本機已安裝，帳號 `postgres`，密碼見 `backend/.env`）
- npm 10+

---

## 1. 建立資料庫

```bash
# 建立資料庫
createdb wmsm

# 匯入 Schema 與種子資料（約 10 秒）
psql wmsm -f database/schema.sql
```

驗證：
```bash
psql wmsm -c "\dt"
# 應看到 9 張資料表 + 2 個 view
```

---

## 2. 啟動後端

```bash
cd backend
# .env 已建立，確認 DB_PASSWORD 正確
npm install
npm run dev
# → [INFO] 啟動於 http://localhost:3000
```

健康檢查：
```
http://localhost:3000/health
http://localhost:3000/api/db-check
```

---

## 3. 啟動前端

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

> Vite 自動 proxy `/api/*` → `http://localhost:3000`（在 `vite.config.ts` 設定）

---

## 4. 常見問題

| 錯誤訊息 | 原因 | 解法 |
|----------|------|------|
| `password authentication failed` | `DB_PASSWORD` 錯誤 | 檢查 `backend/.env` |
| `relation "xxx" does not exist` | Schema 未匯入 | 執行 `psql wmsm -f database/schema.sql` |
| `500 空 body` | 後端未啟動 或 port 不符 | 確認後端跑在 3000，`vite.config.ts` target 為 3000 |
| `ECONNREFUSED 3000` | 後端未啟動 | `cd backend && npm run dev` |

---

## 5. API 端點一覽

| Method | 路徑 | 說明 |
|--------|------|------|
| GET | `/api/products/:code` | 查詢商品 |
| GET | `/api/products/search?q=` | 模糊搜尋 |
| GET | `/api/purchase-orders/:poNo` | 查詢採購單 |
| POST | `/api/print-jobs` | 建立列印作業（WMSM020） |
| GET | `/api/print-history` | 列印歷史（篩選 + 分頁） |
| GET | `/api/print-stats` | 統計摘要 |
| GET | `/api/operators` | 操作人員清單 |
| POST | `/api/import/preview` | Excel 驗證預覽 |
| POST | `/api/import/execute` | 執行批次列印（WMSM030） |
| POST | `/api/uat/confirm` | UAT 簽核 |
| GET | `/api/db-check` | DB 連線診斷 |

---

## 6. Excel 範本欄位順序

建立 `.xlsx` 時第一列為標題，欄位順序如下：

| 品號 | 品名 | 單箱數量 | 總進貨數量 | 製造日期 | 有效日期 | 保存期限(天) | 列印張數 |
|------|------|---------|-----------|---------|---------|------------|---------|

- 日期格式：`YYYY-MM-DD` 或 Excel 日期格式均可
- 品名可留空，系統會從商品主檔自動帶入
- 總進貨數量 ÷ 單箱數量若不整除，系統自動進位並顯示警告
