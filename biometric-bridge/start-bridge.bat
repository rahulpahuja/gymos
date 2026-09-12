@echo off
REM Manual run with a visible console window — useful for first checks or
REM troubleshooting (you can see errors/tracebacks). For a fully hands-off
REM setup that auto-starts silently on every login and needs no per-browser
REM certificate warning, run install.bat once instead.
cd /d "%~dp0"
pip install -r requirements.txt
python server.py
pause
