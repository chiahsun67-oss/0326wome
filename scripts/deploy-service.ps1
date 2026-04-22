# deploy-service.ps1
# WMSM 後端 build + 註冊為 Windows Service
# 使用：以系統管理員執行 PowerShell -> .\deploy-service.ps1
# 可用參數覆蓋預設路徑：
#   .\deploy-service.ps1 -AppRoot 'C:\wmsm' -ServiceName 'WMSM'

#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string]$AppRoot     = 'C:\wmsm',
    [string]$ServiceName = 'WMSM',
    [string]$DisplayName = 'WMSM 麥頭印標系統',
    [string]$NodeExe     = 'C:\Program Files\nodejs\node.exe',
    [string]$PgService   = 'postgresql-x64-16'
)

$ErrorActionPreference = 'Stop'

# ---- 前置檢查 ----
if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
    throw "找不到 nssm，請先執行 .\install-nssm.ps1"
}
if (-not (Test-Path $NodeExe)) {
    throw "找不到 Node.js：$NodeExe"
}

$backend = Join-Path $AppRoot 'backend'
$logDir  = Join-Path $AppRoot 'logs'
$distApp = Join-Path $backend 'dist\app.js'

if (-not (Test-Path $backend)) { throw "後端目錄不存在：$backend" }
if (-not (Test-Path (Join-Path $backend '.env'))) {
    Write-Host "[WARN] $backend\.env 不存在，服務啟動時會抓不到 DB 設定" -ForegroundColor Yellow
}

# ---- Build ----
Write-Host "[STEP] npm ci + npm run build（$backend）" -ForegroundColor Cyan
Push-Location $backend
try {
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci 失敗' }
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw 'npm run build 失敗' }
} finally {
    Pop-Location
}

if (-not (Test-Path $distApp)) { throw "build 後仍找不到 $distApp" }

# ---- 建立 log 目錄 ----
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

# ---- 若服務已存在先移除 ----
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[STEP] 移除既有服務 $ServiceName" -ForegroundColor Cyan
    if ($existing.Status -ne 'Stopped') { & nssm stop $ServiceName confirm | Out-Null }
    & nssm remove $ServiceName confirm | Out-Null
    Start-Sleep -Seconds 1
}

# ---- 安裝服務 ----
Write-Host "[STEP] 安裝服務 $ServiceName" -ForegroundColor Cyan
& nssm install $ServiceName $NodeExe 'dist\app.js'
& nssm set $ServiceName AppDirectory  $backend
& nssm set $ServiceName DisplayName   $DisplayName
& nssm set $ServiceName Description   'WMSM 麥頭印標系統 - 倉儲進貨標籤套印'
& nssm set $ServiceName Start         SERVICE_AUTO_START
& nssm set $ServiceName AppStdout     (Join-Path $logDir 'stdout.log')
& nssm set $ServiceName AppStderr     (Join-Path $logDir 'stderr.log')
& nssm set $ServiceName AppRotateFiles    1
& nssm set $ServiceName AppRotateOnline   1
& nssm set $ServiceName AppRotateBytes    10485760   # 10 MB

# 依賴 PostgreSQL（確認服務名稱正確）
if (Get-Service -Name $PgService -ErrorAction SilentlyContinue) {
    & nssm set $ServiceName DependOnService $PgService
    Write-Host "     已設定依賴：$PgService" -ForegroundColor DarkGray
} else {
    Write-Host "[WARN] 找不到 PostgreSQL 服務 $PgService，跳過依賴設定" -ForegroundColor Yellow
}

# ---- 啟動 ----
Write-Host "[STEP] 啟動 $ServiceName" -ForegroundColor Cyan
& nssm start $ServiceName

Start-Sleep -Seconds 2
Get-Service -Name $ServiceName | Format-Table Name, Status, StartType -AutoSize

Write-Host ""
Write-Host "[DONE] 驗證：" -ForegroundColor Green
Write-Host "  Get-Service $ServiceName"
Write-Host "  curl http://localhost:3000/api/db-check"
Write-Host "  tail -f $logDir\stdout.log"
