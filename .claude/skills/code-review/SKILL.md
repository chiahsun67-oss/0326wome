# Skill：程式碼審查 (code-review)

## 用途
對當前工作目錄的變更進行全面程式碼審查，輸出分級問題清單與改善建議。

## 觸發
```
/code-review
```

## 執行流程
1. 執行 `git diff` 取得所有未提交變更
2. 逐一讀取修改的檔案（完整內容）
3. 依照 `docs/runbooks/code-review.md` 清單審查
4. 輸出結構化報告：
   - 🔴 Critical — 安全漏洞、資料遺失、連線洩漏
   - 🟡 Warning — 邏輯錯誤、缺少錯誤處理
   - 🔵 Info — 命名、格式、可讀性
5. 若無問題，輸出「✅ 審查通過」

## 本專案重點檢查項目
- `pool.connect()` 是否在 try 內
- `client?.release()` 是否在 finally
- SQL 是否參數化（無字串拼接）
- API 回應是否符合 `{ success, data?, error? }` 格式
- Vite proxy port 是否與後端 PORT 一致

## 注意
- 只提供建議，不自動修改程式碼
- 發現 🔴 Critical 問題必須明確標示，不可略過
