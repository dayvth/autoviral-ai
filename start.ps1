# AutoViral AI — Start all local services
# Run from the autoviral-ai folder: .\start.ps1

$ROOT = $PSScriptRoot

Write-Host "`n=== AutoViral AI ===" -ForegroundColor Cyan

# 1. Redis
$redis = Get-Process redis-server -ErrorAction SilentlyContinue
if (-not $redis) {
    Write-Host "Starting Redis..." -ForegroundColor Yellow
    Start-Process -FilePath "C:\Program Files\Redis\redis-server.exe" `
        -ArgumentList "C:\Program Files\Redis\redis.windows.conf" `
        -WindowStyle Hidden
    Start-Sleep -Seconds 1
}
$pong = & "C:\Program Files\Redis\redis-cli.exe" ping 2>&1
if ($pong -eq "PONG") {
    Write-Host "Redis        RUNNING :6379" -ForegroundColor Green
} else {
    Write-Host "Redis        FAILED" -ForegroundColor Red
}

# 2. Backend API
Write-Host "Starting API..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\apps\api'; npm run dev" -WindowStyle Normal

# 3. Script Worker
Write-Host "Starting Script Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\workers\script-worker'; npm run dev" -WindowStyle Normal

# 4. Frontend
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\apps\web'; npm run dev" -WindowStyle Normal

Write-Host "`n Services starting in separate windows..." -ForegroundColor Cyan
Write-Host " Frontend : http://localhost:3000" -ForegroundColor White
Write-Host " API      : http://localhost:4000" -ForegroundColor White
Write-Host " Redis    : localhost:6379`n" -ForegroundColor White
