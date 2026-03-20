@echo off
setlocal enabledelayedexpansion
cd /d %~dp0

set "REPO_DIR=%~dp0"
set "LOG_DIR=%REPO_DIR%logs"

echo ========================================
echo Parking Dashboard Windows Deploy
echo Repo: %REPO_DIR%
echo ========================================

if not exist "%LOG_DIR%" (
  mkdir "%LOG_DIR%"
)

echo [1/8] Checking pnpm...
where pnpm >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo pnpm not found. Trying corepack...
  where corepack >nul 2>&1
  if %ERRORLEVEL% neq 0 (
    echo corepack not found. Trying npm global install for pnpm...
    where npm >nul 2>&1
    if %ERRORLEVEL% neq 0 (
      echo ERROR: npm not found. Install Node.js 20+ on runner.
      exit /b 1
    )
    call npm install -g pnpm@9.1.0
    if %ERRORLEVEL% neq 0 (
      echo ERROR: pnpm installation via npm failed.
      exit /b 1
    )
  ) else (
    call corepack enable
    call corepack prepare pnpm@9.1.0 --activate
    if %ERRORLEVEL% neq 0 (
      echo corepack prepare failed. Trying npm global install for pnpm...
      call npm install -g pnpm@9.1.0
      if %ERRORLEVEL% neq 0 (
        echo ERROR: pnpm installation failed.
        exit /b 1
      )
    )
  )
  where pnpm >nul 2>&1
  if %ERRORLEVEL% neq 0 (
    echo ERROR: pnpm installation failed.
    exit /b 1
  )
)

echo [2/8] Stopping existing services on ports 4000/5173/5174...
for %%p in (4000 5173 5174) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
  )
)

echo [3/8] Installing dependencies...
call pnpm install --frozen-lockfile
if %ERRORLEVEL% neq 0 (
  echo ERROR: pnpm install failed.
  exit /b 1
)

echo [4/8] Building workspace...
call pnpm build
if %ERRORLEVEL% neq 0 (
  echo ERROR: build failed.
  exit /b 1
)

if not exist "%REPO_DIR%apps\api\.env" (
  echo [5/8] apps\api\.env not found. Copying from .env.example...
  copy /Y "%REPO_DIR%.env.example" "%REPO_DIR%apps\api\.env" >nul
)

echo [6/8] Preparing API database...
call pnpm --filter @parking/api exec prisma migrate deploy
if %ERRORLEVEL% neq 0 (
  echo ERROR: prisma migrate deploy failed.
  exit /b 1
)

echo [7/8] Starting API/Admin/Mobile...
rem API is started with tsx to support workspace TS imports (@parking/types)
start "parking-api" /MIN cmd /c "cd /d %REPO_DIR% && pnpm --filter @parking/api dev >> %LOG_DIR%\api.log 2>&1"
start "parking-admin" /MIN cmd /c "cd /d %REPO_DIR% && pnpm --filter @parking/admin preview -- --host 0.0.0.0 --port 5173 >> %LOG_DIR%\admin.log 2>&1"
start "parking-mobile" /MIN cmd /c "cd /d %REPO_DIR% && pnpm --filter @parking/mobile preview -- --host 0.0.0.0 --port 5174 >> %LOG_DIR%\mobile.log 2>&1"

echo [8/8] Health check (API /health)...
powershell -NoProfile -Command ^
  "$ok = $false; for ($i = 0; $i -lt 90; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4000/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $ok = $true; break } } catch {}; Start-Sleep -Seconds 1 }; if (-not $ok) { exit 1 }"
if %ERRORLEVEL% neq 0 (
  echo ERROR: API health check failed. Check logs\api.log
  echo ---------- logs\api.log (tail 120) ----------
  powershell -NoProfile -Command "if (Test-Path '%LOG_DIR%\\api.log') { Get-Content '%LOG_DIR%\\api.log' -Tail 120 } else { Write-Host 'api.log not found' }"
  echo ---------- end log ----------
  exit /b 1
)

echo ========================================
echo Deploy complete.
echo API    : http://localhost:4000
echo Admin  : http://localhost:5173
echo Mobile : http://localhost:5174
echo Logs   : %LOG_DIR%
echo ========================================

exit /b 0
