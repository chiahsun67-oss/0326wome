---
name: WMSM 專案狀態
description: 架構、已知修正、啟動方式（重要）
type: project
---

本專案（C:\Users\chia_\Documents\0326wome）為 **WMSM 麥頭印標系統**，已建立完整 Claude Code Project Structure。

## 技術堆疊

- 前端：React 18 + TypeScript（Vite，port 5173）
- 後端：Express + TypeScript（ts-node-dev，port 3000）
- 資料庫：PostgreSQL（DB 名稱：`wmsm`，9 張資料表 + 2 個 view）
- 標籤機：Zebra ZT230
- 密碼：bcrypt（cost=10）

## 功能模組

| 模組 | 說明 |
|------|------|
| 登入 / 忘記密碼 | bcrypt 驗證；忘記密碼可自助重設，回傳新 hash 供複製 |
| WMSM020 | 手動套印（PO 查詢、效期三選二、品項明細、列印視窗） |
| WMSM030 | Excel 批次匯入（.xlsx 驗證預覽，10 欄含對照號，執行後開啟列印視窗） |
| 標籤預覽 | 8×11cm 標籤樣式確認 |
| 列印紀錄 | 歷史查詢、重複列印偵測 |
| UAT 簽核 | 勾選清單 + 主管簽核 |

## 啟動方式

```bash
# 1. 建 DB
createdb wmsm
psql wmsm -f database/schema.sql

# 2. 後端
cd backend && npm run dev    # http://localhost:3000

# 3. 前端
cd frontend && npm run dev   # http://localhost:5173
```

測試帳號：admin / warehouse01 / warehouse02 / qa01，密碼均為 `wmsm2026`

## 已知重要修正（已全部解決）

| 問題 | 根因 | 解法 |
|------|------|------|
| schema.sql 報 `relation does not exist` | `DEFAULT nextval()` parse-time 解析 regclass | 改用 BEFORE INSERT Trigger |
| 後端 500 空 body | `pool.connect()` 在 try 外，unhandled rejection | 移進 try，改用 `let client` + `client?.release()` |
| 前端 SyntaxError empty JSON | `res.json()` 無防護 | 改用 `res.text()` + try JSON.parse |
| API 全部 500 | Vite proxy 指向 port 3001 | `vite.config.ts` 改為 port 3000 |
| executeImport BEGIN 後早期 return 無 ROLLBACK | 事務懸掛 | 兩個早期 return 前加 ROLLBACK |
| 密碼明文儲存 | auth.ts 直接比對 | bcrypt.compare()，schema 種子改為 hash |
| 列印視窗 XSS | 品號/品名直接插 HTML | printLabels.ts 加 esc() HTML escape |

## 工作守則

- `pool.connect()` 必須放在 `try` 內，搭配 `client?.release()` 防止連線洩漏
- BEGIN 後早期 return 前必須 `await client.query('ROLLBACK')`
- SQL 全部參數化（`$1, $2`），禁止字串拼接
- 修改程式碼前必須先讀取相關檔案
- 需要對外操作（push、PR、刪除）一律先確認
- 動態內容插入 HTML 必須過 `esc()` HTML escape

**Why:** 使用者希望專案像有工程師常駐，使用 /code-review、/refactor、/release 技能跨對話保持一致性。

**How to apply:** 新對話開始時直接引用 CLAUDE.md 工作守則與目錄結構；遇到 DB/API 問題先查 `docs/decisions/` ADR。
