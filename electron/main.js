const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

// 开发模式判断
const isDev = !app.isPackaged

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'JSON Build',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    // 无边框窗口（可选）
    // frame: false,
    // titleBarStyle: 'hiddenInset',
  })

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// macOS 应用菜单（保证 Cmd+Q、Cmd+W 等快捷键可用）
function setupMenu() {
  const template = [
    {
      label: 'JSON Build',
      submenu: [
        { role: 'about', label: '关于 JSON Build' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏 JSON Build' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: '退出 JSON Build' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { role: 'close', label: '关闭窗口' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  createWindow()
  setupMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 获取当前可用窗口（防止 mainWindow 为 null 时调用 dialog 报错）
function getDialogParent() {
  return BrowserWindow.getFocusedWindow() || mainWindow
}

// IPC 通信处理

// 选择目录
ipcMain.handle('select-directory', async () => {
  const parent = getDialogParent()
  const result = await dialog.showOpenDialog(parent, {
    properties: ['openDirectory'],
    title: '选择项目目录',
  })

  if (result.canceled) {
    return null
  }

  return result.filePaths[0]
})

// 选择文件
ipcMain.handle('select-file', async (event, filters) => {
  const parent = getDialogParent()
  const result = await dialog.showOpenDialog(parent, {
    properties: ['openFile'],
    title: '选择文件',
    filters: filters || [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (result.canceled) {
    return null
  }

  return result.filePaths[0]
})

// 选择保存路径
ipcMain.handle('select-save-path', async (event, defaultName) => {
  const parent = getDialogParent()
  const result = await dialog.showSaveDialog(parent, {
    title: '保存 JSON 文件',
    defaultPath: defaultName || 'structure.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
    ],
  })

  if (result.canceled) {
    return null
  }

  return result.filePath
})

// 执行打包（带真实进度推送）
ipcMain.handle('pack', async (event, options) => {
  const { pack } = require('../src/packer')
  const sender = event.sender

  try {
    await pack(options.targetPath, {
      output: options.outputPath,
      ignore: options.ignore,
      maxSize: options.maxSize,
      onProgress: (info) => {
        // 推送真实进度到渲染进程
        if (!sender.isDestroyed()) {
          sender.send('pack-progress', info)
        }
      },
      onScanProgress: (info) => {
        if (!sender.isDestroyed()) {
          sender.send('pack-scan-progress', info)
        }
      },
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 执行解包（带真实进度推送）
ipcMain.handle('rebuild', async (event, options) => {
  const { rebuild } = require('../src/rebuilder')
  const sender = event.sender

  try {
    await rebuild(options.jsonPath, {
      dest: options.destPath,
      timestamps: options.timestamps,
      onProgress: (info) => {
        if (!sender.isDestroyed()) {
          sender.send('rebuild-progress', info)
        }
      },
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 读取 JSON 文件信息（仅返回前 N 条文件元数据，避免 IPC 载荷过大）
const JSON_INFO_PREVIEW_LIMIT = 200

ipcMain.handle('read-json-info', async (event, jsonPath) => {
  try {
    const content = await fs.promises.readFile(jsonPath, 'utf-8')
    const data = JSON.parse(content)

    const allFiles = Array.isArray(data.files) ? data.files : []
    const previewFiles = allFiles.slice(0, JSON_INFO_PREVIEW_LIMIT).map(f => ({
      path: f.path,
      size: f.size,
      encoding: f.encoding,
    }))

    return {
      success: true,
      info: {
        version: data.version,
        createdAt: data.createdAt,
        source: data.source,
        fileCount: data.fileCount || allFiles.length,
        totalSize: data.totalSize,
        files: previewFiles,
        filesTruncated: allFiles.length > JSON_INFO_PREVIEW_LIMIT,
        filesTotal: allFiles.length,
      },
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 扫描目录预览（接受 maxSize 参数，0 表示不限）
ipcMain.handle('scan-directory', async (event, dirPath, maxSize) => {
  const { IgnoreFilter } = require('../src/ignore')
  const { scanDirectory } = require('../src/packer')

  try {
    const ignoreFilter = await IgnoreFilter.create({
      projectRoot: dirPath,
    })

    const files = []
    const errors = []

    // maxSize 为 number 类型时使用，未传或为 0 表示不限
    const effectiveMaxSize = (typeof maxSize === 'number' && maxSize > 0) ? maxSize * 1024 * 1024 : 0

    await scanDirectory(dirPath, dirPath, ignoreFilter, files, errors, effectiveMaxSize)

    return {
      success: true,
      files: files.map(f => ({
        path: f.relativePath,
        size: f.size,
      })),
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      errors,
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
