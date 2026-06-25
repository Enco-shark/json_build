@echo off
chcp 936 >nul 2>&1
title JSON Build
color 0A

:menu
cls
echo.
echo  ====================================
echo    JSON Build
echo  ====================================
echo.
echo    [1] Install Dependencies
echo    [2] Launch GUI
echo    [3] Pack Project
echo    [4] Rebuild Project
echo    [5] Run Tests
echo    [6] Build Executable
echo    [7] Help
echo    [0] Exit
echo.
echo  ====================================
echo.

set choice=
set /p choice=Select [0-7]:

if "%choice%"=="1" goto install
if "%choice%"=="2" goto gui
if "%choice%"=="3" goto pack
if "%choice%"=="4" goto rebuild
if "%choice%"=="5" goto test
if "%choice%"=="6" goto build
if "%choice%"=="7" goto help
if "%choice%"=="0" goto exit

echo.
echo  Invalid choice
timeout /t 2 >nul
goto menu

:install
cls
echo.
echo  Installing dependencies...
echo.
call npm install
echo.
pause
goto menu

:gui
cls
echo.
echo  Launching GUI...
echo.
call npm run electron:dev
echo.
pause
goto menu

:pack
cls
echo.
echo  === Pack Project ===
echo.
echo  Enter directory path:
set source_dir=
set /p source_dir=Path:
if "%source_dir%"=="" goto menu
echo.
echo  Enter output path (Enter for default):
set output_file=
set /p output_file=Path:
if "%output_file%"=="" (
    call node bin/cli.js pack "%source_dir%"
) else (
    call node bin/cli.js pack "%source_dir%" -o "%output_file%"
)
echo.
pause
goto menu

:rebuild
cls
echo.
echo  === Rebuild Project ===
echo.
echo  Enter JSON file path:
set json_file=
set /p json_file=Path:
if "%json_file%"=="" goto menu
echo.
echo  Enter destination (Enter for current dir):
set dest_dir=
set /p dest_dir=Path:
if "%dest_dir%"=="" (
    call node bin/cli.js rebuild "%json_file%"
) else (
    call node bin/cli.js rebuild "%json_file%" -d "%dest_dir%"
)
echo.
pause
goto menu

:test
cls
echo.
echo  Running tests...
echo.
call npm test
echo.
pause
goto menu

:build
cls
echo.
echo  Building executable...
echo.
call npm run electron:build
echo.
pause
goto menu

:help
cls
echo.
echo  === Help ===
echo.
echo  JSON Build - Project Pack/Rebuild Tool
echo.
echo  CLI Usage:
echo    node bin/cli.js pack [dir] [options]
echo    node bin/cli.js rebuild [json] [options]
echo.
echo  Options:
echo    -o, --output [path]   Output file path
echo    -d, --dest [path]     Target directory
echo    --ignore [rules]      Custom ignore rules
echo    --max-size [MB]       Max file size
echo.
echo  See README.md for details
echo.
pause
goto menu

:exit
cls
echo.
echo  Goodbye!
echo.
timeout /t 2 >nul
exit
