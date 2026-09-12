@echo off
REM Run this once to install dependencies, or double-click any time to start the bridge.
REM To auto-start on login: put a shortcut to this file in shell:startup (Win+R > shell:startup).
cd /d "%~dp0"
pip install -r requirements.txt
python server.py
pause
