# json-build

一个 Node.js 命令行/GUI 工具，用于将项目文件夹打包成 JSON 文件，以及从 JSON 文件还原项目结构。

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)
[![GitHub](https://img.shields.io/badge/GitHub-Enco--shark-blue?logo=github)](https://github.com/Enco-shark)

## 功能特性

### 核心功能

- **打包（pack）**：将项目文件夹中的所有文件合并成一个 JSON 文件
  - 递归遍历文件夹，读取所有文件内容
  - 记录文件的相对路径、内容、大小、修改时间等信息
  - 自动识别文本文件和二进制文件（扩展名 + 魔数双重检测，二进制使用 Base64 编码）
  - 支持 `.gitignore` 风格的忽略规则（兼容 gitignore 语义：锚定、`**` 跨目录、取反 `!`）
  - 流式写入 JSON，避免大项目内存翻倍
  - 显示打包进度条 + 真实进度回调

- **解包（rebuild）**：从 JSON 文件还原整个项目结构
  - 根据记录的路径和内容重建所有文件和文件夹
  - 恢复文件时间戳和权限（可选）
  - 显示重建进度条 + 真实进度回调
  - **路径遍历防护**：自动拒绝包含 `..`、绝对路径、Windows 盘符的恶意路径

### 界面版本

- **CLI 版本**：命令行工具，适合脚本和自动化
- **GUI 版本**：图形界面，基于 Electron + Vue 3，操作更直观
  - 真实进度推送（通过 IPC 从主进程到渲染进程）
  - 沙箱隔离 + contextIsolation 安全基线
  - 自动扫描、主题切换、文件预览

## 安装

### 从源码安装

```bash
git clone https://github.com/Enco-shark/json-build.git
cd json-build

# 安装依赖
npm install

# CLI 全局安装（可选）
npm link
```

## 使用方法

### GUI 版本（推荐）

```bash
# 开发模式运行
npm run electron:dev

# 构建可执行文件
npm run electron:build
```

GUI 功能：
- 📁 可视化选择目录和文件
- 📊 实时预览文件列表和大小
- ⚙️ 图形化配置选项
- 📈 进度条显示
- 🎨 支持深色/浅色主题

### CLI 版本

#### 打包项目

```bash
# 基本用法
json-build pack <目录路径>

# 指定输出文件
json-build pack ./my-project -o backup.json

# 自定义忽略规则
json-build pack ./my-project --ignore "temp,cache,*.log"

# 设置最大文件大小限制（MB）
json-build pack ./my-project --max-size 100
```

#### 解包项目

```bash
# 基本用法
json-build rebuild <json路径>

# 指定目标目录
json-build rebuild structure.json -d ./restored-project

# 不恢复时间戳
json-build rebuild structure.json --no-timestamps
```

### 命令行选项

#### pack 命令

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-o, --output <路径>` | 指定输出 JSON 文件路径 | `./structure.json` |
| `--ignore <规则>` | 自定义忽略规则（逗号分隔） | - |
| `--max-size <MB>` | 最大文件大小限制 | `50` |

#### rebuild 命令

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-d, --dest <路径>` | 指定重建目标目录 | 当前目录 |
| `--no-timestamps` | 不恢复文件时间戳 | - |

#### 通用选项

| 选项 | 说明 |
|------|------|
| `-h, --help` | 显示帮助信息 |
| `-v, --version` | 显示版本号 |

## 示例

### 打包项目

```bash
$ json-build pack ./my-project

  json-build pack

  源目录: /home/user/my-project
  输出文件: /home/user/structure.json
  最大文件: 50 MB

  ✓ 扫描完成，发现 42 个文件

  打包进度 [████████████████████████████████████████] 100% | 42/42 | 00:02 | ETA: 00:00

  打包统计:
    文件数量: 42
    原始大小: 1.25 MB
    JSON大小: 856.32 KB
    压缩率:   33.5%
    耗时:     2s

  ✓ 打包完成!
```

### 解包项目

```bash
$ json-build rebuild structure.json -d ./restored

  json-build rebuild

  JSON文件: /home/user/structure.json
  目标目录: /home/user/restored/my-project
  文件数量: 42
  原始大小: 1.25 MB
  创建时间: 2024-01-15T10:30:00.000Z

  ✓ 读取完成: 42 个文件

  重建进度 [████████████████████████████████████████] 100% | 42/42 | 00:01 | ETA: 00:00

  重建统计:
    成功恢复: 42 个文件
    总大小:   1.25 MB
    耗时:     1s

  ✓ 重建完成!
```

## JSON 结构格式

生成的 `structure.json` 文件格式如下：

```json
{
  "version": "1.0.0",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "source": "my-project",
  "rootPath": "/home/user/my-project",
  "fileCount": 42,
  "totalSize": 1310720,
  "files": [
    {
      "path": "package.json",
      "content": "{\n  \"name\": \"my-project\",\n  ...\n}",
      "encoding": "utf-8",
      "size": 256,
      "timestamps": {
        "mtime": 1705312200000,
        "atime": 1705312200000,
        "ctime": 1705312200000
      },
      "mode": 33188
    },
    {
      "path": "logo.png",
      "content": "iVBORw0KGgoAAAANSUhEUgAA...",
      "encoding": "base64",
      "size": 1024,
      "timestamps": {
        "mtime": 1705312200000,
        "atime": 1705312200000,
        "ctime": 1705312200000
      },
      "mode": 33188
    }
  ]
}
```

## 默认忽略规则

以下文件和目录会被默认忽略：

- 版本控制：`.git`, `.svn`, `.hg`
- 依赖目录：`node_modules`, `bower_components`, `vendor`
- 构建输出：`dist`, `build`, `out`, `target`
- 缓存文件：`.cache`, `.temp`, `.tmp`
- IDE 文件：`.idea`, `.vscode`, `.vs`
- 日志文件：`*.log`
- 环境文件：`.env`, `.env.local`
- 编译文件：`*.o`, `*.exe`, `*.dll`, `*.pyc`
- 打包文件：`*.tar`, `*.zip`, `*.rar`

此外，工具会自动读取项目根目录的 `.gitignore` 文件中的规则。

## 作为模块使用

```javascript
const { pack, rebuild, IgnoreFilter, isTextFile, formatSize } = require('json-build');

// 打包（带进度回调）
await pack('./my-project', {
  output: 'backup.json',
  ignore: 'temp,cache',
  maxSize: 100, // MB
  onProgress: (info) => {
    console.log(`${info.current}/${info.total} ${info.file}`);
  },
  onScanProgress: (info) => {
    console.log(`已扫描 ${info.scanned} 个文件，当前: ${info.current}`);
  },
});

// 解包（带进度回调，自动校验路径安全）
await rebuild('backup.json', {
  dest: './restored',
  timestamps: true,
  onProgress: (info) => {
    console.log(`${info.current}/${info.total} ${info.file}`);
  },
});
```

> 安全说明：`rebuild` 会自动拒绝包含 `..` 段、绝对路径或 Windows 盘符的相对路径，防止路径遍历攻击。

## 技术栈

### CLI 版本
- Node.js 原生 `fs` 和 `path` 模块
- 无外部依赖

### GUI 版本
- **Electron** - 桌面应用框架
- **Vue 3** - 前端框架
- **Vite** - 构建工具
- **FontAwesome** - 图标库

## 项目结构

```
json_build/
├── bin/
│   └── cli.js              # CLI 入口
├── electron/
│   ├── main.js             # Electron 主进程
│   └── preload.js          # 预加载脚本
├── src/
│   ├── renderer/           # Vue 3 前端
│   │   ├── components/     # Vue 组件
│   │   ├── assets/         # 静态资源
│   │   ├── App.vue         # 主应用组件
│   │   ├── main.js         # Vue 入口
│   │   └── index.html      # HTML 模板
│   ├── packer.js           # 打包逻辑
│   ├── rebuilder.js        # 解包逻辑
│   ├── ignore.js           # 忽略规则
│   ├── progress.js         # 进度条
│   └── utils.js            # 工具函数
├── test/
│   └── test.js             # 测试文件
├── package.json
├── vite.config.js
└── README.md
```

## 开发

```bash
# 安装依赖
npm install

# 运行 CLI 测试
npm test

# 启动 GUI 开发模式
npm run electron:dev

# 构建 GUI
npm run electron:build

# 构建前端
npm run build
```

## 系统要求

- Node.js >= 16.0.0
- npm >= 7.0.0

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.2.0

- **安全**：路径遍历防护（文件路径 + `source` 字段双重校验）
- **安全**：移除 JSON 中的 `rootPath` 字段，避免泄露本地绝对路径
- **安全**：Electron 启用沙箱隔离
- **功能**：真实进度回调（packer `onProgress`/`onScanProgress`、rebuilder `onProgress`）
- **功能**：`IgnoreFilter.create()` 异步工厂方法，避免主进程同步 I/O 阻塞
- **功能**：`maxSize: 0` 表示不限大小
- **功能**：统一 rebuild dest 行为（总是创建 source 子目录）
- **性能**：流式 JSON 写入 + 背压处理，避免大项目内存翻倍
- **性能**：`read-json-info` IPC 分页返回，避免载荷冗余
- **健壮性**：二进制识别增加魔数检测（PNG/JPEG/ZIP/EXE/ELF 等 13 种）
- **健壮性**：CLI 参数解析边界校验
- **健壮性**：压缩率除零保护、formatSize 非法输入保护
- **测试**：从 1 个端到端测试扩展为 25 个用例（含路径遍历防护测试）
- **其他**：Font Awesome 本地化、macOS 应用菜单、autoScan 自动扫描

### v1.1.0

- 新增 GUI 图形界面（Electron + Vue 3）
- 支持主题切换（深色/浅色）
- 文件预览功能
- 设置保存功能

### v1.0.0

- 初始版本
- 支持打包和解包功能
- 支持 `.gitignore` 规则
- 支持进度条显示
- 支持时间戳恢复
