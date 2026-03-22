@echo off
setlocal enabledelayedexpansion
cd /d %~dp0

set "REPO_DIR=%~dp0"
set "LOG_DIR=%REPO_DIR%logs"
set "API_DIR=%REPO_DIR%apps\api"
set "ENV_FILE=%API_DIR%\.env"
set "RUNNER_ENV_FILE=D:\runners\parking_dashboard.env"

echo ========================================
echo  Parking Dashboard  --  Windows Deploy
echo  Repo : %REPO_DIR%
echo ========================================

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

rem ── [1/8] Node.js / pnpm 확인 ────────────────────────────────────────────────
echo [1/8] Checking Node.js and pnpm...

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo ERROR: Node.js not found. Install Node.js 20.6 or later.
  exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do echo   Node.js %%v

where pnpm >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo   pnpm not found. Installing via npm...
  call npm install -g pnpm@9
  if %ERRORLEVEL% neq 0 ( echo ERROR: pnpm install failed. & exit /b 1 )
)
for /f "tokens=*" %%v in ('pnpm --version 2^>nul') do echo   pnpm %%v OK

rem ── [2/8] 기존 프로세스 종료 ─────────────────────────────────────────────────
echo [2/8] Stopping existing services on ports 4000 / 5173 / 5174...
for %%p in (4000 5173 5174) do (
  for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%%p " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
  )
)

rem ── [3/8] 의존성 설치 ─────────────────────────────────────────────────────────
echo [3/8] Installing dependencies...
call pnpm install --frozen-lockfile
if %ERRORLEVEL% neq 0 (
  echo   --frozen-lockfile failed. Retrying without...
  call pnpm install
  if %ERRORLEVEL% neq 0 ( echo ERROR: pnpm install failed. & exit /b 1 )
)

rem ── [4/8] 빌드 ────────────────────────────────────────────────────────────────
echo [4/8] Building all packages...
call pnpm build
if %ERRORLEVEL% neq 0 ( echo ERROR: Build failed. & exit /b 1 )

rem ── [5/8] .env 확인 ───────────────────────────────────────────────────────────
echo [5/8] Checking environment file...
if not exist "%ENV_FILE%" (
  echo   apps\api\.env not found. Copying from runner secrets file...
  if not exist "%RUNNER_ENV_FILE%" (
    echo ERROR: Runner secrets file not found: %RUNNER_ENV_FILE%
    echo   Please create this file on the server with the correct environment variables.
    echo   See .env.example for reference.
    exit /b 1
  )
  copy /Y "%RUNNER_ENV_FILE%" "%ENV_FILE%" >nul
  if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to copy %RUNNER_ENV_FILE% to apps\api\.env
    exit /b 1
  )
  echo   .env copied from %RUNNER_ENV_FILE%
) else (
  echo   .env already exists. Skipping.
)

rem ── [6/8] DB 마이그레이션 ─────────────────────────────────────────────────────
echo [6/8] Running database migrations...
call pnpm --filter @parking/api exec prisma migrate deploy
if %ERRORLEVEL% neq 0 ( echo ERROR: prisma migrate deploy failed. & exit /b 1 )

rem 최초 배포 시 시드 (실패해도 계속 진행)
call pnpm --filter @parking/api exec prisma db seed >nul 2>&1

rem ── [7/8] 서비스 시작 ─────────────────────────────────────────────────────────
echo [7/8] Starting services...
pushd "%REPO_DIR%"
start "parking-api"    /MIN cmd /c "pnpm --filter @parking/api    start   1>>logs\api.log    2>&1"
start "parking-admin"  /MIN cmd /c "pnpm --filter @parking/admin  preview 1>>logs\admin.log  2>&1"
start "parking-mobile" /MIN cmd /c "pnpm --filter @parking/mobile preview 1>>logs\mobile.log 2>&1"
popd

rem 5초 대기 후 api.log 선행 출력 (API 가 즉시 죽으면 여기서 원인을 알 수 있음)
echo   Waiting 5s for API process to initialize...
powershell -NoProfile -Command "Start-Sleep 5"
echo.
echo --- api.log (first 30 lines) ---
powershell -NoProfile -Command "Get-Content '%LOG_DIR%\api.log' -ErrorAction SilentlyContinue -TotalCount 30"
echo --- end ---
echo.

rem ── [8/8] API 헬스체크 ────────────────────────────────────────────────────────
echo [8/8] Waiting for API to be ready (up to 60s)...
powershell -NoProfile -Command "$ok=$false; for ($i=0; $i -lt 60; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4000/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $ok=$true; break } } catch {} ; Start-Sleep 1 }; if (-not $ok) { exit 1 }"

if %ERRORLEVEL% neq 0 (
  echo.
  echo ERROR: API health check failed.
  echo.
  echo --- api.log last 60 lines ---
  powershell -NoProfile -Command "Get-Content '%LOG_DIR%\api.log' -ErrorAction SilentlyContinue -Tail 60"
  echo --- end ---
  exit /b 1
)

echo.
echo ========================================
echo  Deploy complete!
echo  API    : http://localhost:4000
echo  Admin  : http://localhost:5173
echo  Mobile : http://localhost:5174
echo  Logs   : %LOG_DIR%
echo ========================================
exit /b 0
