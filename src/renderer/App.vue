<template>
  <div class="app">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="logo">
        <i class="fas fa-cube"></i>
        <h1>JSON Build</h1>
      </div>

      <nav class="nav-menu">
        <button
          :class="['nav-item', { active: currentView === 'pack' }]"
          @click="currentView = 'pack'"
        >
          <i class="fas fa-file-archive"></i>
          <span>打包</span>
        </button>

        <button
          :class="['nav-item', { active: currentView === 'rebuild' }]"
          @click="currentView = 'rebuild'"
        >
          <i class="fas fa-folder-open"></i>
          <span>解包</span>
        </button>

        <button
          :class="['nav-item', { active: currentView === 'settings' }]"
          @click="currentView = 'settings'"
        >
          <i class="fas fa-cog"></i>
          <span>设置</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="version">v1.1.0</div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 打包面板 -->
      <PackPanel v-if="currentView === 'pack'" />

      <!-- 解包面板 -->
      <RebuildPanel v-if="currentView === 'rebuild'" />

      <!-- 设置面板 -->
      <SettingsPanel v-if="currentView === 'settings'" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import PackPanel from './components/PackPanel.vue'
import RebuildPanel from './components/RebuildPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const currentView = ref('pack')
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* 侧边栏 */
.sidebar {
  width: 240px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.logo {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
}

.logo i {
  font-size: 28px;
  color: var(--accent-color);
}

.logo h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.nav-menu {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-bg);
  color: var(--accent-color);
}

.nav-item i {
  width: 20px;
  text-align: center;
}

.sidebar-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.version {
  font-size: 12px;
  color: var(--text-muted);
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}
</style>
