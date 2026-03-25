# Runbook：發布流程

## 使用方式

```
/release
```

## 前置確認

```bash
# 確認工作目錄乾淨
git status

# 確認目前在 main
git branch --show-current

# 查看待發布的變更
git log --oneline origin/main..HEAD
```

## 步驟

### 1. 後端（backend/）

```bash
# 確認型別編譯無誤
cd backend && npx tsc --noEmit
```

### 2. 前端（frontend/）

```bash
# 確認型別編譯無誤
cd frontend && npx tsc --noEmit

# 建置
npm run build
```

### 3. 資料庫 Migration

若有 schema 變更，確認 `database/schema.sql` 已更新，
並寫好 incremental migration SQL（不要直接 DROP + CREATE）。

### 4. 版本號規則（Semantic Versioning）

| 類型 | 範例 | 對應變更 |
|------|------|---------|
| PATCH | 1.0.1 | Bug 修復、文件更新 |
| MINOR | 1.1.0 | 新功能、向後相容 |
| MAJOR | 2.0.0 | 破壞性變更（API 格式改變等） |

### 5. Commit

```bash
git add <具體檔案>
git commit -m "release: vX.X.X — 說明主要變更"
```

### 6. 推送（需確認）

```bash
# 確認後再執行
git push origin main
```

**Claude 不會在未確認的情況下執行 push 或 force push。**

## 回滾

```bash
git revert HEAD
git push origin main
```
