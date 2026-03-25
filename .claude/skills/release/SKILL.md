# Skill：版本發布 (release)

## 用途
協助準備並執行版本發布流程，確保發布安全、可追溯。

## 觸發
```
/release
```

## 執行流程
1. `git log --oneline origin/main..HEAD` 確認待發布變更
2. `npx tsc --noEmit`（後端 + 前端）確認無型別錯誤
3. 建議版本號（Semantic Versioning）
4. 協助撰寫 commit message
5. **執行 `git push` 前必須請求使用者確認**

## 版本號規則

| 類型 | 說明 |
|------|------|
| PATCH | Bug 修復、文件更新 |
| MINOR | 新功能、向後相容 |
| MAJOR | API 格式變更、DB schema 破壞性變更 |

## 安全守則
- 絕不在未確認的情況下執行 `git push`
- 絕不使用 `--force` 除非使用者明確要求
- DB schema 有破壞性變更時，必須提醒準備 migration SQL
