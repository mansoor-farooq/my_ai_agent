@echo off
setlocal
set "REPOSITORY_URL=%~1"
if "%REPOSITORY_URL%"=="" set "REPOSITORY_URL=https://github.com/mansoor-farooq/my_ai_agent"
echo Installing Mansoor Ultra Agent from:
echo %REPOSITORY_URL%
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Ultra-Agent.ps1" -RepositoryUrl "%REPOSITORY_URL%"
set "INSTALL_EXIT=%ERRORLEVEL%"
echo.
if not "%INSTALL_EXIT%"=="0" echo URL installer failed with code %INSTALL_EXIT%.
echo Log: "%LOCALAPPDATA%\Mansoor-Agent-Hub\bootstrap\Install-Ultra-Agent.log"
exit /b %INSTALL_EXIT%
