@echo off

echo Stopping Vite on port 5174...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5174 "') do (
    taskkill /F /PID %%p >nul 2>&1
)

echo Stopping backend on port 5064...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5064 "') do (
    taskkill /F /PID %%p >nul 2>&1
)

echo Starting backend...
start "LegacyBridge Backend" cmd /k "cd /d "%~dp0..\legacybridge-backend" && dotnet run --project LegacyBridge"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Vite dev server...
cd /d "%~dp0"
npm run dev
