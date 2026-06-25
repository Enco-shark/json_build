const fs = require('fs');
const path = require('path');

// 默认忽略规则
const DEFAULT_IGNORES = [
  // 版本控制
  '.git',
  '.svn',
  '.hg',
  '.bzr',

  // 依赖目录
  'node_modules',
  'bower_components',
  'vendor',
  'packages',

  // 构建输出
  'dist',
  'build',
  'out',
  'output',
  'target',
  'release',
  'debug',
  'bin',
  'obj',

  // 缓存
  '.cache',
  '.temp',
  '.tmp',
  'tmp',
  'temp',
  '.sass-cache',
  '.eslintcache',

  // IDE和编辑器
  '.idea',
  '.vscode',
  '.vs',
  '.project',
  '.settings',
  '.classpath',
  '*.swp',
  '*.swo',
  '*~',
  '.DS_Store',
  'Thumbs.db',

  // 日志
  '*.log',
  'logs',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',

  // 环境文件
  '.env',
  '.env.local',
  '.env.*.local',

  // 编译文件
  '*.o',
  '*.obj',
  '*.exe',
  '*.dll',
  '*.so',
  '*.dylib',
  '*.pyc',
  '*.pyo',
  '__pycache__',

  // 打包文件
  '*.tar',
  '*.tar.gz',
  '*.zip',
  '*.rar',
  '*.7z',
  '*.tgz',

  // 锁文件 (可选)
  // 'package-lock.json',
  // 'yarn.lock',
  // 'pnpm-lock.yaml',
];

class IgnoreFilter {
  constructor(options = {}) {
    this.rules = [];
    this.projectRoot = options.projectRoot || process.cwd();

    // 添加默认规则
    this.addRules(DEFAULT_IGNORES);

    // 读取 .gitignore 文件
    if (options.loadGitignore !== false) {
      this.loadGitignore();
    }

    // 添加自定义规则
    if (options.customRules) {
      this.addRules(options.customRules);
    }
  }

  // 从 .gitignore 加载规则
  loadGitignore() {
    const gitignorePath = path.join(this.projectRoot, '.gitignore');

    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      this.addRules(lines);
    }
  }

  // 添加规则
  addRules(rules) {
    if (typeof rules === 'string') {
      rules = rules.split(',').map(r => r.trim()).filter(Boolean);
    }

    for (const rule of rules) {
      const parsed = this.parseRule(rule);
      if (parsed) {
        this.rules.push(parsed);
      }
    }
  }

  // 解析单条规则
  parseRule(rule) {
    if (!rule || rule.startsWith('#')) {
      return null;
    }

    let negated = false;
    let pattern = rule;

    // 处理取反规则
    if (pattern.startsWith('!')) {
      negated = true;
      pattern = pattern.slice(1);
    }

    // 处理目录规则
    const dirOnly = pattern.endsWith('/');
    if (dirOnly) {
      pattern = pattern.slice(0, -1);
    }

    // 转换为正则表达式
    const regex = this.patternToRegex(pattern);

    return {
      original: rule,
      negated,
      dirOnly,
      regex,
      pattern,
    };
  }

  // 将 glob 模式转换为正则表达式
  patternToRegex(pattern) {
    let regex = '';
    let i = 0;

    // 是否匹配路径开头
    const anchored = pattern.includes('/');

    while (i < pattern.length) {
      const char = pattern[i];

      if (char === '*') {
        if (pattern[i + 1] === '*') {
          // ** 匹配任意路径
          regex += '.*';
          i += 2;
          if (pattern[i] === '/') {
            i++; // 跳过 **/
          }
        } else {
          // * 匹配除路径分隔符外的任意字符
          regex += '[^/]*';
          i++;
        }
      } else if (char === '?') {
        // ? 匹配单个字符
        regex += '[^/]';
        i++;
      } else if (char === '[') {
        // 字符类
        const end = pattern.indexOf(']', i);
        if (end !== -1) {
          regex += pattern.slice(i, end + 1);
          i = end + 1;
        } else {
          regex += '\\[';
          i++;
        }
      } else if (char === '{') {
        // 花括号展开
        const end = pattern.indexOf('}', i);
        if (end !== -1) {
          const options = pattern.slice(i + 1, end).split(',');
          regex += '(' + options.map(o => this.escapeRegex(o)).join('|') + ')';
          i = end + 1;
        } else {
          regex += '\\{';
          i++;
        }
      } else {
        // 普通字符，需要转义
        regex += this.escapeRegex(char);
        i++;
      }
    }

    // 构建完整的正则表达式
    if (anchored) {
      // 包含 / 的模式匹配完整路径
      return new RegExp(`(^|/)${regex}(/|$)`, 'i');
    } else {
      // 不包含 / 的模式匹配文件名
      return new RegExp(`(^|/)${regex}$`, 'i');
    }
  }

  // 转义正则表达式特殊字符
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 检查路径是否应该被忽略
  shouldIgnore(relativePath, isDirectory = false) {
    // 永远不忽略根目录
    if (!relativePath || relativePath === '.' || relativePath === '/') {
      return false;
    }

    // 规范化路径
    const normalizedPath = relativePath.replace(/\\/g, '/');

    let ignored = false;

    for (const rule of this.rules) {
      // 如果是目录规则但当前不是目录，跳过
      if (rule.dirOnly && !isDirectory) {
        continue;
      }

      // 检查是否匹配
      if (rule.regex.test(normalizedPath)) {
        if (rule.negated) {
          ignored = false;
        } else {
          ignored = true;
        }
      }
    }

    return ignored;
  }

  // 获取所有规则
  getRules() {
    return this.rules.map(r => r.original);
  }
}

module.exports = { IgnoreFilter, DEFAULT_IGNORES };
