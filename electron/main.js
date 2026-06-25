const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

// 开发模式判断
const isDev = !app.isPackaged

let mainWindow

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

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC 通信处理

// 选择目录
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
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
  const result = await dialog.showOpenDialog(mainWindow, {
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
  const result = await dialog.showSaveDialog(mainWindow, {
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

// 执行打包
ipcMain.handle('pack', async (event, options) => {
  const { pack } = require('../src/packer')

  try {
    await pack(options.targetPath, {
      output: options.outputPath,
      ignore: options.ignore,
      maxSize: options.maxSize,
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 执行解包
ipcMain.handle('rebuild', async (event, options) => {
  const { rebuild } = require('../src/rebuilder')

  try {
    await rebuild(options.jsonPath, {
      dest: options.destPath,
      timestamps: options.timestamps,
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 读取 JSON 文件信息
ipcMain.handle('read-json-info', async (event, jsonPath) => {
  try {
    const content = await fs.promises.readFile(jsonPath, 'utf-8')
    const data = JSON.parse(content)

    return {
      success: true,
      info: {
        version: data.version,
        createdAt: data.createdAt,
        source: data.source,
        fileCount: data.fileCount,
        totalSize: data.totalSize,
        files: data.files.map(f => ({
          path: f.path,
          size: f.size,
          encoding: f.encoding,
        })),
      },
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 扫描目录预览
ipcMain.handle('scan-directory', async (event, dirPath) => {
  const { IgnoreFilter } = require('../src/ignore')
  const { scanDirectory } = require('../src/packer')

  try {
    const ignoreFilter = new IgnoreFilter({
      projectRoot: dirPath,
    })

    const files = []
    const errors = []

    await scanDirectory(dirPath, dirPath, ignoreFilter, files, errors, 0)

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
