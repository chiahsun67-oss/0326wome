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

## 4. 登入帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| admin | wmsm2026 | 系統管理員 |
| warehouse01 | wmsm2026 | 倉儲人員甲 |
| warehouse02 | wmsm2026 | 倉儲人員乙 |
| qa01 | wmsm2026 | 品管人員 |

> 密碼以 bcrypt（cost=10）儲存。忘記密碼請於登入頁點擊「忘記密碼？」。

---

## 5. 常見問題

| 錯誤訊息 | 原因 | 解法 |
|----------|------|------|
| `password authentication failed` | `DB_PASSWORD` 錯誤 | 檢查 `backend/.env` |
| `relation "xxx" does not exist` | Schema 未匯入 | 執行 `psql wmsm -f database/schema.sql` |
| `500 空 body` | 後端未啟動 或 port 不符 | 確認後端跑在 3000，`vite.config.ts` target 為 3000 |
| `ECONNREFUSED 3000` | 後端未啟動 | `cd backend && npm run dev` |
| 忘記密碼後無法登入 | DB 中密碼未更新 | 使用「忘記密碼」頁面重設，或重跑 schema.sql |

---

## 6. API 端點一覽

| Method | 路徑 | 說明 |
|--------|------|------|
| POST | `/api/auth/login` | 登入（bcrypt 驗證） |
| POST | `/api/auth/reset-password` | 忘記密碼重設 |
| GET | `/api/products/:code` | 查詢商品 |
| GET | `/api/products/search?q=` | 模糊搜尋 |
| GET | `/api/purchase-orders/:poNo` | 查詢採購單 |
| POST | `/api/print-jobs` | 建立列印作業（WMSM020） |
| GET | `/api/print-history` | 列印歷史（篩選 + 分頁） |
| GET | `/api/print-stats` | 統計摘要 |
| GET | `/api/operators` | 操作人員清單 |
| GET | `/api/import/template` | 下載 Excel 範本 |
| POST | `/api/import/preview` | Excel 驗證預覽 |
| POST | `/api/import/execute` | 執行批次列印（WMSM030） |
| POST | `/api/uat/confirm` | UAT 簽核 |
| GET | `/api/db-check` | DB 連線診斷 |

---

## 7. Excel 範本欄位順序

點擊「⬇ 下載 Excel 範本」取得範本（`GET /api/import/template`），或依下表自建：

| 欄位 | 必填 | 說明 |
|------|------|------|
| 品號 | ✓ | 商品唯一編號，系統自動帶入品名 |
| 對照號 | | 選填，對應條碼下方文字 |
| 品名 | | 可空白，系統依品號自動帶入 |
| 單箱數量 | ✓ | 正整數 |
| 總進貨數量 | ✓ | 正整數 |
| 總箱數 | | 可空白，系統自動計算（無條件進位） |
| 製造日期 | | YYYY-MM-DD 或 Excel 日期格式 |
| 有效日期 | | YYYY-MM-DD 或 Excel 日期格式 |
| 保存期限 | | 天數（整數） |
| 列印張數 | ✓ | 預設 1 |

- 日期格式：`YYYY-MM-DD` 或 Excel 日期序號均可
- 總進貨數量 ÷ 單箱數量若不整除，系統自動進位並顯示警告
