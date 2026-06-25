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

  // 扫描目录
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
})
