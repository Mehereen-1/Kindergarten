@echo off
setlocal

cd /d C:\system project\Kindergarten\next-dashboard-ui\attendance_cctv
call .venv\Scripts\activate.bat

set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1

cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
