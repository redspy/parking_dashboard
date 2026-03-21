@echo off
setlocal enabledelayedexpansion
cd /d %~dp0

set "REPO_DIR=%~dp0"
set "LOG_DIR=%REPO_DIR%logs"
set "API_DIR=%REPO_DIR%apps\api"
set "ENV_FILE=%API_DIR%\.env"
set "ENV_EXAMPLE=%REPO_DIR%.env.example"

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
  echo   %ENV_FILE% not found. Copying from .env.example...
  copy /Y "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
  if %ERRORLEVEL% neq 0 (
    echo ERROR: Cannot copy .env.example to apps\api\.env
    exit /b 1
  )
  echo   IMPORTANT: Edit apps\api\.env and set JWT_SECRET before running in production.
)

rem ── [6/8] DB 마이그레이션 ─────────────────────────────────────────────────────
echo [6/8] Running database migrations...
call pnpm --filter @parking/api exec prisma migrate deploy
if %ERRORLEVEL% neq 0 ( echo ERROR: prisma migrate deploy failed. & exit /b 1 )

rem 최초 배포 시 시드 (실패해도 계속 진행)
call pnpm --filter @parking/api exec prisma db seed >nul 2>&1

rem ── [7/8] 서비스 시작 ─────────────────────────────────────────────────────────
echo [7/8] Starting services...
rem pushd 로 CWD를 REPO_DIR 로 변경 → 상대 경로 logs\ 사용 (중첩 따옴표 없음)
pushd "%REPO_DIR%"
start "parking-api"    /MIN cmd /c "pnpm --filter @parking/api    start   1>>logs\api.log    2>&1"
start "parking-admin"  /MIN cmd /c "pnpm --filter @parking/admin  preview 1>>logs\admin.log  2>&1"
start "parking-mobile" /MIN cmd /c "pnpm --filter @parking/mobile preview 1>>logs\mobile.log 2>&1"
popd
echo   API    : http://localhost:4000
echo   Admin  : http://localhost:5173
echo   Mobile : http://localhost:5174

rem ── [8/8] API 헬스체크 ────────────────────────────────────────────────────────
echo [8/8] Waiting for API to be ready (up to 90s)...
powershell -NoProfile -Command "$ok=$false; for ($i=0; $i -lt 90; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4000/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $ok=$true; break } } catch {} ; Start-Sleep 1 }; if (-not $ok) { exit 1 }"

if %ERRORLEVEL% neq 0 (
  echo.
  echo ERROR: API health check failed after 90s.
  echo Check the log file: %LOG_DIR%\api.log
  echo.
  echo Last 40 lines of api.log:
  powershell -NoProfile -Command "Get-Content '%LOG_DIR%\api.log' -ErrorAction SilentlyContinue -Tail 40"
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
