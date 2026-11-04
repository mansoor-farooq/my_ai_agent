@echo off
setlocal
cd /d "%~dp0"

echo Pushing Mansoor Farooq agent hub branches...
git push origin HEAD:main HEAD:c-development HEAD:development HEAD:mansoor-development

if errorlevel 1 (
  echo.
  echo Push failed. The saved GitHub login may need attention.
  pause
  exit /b 1
)

echo.
echo All four branches are synchronized.
pause
