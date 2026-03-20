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

echo [1/7] Checking pnpm...
where pnpm >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo pnpm not found. Trying corepack...
  where corepack >nul 2>&1
  if %ERRORLEVEL% neq 0 (
    echo ERROR: pnpm/corepack not found. Install Node.js 20+ with corepack.
    exit /b 1
  )
  call corepack enable
  call corepack prepare pnpm@9.1.0 --activate
  where pnpm >nul 2>&1
  if %ERRORLEVEL% neq 0 (
    echo ERROR: pnpm installation failed.
    exit /b 1
  )
)

echo [2/7] Stopping existing services on ports 4000/5173/5174...
for %%p in (4000 5173 5174) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
  )
)

echo [3/7] Installing dependencies...
call pnpm install --frozen-lockfile
if %ERRORLEVEL% neq 0 (
  echo ERROR: pnpm install failed.
  exit /b 1
)

echo [4/7] Building workspace...
call pnpm build
if %ERRORLEVEL% neq 0 (
  echo ERROR: build failed.
  exit /b 1
)

if not exist "%REPO_DIR%apps\api\.env" (
  echo [5/7] apps\api\.env not found. Copying from .env.example...
  copy /Y "%REPO_DIR%.env.example" "%REPO_DIR%apps\api\.env" >nul
)

echo [6/7] Starting API/Admin/Mobile...
start "parking-api" /MIN cmd /c "cd /d %REPO_DIR%apps\api && node --env-file=.env dist/main.js >> %LOG_DIR%\api.log 2>&1"
start "parking-admin" /MIN cmd /c "cd /d %REPO_DIR% && pnpm --filter @parking/admin preview -- --host 0.0.0.0 --port 5173 >> %LOG_DIR%\admin.log 2>&1"
start "parking-mobile" /MIN cmd /c "cd /d %REPO_DIR% && pnpm --filter @parking/mobile preview -- --host 0.0.0.0 --port 5174 >> %LOG_DIR%\mobile.log 2>&1"

echo [7/7] Health check (API /health)...
powershell -NoProfile -Command ^
  "$ok = $false; for ($i = 0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4000/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $ok = $true; break } } catch {}; Start-Sleep -Seconds 1 }; if (-not $ok) { exit 1 }"
if %ERRORLEVEL% neq 0 (
  echo ERROR: API health check failed. Check logs\api.log
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
