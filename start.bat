@echo off
chcp 65001 >nul 2>&1
title JSON Build
color 0A

:menu
cls
echo.
echo  ====================================
echo        JSON Build - Quick Start
echo  ====================================
echo.
echo   [1] Install Dependencies
echo   [2] Launch GUI (Electron)
echo   [3] Pack Project (CLI)
echo   [4] Rebuild Project (CLI)
echo   [5] Run Tests
echo   [6] Build Executable
echo   [7] Help
echo   [0] Exit
echo.

set /p choice=Select [0-7]:

if "%choice%"=="1" goto install
if "%choice%"=="2" goto gui
if "%choice%"=="3" goto pack
if "%choice%"=="4" goto rebuild
if "%choice%"=="5" goto test
if "%choice%"=="6" goto build
if "%choice%"=="7" goto help
if "%choice%"=="0" goto exit

echo Invalid choice
timeout /t 2 >nul
goto menu

:install
cls
echo Installing dependencies...
call npm install
echo.
pause
goto menu

:gui
cls
echo Launching GUI...
call npm run electron:dev
echo.
pause
goto menu

:pack
cls
echo Enter directory path to pack:
set /p source=Path:
if "%source%"=="" goto menu
set source=%source:"=%
echo.
echo Enter output file (press Enter for default):
set /p output=Path:
if "%output%"=="" (
    call node bin/cli.js pack "%source%"
) else (
    set output=%output:"=%
    call node bin/cli.js pack "%source%" -o "%output%"
)
echo.
pause
goto menu

:rebuild
cls
echo Enter JSON file path:
set /p json=Path:
if "%json%"=="" goto menu
set json=%json:"=%
echo.
echo Enter destination (press Enter for current dir):
set /p dest=Path:
if "%dest%"=="" (
    call node bin/cli.js rebuild "%json%"
) else (
    set dest=%dest:"=%
    call node bin/cli.js rebuild "%json%" -d "%dest%"
)
echo.
pause
goto menu

:test
cls
echo Running tests...
call npm test
echo.
pause
goto menu

:build
cls
echo Building executable...
call npm run electron:build
echo.
pause
goto menu

:help
cls
echo.
echo  JSON Build - Project Pack/Rebuild Tool
echo.
echo  CLI Usage:
echo    node bin/cli.js pack ^<dir^> [options]
echo    node bin/cli.js rebuild ^<json^> [options]
echo.
echo  Options:
echo    -o, --output ^<path^>    Output file path
echo    -d, --dest ^<path^>      Target directory
echo    --ignore ^<rules^>       Custom ignore rules
echo    --max-size ^<MB^>        Max file size
echo    --no-timestamps        Skip timestamp restore
echo.
echo  See README.md for details
echo.
pause
goto menu

:exit
cls
echo Goodbye!
timeout /t 2 >nul
exit
