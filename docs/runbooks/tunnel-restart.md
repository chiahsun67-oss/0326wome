# Runbook：Cloudflare Tunnel 重啟

> 本機網路在 ISP 端走 CGNAT（WAN 取得私有 IP 10.x.x.x），傳統 port forwarding 無法對外，改以 Cloudflare Quick Tunnel 繞過。
>
> 每次電腦重開、或 tunnel 斷線後，依下列步驟重啟。
> **重啟後網址會換**（Quick Tunnel 特性），記得通知使用者。

## 觸發時機

- 電腦重開機後
- Cloudflare Tunnel 程序被關閉或當機
- 臨時要把本機 `localhost:3000` 對外公開，供客戶 / 同事測試

## 先決條件（只需做一次，已完成）

- [x] 後端 node 服務在 `localhost:3000` 監聽（`0.0.0.0`，不只 `127.0.0.1`）
- [x] 已用 `winget` 安裝 `cloudflared`
- [x] Windows 防火牆已允許 TCP 3000 inbound（`wmsm3000`、`WMSM Backend (TCP 3000)` 規則）

## 使用方式

### 1. 確認 node 服務正在跑

開 PowerShell 執行：

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
```

- 有輸出 → node 在跑，下一步
- 沒輸出 → 先啟動後端（`cd D:\wmsm\backend; npm run dev`）或 Windows Service（`Start-Service WMSM`）

### 2. 啟動 Tunnel

```powershell
cloudflared tunnel --url http://localhost:3000 --no-autoupdate --logfile D:\wmsm\cloudflared.log
```

**此視窗不能關**，關閉即斷線。要常駐建議另開一個 PowerShell 視窗並最小化。

> 若出現「cloudflared 不是內部或外部命令」，改用完整路徑：
>
> ```powershell
> & "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe" tunnel --url http://localhost:3000 --no-autoupdate --logfile D:\wmsm\cloudflared.log
> ```

### 3. 取得新網址

啟動後 3~5 秒內，視窗會印出類似這樣的框框：

```
+----------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:        |
|  https://xxxx-xxxx-xxxx-xxxx.trycloudflare.com           |
+----------------------------------------------------------+
```

那段 `https://xxxx.trycloudflare.com` 就是新對外網址。

若視窗訊息太多翻不到，可從日誌撈：

```powershell
Select-String -Path D:\wmsm\cloudflared.log -Pattern "trycloudflare\.com" | Select-Object -Last 1
```

## 停止 Tunnel

| 方法 | 動作 |
|---|---|
| A | tunnel 視窗按 `Ctrl + C` |
| B | 另開 PowerShell：`Get-Process cloudflared -ErrorAction SilentlyContinue \| Stop-Process` |

## 常見問題

| 狀況 | 解法 |
|---|---|
| 啟動後立刻 `connection refused` | node 服務沒跑，回到步驟 1 |
| 拿到網址但外面連不到 | 等 30 秒再試（DNS 傳播），或確認 node 綁在 `0.0.0.0` 而不只是 `127.0.0.1` |
| `cloudflared` 指令找不到 | 重開 PowerShell 讓 PATH 生效；或使用完整路徑 |
| 網址被 Cloudflare 擋（5xx） | 重啟 tunnel 取新網址 |

## 安全注意

- Quick Tunnel 網址是**公開的**，任何拿到網址的人都能存取，請勿在此環境擺放未驗證的機敏資料
- `/api/db-check` 已在 `backend/src/app.ts` 限制只有本機（`127.0.0.1` / `::1`）可呼叫，從 tunnel 過來會得到 404
- 對外 API 建議都走有驗證的路由（登入 token）

## 未來升級成「固定網址」

Quick Tunnel 每次重啟網址會變，長期使用不便。若要固定網址：

1. 註冊免費 Cloudflare 帳號
2. 綁定自己的網域（便宜 .xyz 約 NT$300/年）
3. 改用 Named Tunnel（可綁自己網域 + 設 Windows Service 開機自動啟動）

需要時跟 Claude Code 說「幫我設定 Named Tunnel」。
