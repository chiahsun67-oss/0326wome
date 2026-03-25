# Runbook：程式碼審查流程

## 觸發時機
- 新功能完成後提交前
- Bug 修復後
- 重構完成後

## 使用方式

```
/code-review
```

## 審查清單

### 後端（Express + TypeScript）
- [ ] `pool.connect()` 是否在 `try` 區塊內？
- [ ] `finally` 是否有 `client?.release()`？
- [ ] 是否有 `await client?.query('ROLLBACK')` 在 catch？
- [ ] SQL 查詢是否使用參數化（`$1, $2`），無字串拼接？
- [ ] `res.json()` 是否在所有 code path 都會被呼叫？
- [ ] controller 是否回傳 `{ success, data?, error? }` 格式？

### 前端（React TSX）
- [ ] API 呼叫是否使用 `api/client.ts` 封裝（非直接 fetch）？
- [ ] 是否處理 `res.success === false` 的情況？
- [ ] 是否有 loading 狀態防止重複送出？
- [ ] 表單必填欄位是否有視覺提示（紅色 `*`）？

### 通用
- [ ] 是否有硬編碼密碼或 token？
- [ ] 是否有遺留的 `console.log`？
- [ ] TypeScript 是否有 `any` 型別（應避免）？

## 問題分級

| 等級 | 說明 | 處理方式 |
|------|------|---------|
| 🔴 Critical | 安全漏洞、資料遺失風險 | 必須修復才能合併 |
| 🟡 Warning | 邏輯錯誤、連線洩漏 | 建議修復 |
| 🔵 Info | 命名、格式、可讀性 | 可選改善 |
