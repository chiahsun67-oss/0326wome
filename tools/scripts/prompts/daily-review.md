# Prompt：每日程式碼健診

將此 prompt 直接貼入 Claude Code 對話框執行。

---

請執行以下每日健診：

1. `git status` + `git diff HEAD~1` 查看今日所有變更
2. 快速確認是否有：
   - 未完成的 `TODO` / `FIXME` 註解
   - 硬編碼的密碼、token 或測試資料
   - 遺留的 `console.log`
   - `pool.connect()` 不在 `try` 區塊內的情況
   - Vite proxy port 與後端 PORT 不一致
3. 輸出簡短健診報告（5 行以內）
4. 若有問題，依 🔴 / 🟡 / 🔵 分級列出

---

# Prompt：DB 健診

```
執行 http://localhost:3000/api/db-check 並確認：
1. status === "connected"
2. tables 包含所有 9 張資料表
3. 若有缺失，提示執行 psql wmsm -f database/schema.sql
```
