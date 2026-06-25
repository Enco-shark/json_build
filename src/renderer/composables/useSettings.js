import { reactive, watch } from 'vue'

const STORAGE_KEY = 'json-build-settings'

const defaultSettings = {
  maxSize: 50,
  restoreTimestamps: true,
  autoScan: false,
  ignoreRules: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.cache',
    '*.log',
  ],
  theme: 'dark',
}

// 应用主题到 DOM
function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    root.setAttribute('data-theme', theme)
  }
}

// 全局单例，所有组件共享同一份设置
let settings = null

export function useSettings() {
  if (!settings) {
    // 首次初始化：从 localStorage 加载
    settings = reactive({ ...defaultSettings })

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        Object.assign(settings, parsed)
      } catch (e) {
        // 忽略解析错误
      }
    }

    // 自动保存到 localStorage（深度监听）
    watch(
      settings,
      (val) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
        applyTheme(val.theme)
      },
      { deep: true }
    )

    // 初始化主题
    applyTheme(settings.theme)

    // 监听系统主题变化（auto 模式下）
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (settings.theme === 'auto') {
        applyTheme('auto')
      }
    })
  }

  return {
    settings,
    defaultSettings,
    resetSettings() {
      Object.assign(settings, defaultSettings)
    },
  }
}
