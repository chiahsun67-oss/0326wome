# install-nssm.ps1
# 下載 nssm 並放到 C:\Windows\System32 （需系統管理員權限）
# 若已安裝 Chocolatey 或 Scoop 會優先使用。

#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

function Test-Command($name) {
    $null = Get-Command $name -ErrorAction SilentlyContinue
    return $?
}

if (Test-Command nssm) {
    Write-Host "[OK] nssm 已安裝: $((Get-Command nssm).Source)" -ForegroundColor Green
    exit 0
}

if (Test-Command choco) {
    Write-Host "[INFO] 以 Chocolatey 安裝 nssm..." -ForegroundColor Cyan
    choco install nssm -y
    exit $LASTEXITCODE
}

if (Test-Command scoop) {
    Write-Host "[INFO] 以 Scoop 安裝 nssm..." -ForegroundColor Cyan
    scoop install nssm
    exit $LASTEXITCODE
}

Write-Host "[INFO] 未偵測到 Chocolatey/Scoop，改用手動下載..." -ForegroundColor Yellow

$zipUrl  = 'https://nssm.cc/release/nssm-2.24.zip'
$tmpZip  = Join-Path $env:TEMP 'nssm-2.24.zip'
$tmpDir  = Join-Path $env:TEMP 'nssm-2.24'
$target  = 'C:\Windows\System32\nssm.exe'

Write-Host "  下載 $zipUrl"
Invoke-WebRequest -Uri $zipUrl -OutFile $tmpZip -UseBasicParsing

Write-Host "  解壓到 $tmpDir"
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
Expand-Archive -Path $tmpZip -DestinationPath $env:TEMP -Force

$arch = if ([Environment]::Is64BitOperatingSystem) { 'win64' } else { 'win32' }
$src  = Join-Path $tmpDir "$arch\nssm.exe"

if (-not (Test-Path $src)) { throw "找不到 $src" }

Copy-Item $src $target -Force
Remove-Item $tmpZip -Force
Remove-Item $tmpDir -Recurse -Force

Write-Host "[OK] nssm 已安裝到 $target" -ForegroundColor Green
Write-Host "     請重新開啟 PowerShell 讓 PATH 生效" -ForegroundColor Yellow
