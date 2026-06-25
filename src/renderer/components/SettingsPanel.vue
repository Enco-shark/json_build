<template>
  <div class="panel">
    <div class="panel-header">
      <h2><i class="fas fa-cog"></i> 设置</h2>
      <p class="panel-desc">配置应用程序选项</p>
    </div>

    <div class="panel-body">
      <!-- 默认设置 -->
      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-sliders-h"></i> 默认设置
        </label>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">最大文件大小</span>
              <span class="setting-desc">超过此大小的文件将被跳过</span>
            </div>
            <div class="setting-control">
              <input
                type="number"
                v-model.number="settings.maxSize"
                class="form-input"
                min="1"
                max="1000"
              >
              <span class="setting-unit">MB</span>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">恢复时间戳</span>
              <span class="setting-desc">解包时恢复文件的修改时间</span>
            </div>
            <div class="setting-control">
              <label class="toggle">
                <input type="checkbox" v-model="settings.restoreTimestamps">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">自动扫描</span>
              <span class="setting-desc">选择目录后自动扫描文件</span>
            </div>
            <div class="setting-control">
              <label class="toggle">
                <input type="checkbox" v-model="settings.autoScan">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 忽略规则 -->
      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-filter"></i> 默认忽略规则
        </label>
        <div class="settings-card">
          <div class="ignore-rules">
            <div
              v-for="(rule, index) in settings.ignoreRules"
              :key="index"
              class="rule-item"
            >
              <span class="rule-text">{{ rule }}</span>
              <button class="rule-remove" @click="removeRule(index)">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div class="add-rule">
            <input
              type="text"
              v-model="newRule"
              class="form-input"
              placeholder="添加新规则..."
              @keyup.enter="addRule"
            >
            <button class="btn btn-secondary" @click="addRule">
              <i class="fas fa-plus"></i> 添加
            </button>
          </div>
        </div>
      </div>

      <!-- 主题设置 -->
      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-palette"></i> 外观
        </label>
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">主题</span>
              <span class="setting-desc">选择应用程序主题</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.theme" class="form-select">
                <option value="dark">深色</option>
                <option value="light">浅色</option>
                <option value="auto">跟随系统</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 关于 -->
      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-info-circle"></i> 关于
        </label>
        <div class="settings-card">
          <div class="about-section">
            <div class="about-logo">
              <i class="fas fa-cube"></i>
              <h3>JSON Build</h3>
              <span class="about-version">v1.1.0</span>
            </div>
            <p class="about-desc">
              一个用于将项目文件夹打包成 JSON 文件，以及从 JSON 文件还原项目结构的工具。
            </p>
            <div class="about-links">
              <a href="#" class="about-link">
                <i class="fas fa-book"></i> 文档
              </a>
              <a href="#" class="about-link">
                <i class="fab fa-github"></i> GitHub
              </a>
              <a href="#" class="about-link">
                <i class="fas fa-bug"></i> 报告问题
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-bar">
        <button class="btn btn-secondary" @click="resetSettings">
          <i class="fas fa-undo"></i> 恢复默认
        </button>
        <button class="btn btn-primary" @click="saveSettings">
          <i class="fas fa-save"></i> 保存设置
        </button>
      </div>

      <!-- 保存提示 -->
      <div v-if="showSaveToast" class="save-toast">
        <i class="fas fa-check-circle"></i>
        <span>设置已保存</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSettings } from '../composables/useSettings'

const { settings, defaultSettings, resetSettings: doReset } = useSettings()
const newRule = ref('')
const showSaveToast = ref(false)

function addRule() {
  const rule = newRule.value.trim()
  if (rule && !settings.ignoreRules.includes(rule)) {
    settings.ignoreRules.push(rule)
    newRule.value = ''
  }
}

function removeRule(index) {
  settings.ignoreRules.splice(index, 1)
}

function resetSettings() {
  doReset()
}

function saveSettings() {
  // 设置已通过 watch 自动保存，这里仅显示提示
  showSaveToast.value = true
  setTimeout(() => {
    showSaveToast.value = false
  }, 2000)
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

.settings-card {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.setting-item {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-title {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-input {
  width: 80px;
  padding: 8px 12px;
  background: var(--bg-secondary);
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

.setting-unit {
  font-size: 13px;
  color: var(--text-muted);
}

.form-select {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  cursor: pointer;
}

/* Toggle Switch */
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: var(--text-muted);
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(24px);
  background-color: white;
}

/* Ignore Rules */
.ignore-rules {
  padding: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border-radius: 6px;
  font-size: 13px;
}

.rule-text {
  color: var(--text-primary);
}

.rule-remove {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.rule-remove:hover {
  color: var(--error-color);
}

.add-rule {
  padding: 12px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 8px;
}

.add-rule .form-input {
  flex: 1;
  width: auto;
}

/* About Section */
.about-section {
  padding: 24px;
  text-align: center;
}

.about-logo {
  margin-bottom: 16px;
}

.about-logo i {
  font-size: 48px;
  color: var(--accent-color);
  margin-bottom: 12px;
}

.about-logo h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.about-version {
  font-size: 13px;
  color: var(--text-muted);
}

.about-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.about-links {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.about-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-radius: 6px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  transition: all 0.2s ease;
}

.about-link:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* Action Bar */
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

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

/* Save Toast */
.save-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  background: var(--success-color);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
