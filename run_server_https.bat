@echo off
setlocal

cd /d "%~dp0server"

if not exist ".env" (
  echo [ERROR] server\.env file is missing.
  echo Create server\.env first, then run this file again.
  pause
  exit /b 1
)

where py >nul 2>nul
if %errorlevel%==0 (
  set "BOOTSTRAP=py -3"
) else (
  set "BOOTSTRAP=python"
)

if not exist ".venv\Scripts\python.exe" (
  echo [SETUP] Creating virtual environment...
  %BOOTSTRAP% -m venv .venv
  if errorlevel 1 goto :error
)

call ".venv\Scripts\activate.bat"
if errorlevel 1 goto :error

echo [SETUP] Upgrading pip...
python -m pip install --upgrade pip
if errorlevel 1 goto :error

echo [SETUP] Installing requirements...
python -m pip install -r requirements.txt
if errorlevel 1 goto :error

echo [SETUP] Applying initial data...
python init_data.py
if errorlevel 1 goto :error

echo [RUN] Starting HTTP and HTTPS servers...
python run_http_https.py
goto :eof

:error
echo.
echo [ERROR] Failed while preparing or starting the server.
pause
exit /b 1
