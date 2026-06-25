const { contextBridge, ipcRenderer } = require('electron')

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 目录选择
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // 文件选择
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),

  // 保存路径选择
  selectSavePath: (defaultName) => ipcRenderer.invoke('select-save-path', defaultName),

  // 打包
  pack: (options) => ipcRenderer.invoke('pack', options),

  // 解包
  rebuild: (options) => ipcRenderer.invoke('rebuild', options),

  // 读取 JSON 信息
  readJsonInfo: (jsonPath) => ipcRenderer.invoke('read-json-info', jsonPath),

  // 扫描目录（maxSize 可选，单位 MB，0/未传表示不限）
  scanDirectory: (dirPath, maxSize) => ipcRenderer.invoke('scan-directory', dirPath, maxSize),

  // 进度事件监听（返回取消订阅函数）
  onPackProgress: (callback) => {
    const handler = (_event, info) => callback(info)
    ipcRenderer.on('pack-progress', handler)
    return () => ipcRenderer.removeListener('pack-progress', handler)
  },

  onPackScanProgress: (callback) => {
    const handler = (_event, info) => callback(info)
    ipcRenderer.on('pack-scan-progress', handler)
    return () => ipcRenderer.removeListener('pack-scan-progress', handler)
  },

  onRebuildProgress: (callback) => {
    const handler = (_event, info) => callback(info)
    ipcRenderer.on('rebuild-progress', handler)
    return () => ipcRenderer.removeListener('rebuild-progress', handler)
  },
})
