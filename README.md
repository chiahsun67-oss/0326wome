# WMSM 麥頭印標系統

倉儲管理系統模組（WMSM）— 進貨麥頭標籤套印、Excel 批次匯入、列印紀錄查詢。
已配置 Claude Code 常駐工程師環境。

---

## 技術堆疊

| 層次 | 技術 |
|------|------|
| 前端 | React 18 + TypeScript + Vite |
| 後端 | Node.js + Express + TypeScript |
| 資料庫 | PostgreSQL |
| 標籤機 | Zebra ZT230（條碼列印） |

---

## 快速啟動

### 1. 建立資料庫

```bash
createdb wmsm
psql wmsm -f database/schema.sql
```

### 2. 後端

```bash
cd backend
cp .env.example .env        # 填入 DB_PASSWORD
npm install
npm run dev                  # 啟動於 http://localhost:3000
```

### 3. 前端

```bash
cd frontend
npm install
npm run dev                  # 啟動於 http://localhost:5173
```

> Vite 自動 proxy `/api/*` → `http://localhost:3000`

---

## 功能模組

| 模組 | 路徑 | 說明 |
|------|------|------|
| WMSM020 | `/` Tab 1 | 手動套印（PO 查詢、效期三選二、品項明細） |
| WMSM030 | `/` Tab 2 | Excel 批次匯入（.xlsx 驗證預覽） |
| 標籤預覽 | `/` Tab 3 | 8×11cm 標籤樣式確認 |
| 列印紀錄 | `/` Tab 4 | 歷史查詢、重複列印偵測 |
| 確認簽核 | `/` Tab 5 | UAT 勾選清單 + 主管簽核 |

---

## API 端點

| Method | 路徑 | 說明 |
|--------|------|------|
| GET | `/api/products/:code` | 查詢商品（含品名、對照號） |
| GET | `/api/products/search?q=` | 模糊搜尋商品 |
| GET | `/api/purchase-orders/:poNo` | 查詢採購單含明細 |
| POST | `/api/print-jobs` | 建立列印作業（WMSM020） |
| GET | `/api/print-history` | 列印歷史（支援篩選、分頁） |
| GET | `/api/print-stats` | 本月 / 今日列印統計 |
| GET | `/api/operators` | 操作人員清單 |
| POST | `/api/import/preview` | 上傳 .xlsx 驗證預覽 |
| POST | `/api/import/execute` | 執行批次列印（WMSM030） |
| POST | `/api/uat/confirm` | 儲存 UAT 簽核 |
| GET | `/api/db-check` | DB 連線診斷 |
| GET | `/health` | 服務健康檢查 |

---

## Claude Code 指令

```
/code-review    程式碼審查
/refactor       重構建議
/release        準備發布
```

---

## 專案文件

- [架構總覽](docs/architecture.md)
- [架構決策紀錄](docs/decisions/)
- [操作手冊](docs/runbooks/)
- [快速啟動](docs/runbooks/quickstart.md)
