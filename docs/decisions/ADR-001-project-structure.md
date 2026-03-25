# ADR-001：採用 Claude Code Project Structure

**日期：** 2026-03-25
**狀態：** 已採納

## 背景
專案初期為單一 HTML 原型檔（WMSMteb.html），缺乏工程化結構與文件規範。

## 決策
採用 Brij Kishore Pandey 提出的 Claude Code Project Structure，並同步將 HTML 原型重構為：
- **前端**：React 18 + TypeScript + Vite
- **後端**：Express + TypeScript（REST API）
- **資料庫**：PostgreSQL

同時建立：
- `CLAUDE.md` 作為 AI 專案記憶
- `docs/decisions/` 記錄所有架構決策（ADR）
- `docs/runbooks/` 記錄操作手冊
- `.claude/skills/` 封裝可重用 AI 工作流程

## 後果
**正面：**
- Claude Code 擁有持久記憶，跨對話保持一致性
- 前後端分離，職責清晰
- 架構決策有跡可循，方便後人維護
- 技能模組化，可在不同專案重用

**負面：**
- 初期設定需要時間
- 需要同時維護前後端兩個 package.json

## 參考
- 原型檔：`WMSMteb.html`（保留供比對）
- 圖片來源：`claude code pro.jpg`
