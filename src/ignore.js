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
    this.options = options;

    // 添加默认规则（同步，纯内存操作）
    this.addRules(DEFAULT_IGNORES);

    // 添加自定义规则（同步，无需文件 I/O）
    // 注意：构造函数不会加载 .gitignore，需使用静态 create() 方法
    if (options.customRules) {
      this.addRules(options.customRules);
    }
  }

  // 异步工厂方法：避免在主进程中使用同步 fs 操作阻塞 UI
  static async create(options = {}) {
    const filter = new IgnoreFilter(options);

    // 异步读取 .gitignore
    if (options.loadGitignore !== false) {
      await filter.loadGitignore();
    }

    return filter;
  }

  // 从 .gitignore 异步加载规则
  async loadGitignore() {
    const gitignorePath = path.join(this.projectRoot, '.gitignore');

    try {
      const content = await fs.promises.readFile(gitignorePath, 'utf-8');
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      this.addRules(lines);
    } catch (_e) {
      // .gitignore 不存在或不可读，忽略
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

    // 处理前导斜杠（锚定到根目录）
    let anchored = false;
    if (pattern.startsWith('/')) {
      anchored = true;
      pattern = pattern.slice(1);
    } else if (pattern.includes('/')) {
      // 包含斜杠但不是开头：gitignore 规范视为锚定到根
      anchored = true;
    }

    // 转换为正则表达式
    const regex = this.patternToRegex(pattern, anchored);

    return {
      original: rule,
      negated,
      dirOnly,
      regex,
      pattern,
    };
  }

  // 将 glob 模式转换为正则表达式
  // anchored=true 表示只匹配从根目录开始的路径
  // anchored=false 表示匹配任意层级
  patternToRegex(pattern, anchored) {
    let regex = '';
    let i = 0;
    // 是否已经处理过开头的 **/
    let leadingDoubleStar = false;

    while (i < pattern.length) {
      const char = pattern[i];

      if (char === '*') {
        if (pattern[i + 1] === '*') {
          // ** 匹配任意路径（包括跨目录）
          i += 2;
          if (pattern[i] === '/') {
            // **/ 表示匹配任意层级目录前缀
            i++;
            // 如果是开头，标记为可匹配任意层级
            if (regex === '') {
              leadingDoubleStar = true;
              regex += '(?:.*/)?';
            } else {
              regex += '(?:.*/)?';
            }
          } else {
            // ** 在末尾或中间，匹配任意字符（含 /）
            regex += '.*';
          }
        } else {
          // * 匹配除路径分隔符外的任意字符
          regex += '[^/]*';
          i++;
        }
      } else if (char === '?') {
        // ? 匹配单个字符（不含 /）
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
    if (anchored && !leadingDoubleStar) {
      // 锚定到根：从开头匹配
      return new RegExp(`^${regex}(?:/|$)`, '');
    } else {
      // 非锚定：在任意层级匹配（路径任意段）
      return new RegExp(`(^|/)${regex}(?:/|$)`, '');
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
