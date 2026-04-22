# WMSM 部署腳本

## 使用順序

**一律以系統管理員身分開啟 PowerShell**，且先允許執行本機腳本：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 1. 安裝 nssm

```powershell
cd D:\AI\0326wome\scripts
.\install-nssm.ps1
```

會依序嘗試：Chocolatey → Scoop → 手動下載 `nssm-2.24.zip`。手動下載版會放到 `C:\Windows\System32\nssm.exe`。

### 2. 部署檔案到正式路徑

將 `backend/` 與 `.env` 複製到 `C:\wmsm\backend\`（預設）。

`.env` 至少包含：
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wmsm
DB_USER=postgres
DB_PASSWORD=你的密碼
```

### 3. 註冊並啟動服務

```powershell
.\deploy-service.ps1
# 若要改路徑 / 服務名稱：
# .\deploy-service.ps1 -AppRoot 'D:\wmsm' -ServiceName 'WMSM-Prod'
```

## 常用運維指令

```powershell
Get-Service WMSM                  # 狀態
Restart-Service WMSM              # 重啟
nssm edit WMSM                    # GUI 編輯服務設定
nssm restart WMSM                 # 用 nssm 重啟（會跑 AppExit 流程）
Get-Content C:\wmsm\logs\stdout.log -Tail 50 -Wait  # 看即時日誌
```

## 移除服務

```powershell
nssm stop WMSM
nssm remove WMSM confirm
```
