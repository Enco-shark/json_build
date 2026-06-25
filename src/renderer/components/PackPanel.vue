<template>
  <div class="panel">
    <div class="panel-header">
      <h2><i class="fas fa-file-archive"></i> 打包项目</h2>
      <p class="panel-desc">将项目文件夹打包成 JSON 文件</p>
    </div>

    <div class="panel-body">
      <!-- 源目录选择 -->
      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-folder"></i> 源目录
        </label>
        <div class="input-group">
          <input
            type="text"
            v-model="sourcePath"
            class="form-input"
            placeholder="选择要打包的项目目录..."
            readonly
          >
          <button class="btn btn-secondary" @click="selectSource">
            <i class="fas fa-folder-open"></i> 浏览
          </button>
        </div>
      </div>

      <!-- 输出路径 -->
      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-file-code"></i> 输出文件
        </label>
        <div class="input-group">
          <input
            type="text"
            v-model="outputPath"
            class="form-input"
            placeholder="选择输出路径..."
            readonly
          >
          <button class="btn btn-secondary" @click="selectOutput">
            <i class="fas fa-save"></i> 浏览
          </button>
        </div>
      </div>

      <!-- 高级选项 -->
      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-sliders-h"></i> 高级选项
        </label>
        <div class="options-grid">
          <div class="option-item">
            <label>最大文件大小 (MB)</label>
            <input
              type="number"
              v-model.number="maxSize"
              class="form-input"
              min="1"
              max="1000"
            >
          </div>
          <div class="option-item">
            <label>忽略规则</label>
            <input
              type="text"
              v-model="ignoreRules"
              class="form-input"
              placeholder="temp,cache,*.log"
            >
          </div>
        </div>
      </div>

      <!-- 文件预览 -->
      <div v-if="previewFiles.length > 0" class="form-group">
        <label class="form-label">
          <i class="fas fa-list"></i> 文件预览 ({{ previewFiles.length }} 个文件)
        </label>
        <div class="file-preview">
          <div class="file-stats">
            <span><i class="fas fa-file"></i> {{ previewFiles.length }} 个文件</span>
            <span><i class="fas fa-database"></i> {{ formatSize(totalSize) }}</span>
          </div>
          <div class="file-list">
            <div
              v-for="(file, index) in previewFiles.slice(0, 50)"
              :key="index"
              class="file-item"
            >
              <i class="fas fa-file"></i>
              <span class="file-path">{{ file.path }}</span>
              <span class="file-size">{{ formatSize(file.size) }}</span>
            </div>
            <div v-if="previewFiles.length > 50" class="file-more">
              ... 还有 {{ previewFiles.length - 50 }} 个文件
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-bar">
        <button
          class="btn btn-secondary"
          @click="scanDirectory"
          :disabled="!sourcePath || loading"
        >
          <i class="fas fa-search"></i> 扫描预览
        </button>
        <button
          class="btn btn-primary"
          @click="startPack"
          :disabled="!canPack || loading"
        >
          <i class="fas fa-play"></i> 开始打包
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
          <span>{{ result.success ? '打包成功' : '打包失败' }}</span>
        </div>
        <div v-if="result.error" class="result-error">{{ result.error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useSettings } from '../composables/useSettings'

const { settings } = useSettings()

const sourcePath = ref('')
const outputPath = ref('')
const previewFiles = ref([])
const totalSize = ref(0)
const loading = ref(false)
const progress = ref(0)
const statusText = ref('')
const result = ref(null)

// 从共享设置派生
const maxSize = computed({
  get: () => settings.maxSize,
  set: (val) => { settings.maxSize = val },
})

const ignoreRules = computed({
  get: () => settings.ignoreRules.join(', '),
  set: (val) => {
    settings.ignoreRules = val
      .split(',')
      .map(r => r.trim())
      .filter(Boolean)
  },
})

const canPack = computed(() => {
  return sourcePath.value && outputPath.value
})

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 进度事件取消订阅函数
let unsubPackProgress = null
let unsubScanProgress = null

onMounted(() => {
  // 监听扫描进度
  unsubScanProgress = window.electronAPI.onPackScanProgress((info) => {
    statusText.value = `正在扫描: ${info.current} (已发现 ${info.scanned} 个)`
  })

  // 监听打包进度
  unsubPackProgress = window.electronAPI.onPackProgress((info) => {
    const pct = info.total > 0 ? Math.round((info.current / info.total) * 100) : 0
    progress.value = pct
    statusText.value = `正在打包 [${info.current}/${info.total}] ${info.file}`
  })
})

onBeforeUnmount(() => {
  if (unsubPackProgress) unsubPackProgress()
  if (unsubScanProgress) unsubScanProgress()
})

async function selectSource() {
  const path = await window.electronAPI.selectDirectory()
  if (path) {
    sourcePath.value = path
    outputPath.value = path + '.json'
    previewFiles.value = []
    result.value = null

    // 实现自动扫描设置
    if (settings.autoScan) {
      await scanDirectory()
    }
  }
}

async function selectOutput() {
  const defaultName = sourcePath.value
    ? sourcePath.value.split(/[\\/]/).pop() + '.json'
    : 'structure.json'

  const path = await window.electronAPI.selectSavePath(defaultName)
  if (path) {
    outputPath.value = path
  }
}

async function scanDirectory() {
  if (!sourcePath.value) return

  loading.value = true
  statusText.value = '正在扫描目录...'
  result.value = null

  try {
    // 传递 maxSize 给扫描接口，保持与打包一致
    const scanResult = await window.electronAPI.scanDirectory(sourcePath.value, maxSize.value)

    if (scanResult.success) {
      previewFiles.value = scanResult.files
      totalSize.value = scanResult.totalSize
      statusText.value = `扫描完成: ${scanResult.files.length} 个文件`
    } else {
      result.value = { success: false, error: scanResult.error }
    }
  } catch (error) {
    result.value = { success: false, error: error.message }
  } finally {
    loading.value = false
  }
}

async function startPack() {
  if (!canPack.value) return

  loading.value = true
  progress.value = 0
  statusText.value = '准备打包...'
  result.value = null

  try {
    const packResult = await window.electronAPI.pack({
      targetPath: sourcePath.value,
      outputPath: outputPath.value,
      ignore: ignoreRules.value || undefined,
      maxSize: maxSize.value,
    })

    progress.value = 100
    statusText.value = packResult.success ? '打包完成' : '打包失败'
    result.value = packResult
  } catch (error) {
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

.options-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.option-item label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.file-preview {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.file-stats {
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: var(--text-secondary);
}

.file-stats i {
  margin-right: 6px;
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
