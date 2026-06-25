@echo off
chcp 65001 >nul 2>&1
title JSON Build - 快速启动
color 0A

:menu
cls
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║          JSON Build - 项目打包解包工具           ║
echo  ╠══════════════════════════════════════════════════╣
echo  ║                                                  ║
echo  ║   [1] 安装依赖                                   ║
echo  ║   [2] 启动图形界面 (GUI)                         ║
echo  ║   [3] 打包项目 (命令行)                           ║
echo  ║   [4] 解包项目 (命令行)                           ║
echo  ║   [5] 运行测试                                   ║
echo  ║   [6] 构建可执行文件                              ║
echo  ║   [7] 查看帮助                                   ║
echo  ║   [0] 退出                                       ║
echo  ║                                                  ║
echo  ╚══════════════════════════════════════════════════╝
echo.

set /p choice=请选择操作 [0-7]:

if "%choice%"=="1" goto install
if "%choice%"=="2" goto gui
if "%choice%"=="3" goto pack
if "%choice%"=="4" goto rebuild
if "%choice%"=="5" goto test
if "%choice%"=="6" goto build
if "%choice%"=="7" goto help
if "%choice%"=="0" goto exit

echo.
echo  [错误] 无效选择，请重新输入
timeout /t 2 >nul
goto menu

:install
cls
echo.
echo  [安装依赖] 正在执行 npm install...
echo.
call npm install
if %errorlevel% equ 0 (
    echo.
    echo  [成功] 依赖安装完成！
) else (
    echo.
    echo  [错误] 依赖安装失败，请检查 Node.js 是否已安装
)
echo.
pause
goto menu

:gui
cls
echo.
echo  [启动图形界面] 正在启动 Electron...
echo.
echo  提示: 首次运行需要先安装依赖 (选项 1)
echo.
call npm run electron:dev
if %errorlevel% neq 0 (
    echo.
    echo  [错误] 启动失败，请确保已安装依赖
    echo  提示: 请先运行选项 1 安装依赖
)
echo.
pause
goto menu

:pack
cls
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║                  打包项目                        ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  请输入要打包的目录路径:
echo  (直接拖拽文件夹到此窗口即可)
echo.
set /p source_dir=路径:

if "%source_dir%"=="" (
    echo.
    echo  [错误] 路径不能为空
    pause
    goto pack
)

REM 去除路径两端的引号
set source_dir=%source_dir:"=%

echo.
echo  请输入输出文件路径:
echo  (直接回车使用默认路径 structure.json)
echo.
set /p output_file=路径:

if "%output_file%"=="" (
    echo.
    echo  [打包] 正在打包 %source_dir% ...
    echo.
    call node bin/cli.js pack "%source_dir%"
) else (
    set output_file=%output_file:"=%
    echo.
    echo  [打包] 正在打包 %source_dir% ...
    echo  [输出] %output_file%
    echo.
    call node bin/cli.js pack "%source_dir%" -o "%output_file%"
)

if %errorlevel% equ 0 (
    echo.
    echo  [成功] 打包完成！
) else (
    echo.
    echo  [错误] 打包失败
)
echo.
pause
goto menu

:rebuild
cls
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║                  解包项目                        ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  请输入 JSON 文件路径:
echo  (直接拖拽文件到此窗口即可)
echo.
set /p json_file=路径:

if "%json_file%"=="" (
    echo.
    echo  [错误] 路径不能为空
    pause
    goto rebuild
)

REM 去除路径两端的引号
set json_file=%json_file:"=%

echo.
echo  请输入目标目录路径:
echo  (直接回车使用当前目录)
echo.
set /p dest_dir=路径:

if "%dest_dir%"=="" (
    echo.
    echo  [解包] 正在解包 %json_file% ...
    echo.
    call node bin/cli.js rebuild "%json_file%"
) else (
    set dest_dir=%dest_dir:"=%
    echo.
    echo  [解包] 正在解包 %json_file% ...
    echo  [目标] %dest_dir%
    echo.
    call node bin/cli.js rebuild "%json_file%" -d "%dest_dir%"
)

if %errorlevel% equ 0 (
    echo.
    echo  [成功] 解包完成！
) else (
    echo.
    echo  [错误] 解包失败
)
echo.
pause
goto menu

:test
cls
echo.
echo  [运行测试] 正在执行测试...
echo.
call npm test
if %errorlevel% equ 0 (
    echo.
    echo  [成功] 所有测试通过！
) else (
    echo.
    echo  [错误] 测试失败
)
echo.
pause
goto menu

:build
cls
echo.
echo  [构建] 正在构建可执行文件...
echo.
echo  提示: 构建过程可能需要几分钟
echo.
call npm run electron:build
if %errorlevel% equ 0 (
    echo.
    echo  [成功] 构建完成！
    echo  [输出] 可执行文件在 release 目录中
) else (
    echo.
    echo  [错误] 构建失败
)
echo.
pause
goto menu

:help
cls
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║                    帮助信息                      ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  JSON Build 是一个项目打包解包工具
echo.
echo  功能说明:
echo  ─────────────────────────────────────────────────
echo  打包: 将项目文件夹中的所有文件合并成一个 JSON 文件
echo  解包: 从 JSON 文件还原整个项目结构
echo.
echo  命令行用法:
echo  ─────────────────────────────────────────────────
echo  node bin/cli.js pack ^<目录路径^> [选项]
echo  node bin/cli.js rebuild ^<json路径^> [选项]
echo.
echo  常用选项:
echo  ─────────────────────────────────────────────────
echo  -o, --output ^<路径^>      指定输出文件路径
echo  -d, --dest ^<路径^>        指定重建目标目录
echo  --ignore ^<规则^>          自定义忽略规则
echo  --max-size ^<MB^>          最大文件大小限制
echo  --no-timestamps          不恢复文件时间戳
echo.
echo  示例:
echo  ─────────────────────────────────────────────────
echo  打包: node bin/cli.js pack ./my-project -o backup.json
echo  解包: node bin/cli.js rebuild backup.json -d ./restored
echo.
echo  技术栈:
echo  ─────────────────────────────────────────────────
echo  CLI:  Node.js
echo  GUI:  Electron + Vue 3
echo.
echo  更多信息请查看 README.md
echo.
pause
goto menu

:exit
cls
echo.
echo  感谢使用 JSON Build！再见！
echo.
timeout /t 2 >nul
exit
