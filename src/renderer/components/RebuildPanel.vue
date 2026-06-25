<template>
  <div class="panel">
    <div class="panel-header">
      <h2><i class="fas fa-folder-open"></i> 解包项目</h2>
      <p class="panel-desc">从 JSON 文件还原项目结构</p>
    </div>

    <div class="panel-body">
      <!-- JSON 文件选择 -->
      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-file-code"></i> JSON 文件
        </label>
        <div class="input-group">
          <input
            type="text"
            v-model="jsonPath"
            class="form-input"
            placeholder="选择 JSON 文件..."
            readonly
          >
          <button class="btn btn-secondary" @click="selectJson">
            <i class="fas fa-folder-open"></i> 浏览
          </button>
        </div>
      </div>

      <!-- 目标目录选择 -->
      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-folder"></i> 目标目录
        </label>
        <div class="input-group">
          <input
            type="text"
            v-model="destPath"
            class="form-input"
            placeholder="选择解包目标目录..."
            readonly
          >
          <button class="btn btn-secondary" @click="selectDest">
            <i class="fas fa-folder-open"></i> 浏览
          </button>
        </div>
      </div>

      <!-- 选项 -->
      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-sliders-h"></i> 选项
        </label>
        <div class="checkbox-group">
          <label class="checkbox-item">
            <input type="checkbox" v-model="restoreTimestamps">
            <span class="checkbox-mark"></span>
            <span>恢复文件时间戳</span>
          </label>
        </div>
      </div>

      <!-- JSON 信息预览 -->
      <div v-if="jsonInfo" class="form-group">
        <label class="form-label">
          <i class="fas fa-info-circle"></i> 文件信息
        </label>
        <div class="info-card">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">源项目</span>
              <span class="info-value">{{ jsonInfo.source }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">文件数量</span>
              <span class="info-value">{{ jsonInfo.fileCount }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">总大小</span>
              <span class="info-value">{{ formatSize(jsonInfo.totalSize) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ formatDate(jsonInfo.createdAt) }}</span>
            </div>
          </div>

          <!-- 文件列表预览 -->
          <div class="file-preview-toggle" @click="showFileList = !showFileList">
            <i :class="showFileList ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            <span>{{ showFileList ? '隐藏' : '显示' }}文件列表</span>
          </div>

          <div v-if="showFileList" class="file-list">
            <div
              v-for="(file, index) in jsonInfo.files.slice(0, 100)"
              :key="index"
              class="file-item"
            >
              <i class="fas fa-file"></i>
              <span class="file-path">{{ file.path }}</span>
              <span class="file-size">{{ formatSize(file.size) }}</span>
              <span class="file-encoding">{{ file.encoding }}</span>
            </div>
            <div v-if="jsonInfo.files.length > 100" class="file-more">
              ... 还有 {{ jsonInfo.files.length - 100 }} 个文件
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-bar">
        <button
          class="btn btn-secondary"
          @click="loadJsonInfo"
          :disabled="!jsonPath || loading"
        >
          <i class="fas fa-search"></i> 读取信息
        </button>
        <button
          class="btn btn-primary"
          @click="startRebuild"
          :disabled="!canRebuild || loading"
        >
          <i class="fas fa-play"></i> 开始解包
        </button>
      </div>

      <!-- 进度显示 -->
      <div v-if="loading" class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <div class="progress-info">
          <span>{{ statusText }}</span>
          <span>{{ progress }}%</span>
        </div>
      </div>

      <!-- 结果显示 -->
      <div v-if="result" :class="['result-section', result.success ? 'success' : 'error']">
        <div class="result-header">
          <i :class="result.success ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"></i>
          <span>{{ result.success ? '解包成功' : '解包失败' }}</span>
        </div>
        <div v-if="result.error" class="result-error">{{ result.error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const jsonPath = ref('')
const destPath = ref('')
const restoreTimestamps = ref(true)
const jsonInfo = ref(null)
const showFileList = ref(false)
const loading = ref(false)
const progress = ref(0)
const statusText = ref('')
const result = ref(null)

const canRebuild = computed(() => {
  return jsonPath.value && destPath.value
})

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateStr) {
  if (!dateStr) return '未知'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

async function selectJson() {
  const path = await window.electronAPI.selectFile([
    { name: 'JSON Files', extensions: ['json'] },
  ])

  if (path) {
    jsonPath.value = path
    jsonInfo.value = null
    result.value = null
  }
}

async function selectDest() {
  const path = await window.electronAPI.selectDirectory()
  if (path) {
    destPath.value = path
  }
}

async function loadJsonInfo() {
  if (!jsonPath.value) return

  loading.value = true
  statusText.value = '正在读取 JSON 文件...'
  result.value = null

  try {
    const infoResult = await window.electronAPI.readJsonInfo(jsonPath.value)

    if (infoResult.success) {
      jsonInfo.value = infoResult.info
    } else {
      result.value = { success: false, error: infoResult.error }
    }
  } catch (error) {
    result.value = { success: false, error: error.message }
  } finally {
    loading.value = false
  }
}

async function startRebuild() {
  if (!canRebuild.value) return

  loading.value = true
  progress.value = 0
  statusText.value = '正在解包...'
  result.value = null

  // 模拟进度
  const progressInterval = setInterval(() => {
    if (progress.value < 90) {
      progress.value += Math.random() * 10
    }
  }, 200)

  try {
    const rebuildResult = await window.electronAPI.rebuild({
      jsonPath: jsonPath.value,
      destPath: destPath.value,
      timestamps: restoreTimestamps.value,
    })

    clearInterval(progressInterval)
    progress.value = 100
    statusText.value = '解包完成'
    result.value = rebuildResult
  } catch (error) {
    clearInterval(progressInterval)
    result.value = { success: false, error: error.message }
  } finally {
    setTimeout(() => {
      loading.value = false
    }, 500)
  }
}
</script>

<style scoped>
.panel {
  max-width: 800px;
  margin: 0 auto;
}

.panel-header {
  margin-bottom: 32px;
}

.panel-header h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-header h2 i {
  color: var(--accent-color);
}

.panel-desc {
  color: var(--text-secondary);
  margin: 0;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.input-group {
  display: flex;
  gap: 8px;
}

.form-input {
  flex: 1;
  padding: 10px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--accent-color);
}

.form-input[readonly] {
  cursor: pointer;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-item input[type="checkbox"] {
  display: none;
}

.checkbox-mark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.checkbox-item input[type="checkbox"]:checked + .checkbox-mark {
  background: var(--accent-color);
  border-color: var(--accent-color);
}

.checkbox-item input[type="checkbox"]:checked + .checkbox-mark::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.info-card {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--border-color);
}

.info-item {
  padding: 14px 16px;
  background: var(--bg-input);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: var(--text-muted);
}

.info-value {
  font-size: 14px;
  font-weight: 500;
}

.file-preview-toggle {
  padding: 10px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s;
}

.file-preview-toggle:hover {
  background: var(--bg-hover);
}

.file-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  font-size: 13px;
  border-radius: 4px;
}

.file-item:hover {
  background: var(--bg-hover);
}

.file-item i {
  color: var(--text-muted);
  margin-right: 10px;
  font-size: 12px;
}

.file-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: var(--text-muted);
  margin-left: 16px;
  min-width: 60px;
  text-align: right;
}

.file-encoding {
  color: var(--text-muted);
  margin-left: 12px;
  font-size: 11px;
  padding: 2px 6px;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.file-more {
  padding: 8px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-top: 32px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-hover);
}

.progress-section {
  margin-top: 24px;
}

.progress-bar {
  height: 8px;
  background: var(--bg-input);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.result-section {
  margin-top: 24px;
  padding: 16px;
  border-radius: 8px;
}

.result-section.success {
  background: var(--success-bg);
  border: 1px solid var(--success-color);
}

.result-section.error {
  background: var(--error-bg);
  border: 1px solid var(--error-color);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.result-section.success .result-header i {
  color: var(--success-color);
}

.result-section.error .result-header i {
  color: var(--error-color);
}

.result-error {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
