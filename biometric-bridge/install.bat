@echo off
REM One-time setup: installs dependencies, generates + trusts the HTTPS
REM certificate at the Windows OS level (so Chrome/Edge stop showing the
REM "not secure" warning entirely, no per-browser click-through needed),
REM opens the firewall port, and sets the bridge to auto-start silently
REM on every login. Run this once. After that, nothing else is needed —
REM just restart the PC and the bridge is already running.
REM
REM Requires: Python already installed (same requirement EasyBio had).
REM Right-click this file and "Run as administrator" if it doesn't
REM self-elevate automatically.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo.
echo [1/5] Installing Python dependencies...
python -m pip install -r requirements.txt
if %errorLevel% neq 0 (
    echo FAILED - is Python installed and on PATH? Run "python --version" to check.
    pause
    exit /b 1
)

echo.
echo [2/5] Generating HTTPS certificate (skipped if one already exists)...
python -c "import server; server.ensure_self_signed_cert()"
if %errorLevel% neq 0 (
    echo FAILED to generate certificate.
    pause
    exit /b 1
)

echo.
echo [3/5] Trusting the certificate in Windows so browsers stop warning...
certutil -addstore -f "ROOT" bridge_cert.pem
if %errorLevel% neq 0 (
    echo WARNING: could not add certificate to the trusted store. Browsers will
    echo still work but will show a one-time warning per device until trusted
    echo manually ^(see README.md^).
)

echo.
echo [4/5] Opening firewall port 8090...
netsh advfirewall firewall show rule name="gymos biometric bridge" >nul 2>&1
if %errorLevel% neq 0 (
    netsh advfirewall firewall add rule name="gymos biometric bridge" dir=in action=allow protocol=TCP localport=8090
) else (
    echo Rule already exists, skipping.
)

echo.
echo [5/5] Setting the bridge to auto-start silently on login...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
powershell -NoProfile -Command ^
    "$s = (New-Object -COM WScript.Shell).CreateShortcut('%STARTUP_DIR%\gymos-biometric-bridge.lnk'); " ^
    "$s.TargetPath = '%~dp0start-bridge-silent.vbs'; " ^
    "$s.WorkingDirectory = '%~dp0'; " ^
    "$s.Save()"

echo.
echo Setup complete. Starting the bridge now...
wscript "%~dp0start-bridge-silent.vbs"

echo.
echo Done. From now on the bridge starts automatically, silently, every time
echo this PC logs in — nothing else to run manually.
echo.
echo Bridge URL for gymos Settings: https://<this PC's LAN IP>:8090
echo (find the IP with: ipconfig)
pause
