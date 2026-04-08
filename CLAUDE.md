# 專案記憶 — CLAUDE.md

## 專案概覽
**WMSM 麥頭印標系統** — 倉儲進貨標籤套印管理系統。

- 前端：React 18 + TypeScript（Vite，port 5173）
- 後端：Express + TypeScript（ts-node-dev，port 3000）
- 資料庫：PostgreSQL（DB 名稱：`wmsm`）
- 標籤機：Zebra ZT230

## 工作守則
- 所有架構決策記錄於 `docs/decisions/`
- 需要對外操作（push、PR、刪除）一律先確認
- 修改程式碼前必須先讀取相關檔案
- 不過度設計，只做當下需要的事
- `pool.connect()` 必須放在 `try` 內，搭配 `client?.release()` 防止連線洩漏

## 目錄結構
```
0326wome/
├── CLAUDE.md                       ← 專案記憶（你在這裡）
├── README.md                       ← 快速啟動指南
├── database/
│   └── schema.sql                  ← PostgreSQL DDL + 種子資料（密碼已 bcrypt）
├── backend/                        ← Express + TypeScript
│   ├── .env                        ← DB 設定（已建立）
│   ├── .env.example
│   ├── src/
│   │   ├── app.ts                  ← 入口 + 全域錯誤 middleware
│   │   ├── db.ts                   ← pg Pool（讀 DB_HOST/USER/PASSWORD）
│   │   ├── types/index.ts
│   │   ├── routes/index.ts
│   │   └── controllers/
│   │       ├── auth.ts             ← 登入 + 忘記密碼（bcrypt）
│   │       ├── products.ts
│   │       ├── purchaseOrders.ts
│   │       ├── printJobs.ts
│   │       ├── imports.ts          ← xlsx 解析 + 驗證
│   │       └── uat.ts
│   └── package.json
├── frontend/                       ← React + TSX + Vite
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                 ← 頁面路由（authScreen + ModuleId 切換）
│   │   ├── types/index.ts
│   │   ├── api/client.ts           ← fetch 封裝（含空 body 防護）
│   │   ├── components/             ← TopBar / StepNav / SideBar / Toast
│   │   ├── utils/
│   │   │   └── printLabels.ts      ← 共用標籤列印函式（HTML escape）
│   │   ├── pages/
│   │   │   ├── Login/index.tsx     ← 登入頁（含忘記密碼連結）
│   │   │   ├── ForgotPassword/index.tsx ← 忘記密碼（生成 hash + 複製）
│   │   │   ├── WMSM020/index.tsx   ← 手動套印
│   │   │   ├── WMSM030/index.tsx   ← Excel 批次匯入（含列印視窗）
│   │   │   ├── LabelPreview/index.tsx
│   │   │   ├── PrintHistory/index.tsx
│   │   │   └── UATConfirm/index.tsx
│   │   └── styles/globals.css
│   └── vite.config.ts              ← proxy /api → localhost:3000
├── docs/
│   ├── architecture.md
│   ├── decisions/                  ← ADR 架構決策紀錄
│   └── runbooks/                   ← 操作手冊
└── .claude/skills/                 ← /code-review /refactor /release
```

## 已知重要修正
| 問題 | 根因 | 解法 |
|------|------|------|
| schema.sql 報 `relation does not exist` | `DEFAULT nextval()` 在 parse time 解析 regclass | 改用 BEFORE INSERT Trigger |
| 後端 500 空 body | `pool.connect()` 在 try 外，unhandled rejection | 移進 try，改用 `let client` + `client?.release()` |
| 前端 SyntaxError empty JSON | `res.json()` 無防護 | 改用 `res.text()` + try JSON.parse |
| API 全部 500 | Vite proxy 指向 port 3001，後端在 3000 | `vite.config.ts` 改為 port 3000 |
| `executeImport` BEGIN 後早期 return 無 ROLLBACK | 事務懸掛 | 兩個早期 return 前加 `await client.query('ROLLBACK')` |
| 密碼明文儲存 | auth.ts 直接比對字串 | 改用 `bcrypt`（cost=10），schema 種子資料更新為 hash |
| 列印視窗 XSS | 品號/品名直接插入 HTML | `printLabels.ts` 加 `esc()` HTML escape |

## 環境設定（backend/.env）
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wmsm
DB_USER=postgres
DB_PASSWORD=（你的密碼）
```

## 常用指令
```bash
# 後端開發
cd backend && npm run dev

# 前端開發
cd frontend && npm run dev

# DB 診斷
curl http://localhost:3000/api/db-check
```
