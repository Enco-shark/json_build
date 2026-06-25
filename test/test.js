const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { pack } = require('../src/packer');
const { rebuild, isSafeRelativePath } = require('../src/rebuilder');
const { IgnoreFilter } = require('../src/ignore');
const {
  isTextFile,
  formatSize,
  formatTime,
  TEXT_EXTENSIONS,
  BINARY_EXTENSIONS,
} = require('../src/utils');

const TEST_DIR = path.join(__dirname, 'test-project');
const JSON_PATH = path.join(__dirname, 'test-output.json');
const RESTORE_DIR = path.join(__dirname, 'test-restored');

let testCount = 0;
let passCount = 0;

function test(name, fn) {
  testCount++;
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passCount++;
      console.log(`  ✓ ${name}`);
    })
    .catch((err) => {
      console.log(`  ✗ ${name}`);
      console.log(`    ${err.message}`);
      throw err;
    });
}

// ============================================================
// 单元测试：IgnoreFilter
// ============================================================
async function testIgnoreFilter() {
  console.log('\n--- 测试 IgnoreFilter ---\n');

  await test('默认规则忽略 node_modules', () => {
    const filter = new IgnoreFilter({ projectRoot: TEST_DIR, loadGitignore: false });
    assert.strictEqual(filter.shouldIgnore('node_modules', true), true);
    assert.strictEqual(filter.shouldIgnore('node_modules/pkg/index.js'), true);
  });

  await test('默认规则忽略 .git 目录', () => {
    const filter = new IgnoreFilter({ projectRoot: TEST_DIR, loadGitignore: false });
    assert.strictEqual(filter.shouldIgnore('.git', true), true);
    assert.strictEqual(filter.shouldIgnore('.git/HEAD'), true);
  });

  await test('*.log 通配符匹配任意层级日志文件', () => {
    const filter = new IgnoreFilter({ projectRoot: TEST_DIR, loadGitignore: false });
    assert.strictEqual(filter.shouldIgnore('app.log'), true);
    assert.strictEqual(filter.shouldIgnore('logs/app.log'), true);
    assert.strictEqual(filter.shouldIgnore('src/utils/debug.log'), true);
  });

  await test('普通源代码文件不应被忽略', () => {
    const filter = new IgnoreFilter({ projectRoot: TEST_DIR, loadGitignore: false });
    assert.strictEqual(filter.shouldIgnore('src/index.js'), false);
    assert.strictEqual(filter.shouldIgnore('package.json'), false);
    assert.strictEqual(filter.shouldIgnore('README.md'), false);
  });

  await test('根目录不被忽略', () => {
    const filter = new IgnoreFilter({ projectRoot: TEST_DIR, loadGitignore: false });
    assert.strictEqual(filter.shouldIgnore('.', false), false);
    assert.strictEqual(filter.shouldIgnore('', false), false);
    assert.strictEqual(filter.shouldIgnore('/'), false);
  });

  await test('自定义规则（逗号分隔字符串）', () => {
    const filter = new IgnoreFilter({
      projectRoot: TEST_DIR,
      loadGitignore: false,
      customRules: 'foo,bar,*.baz',
    });
    assert.strictEqual(filter.shouldIgnore('foo', true), true);
    assert.strictEqual(filter.shouldIgnore('bar', true), true);
    assert.strictEqual(filter.shouldIgnore('a.baz'), true);
  });

  await test('取反规则 ! 取消忽略', () => {
    const filter = new IgnoreFilter({
      projectRoot: TEST_DIR,
      loadGitignore: false,
      customRules: ['*.log', '!important.log'],
    });
    assert.strictEqual(filter.shouldIgnore('app.log'), true);
    assert.strictEqual(filter.shouldIgnore('important.log'), false);
  });

  await test('目录规则（以 / 结尾）只匹配目录', () => {
    const filter = new IgnoreFilter({
      projectRoot: TEST_DIR,
      loadGitignore: false,
      customRules: ['build/'],
    });
    assert.strictEqual(filter.shouldIgnore('build', true), true);
    // build 作为文件不应被目录规则忽略
    assert.strictEqual(filter.shouldIgnore('build', false), false);
  });

  await test('前导斜杠锚定到根目录', () => {
    const filter = new IgnoreFilter({
      projectRoot: TEST_DIR,
      loadGitignore: false,
      customRules: ['/dist'],
    });
    assert.strictEqual(filter.shouldIgnore('dist', true), true);
    // 子目录中的 dist 不应被根锚定规则匹配
    assert.strictEqual(filter.shouldIgnore('src/dist', true), false);
  });

  await test('** 通配跨目录匹配', () => {
    const filter = new IgnoreFilter({
      projectRoot: TEST_DIR,
      loadGitignore: false,
      customRules: ['**/cache'],
    });
    assert.strictEqual(filter.shouldIgnore('cache', true), true);
    assert.strictEqual(filter.shouldIgnore('a/cache', true), true);
    assert.strictEqual(filter.shouldIgnore('a/b/cache', true), true);
  });
}

// ============================================================
// 单元测试：utils.js
// ============================================================
async function testUtils() {
  console.log('\n--- 测试 utils ---\n');

  await test('isTextFile 识别常见文本扩展名', () => {
    assert.strictEqual(isTextFile('foo.js'), true);
    assert.strictEqual(isTextFile('foo.ts'), true);
    assert.strictEqual(isTextFile('foo.json'), true);
    assert.strictEqual(isTextFile('foo.md'), true);
    assert.strictEqual(isTextFile('foo.css'), true);
  });

  await test('isTextFile 识别特殊文件名', () => {
    assert.strictEqual(isTextFile('Dockerfile'), true);
    assert.strictEqual(isTextFile('Makefile'), true);
    assert.strictEqual(isTextFile('.gitignore'), true);
    assert.strictEqual(isTextFile('README'), true);
  });

  await test('isTextFile 已知二进制扩展名返回 false', () => {
    assert.strictEqual(isTextFile('foo.png'), false);
    assert.strictEqual(isTextFile('foo.jpg'), false);
    assert.strictEqual(isTextFile('foo.zip'), false);
    assert.strictEqual(isTextFile('foo.exe'), false);
    assert.strictEqual(isTextFile('foo.pdf'), false);
  });

  await test('TEXT_EXTENSIONS 不包含完整文件名（已迁移到 TEXT_FILENAMES）', () => {
    // 这些是文件名而非扩展名，不应出现在扩展名集合
    assert.strictEqual(TEXT_EXTENSIONS.has('.gitignore'), false);
    assert.strictEqual(TEXT_EXTENSIONS.has('.env.*'), false);
    assert.strictEqual(TEXT_EXTENSIONS.has('.dockerfile'), false);
  });

  await test('BINARY_EXTENSIONS 包含常见二进制扩展名', () => {
    assert.strictEqual(BINARY_EXTENSIONS.has('.png'), true);
    assert.strictEqual(BINARY_EXTENSIONS.has('.exe'), true);
    assert.strictEqual(BINARY_EXTENSIONS.has('.zip'), true);
  });

  await test('formatSize 正常格式化', () => {
    assert.strictEqual(formatSize(0), '0 B');
    assert.strictEqual(formatSize(1024), '1 KB');
    assert.strictEqual(formatSize(1048576), '1 MB');
    assert.strictEqual(formatSize(1073741824), '1 GB');
  });

  await test('formatSize 处理非法输入', () => {
    assert.strictEqual(formatSize(-1), '0 B');
    assert.strictEqual(formatSize(NaN), '0 B');
    assert.strictEqual(formatSize(undefined), '0 B');
    assert.strictEqual(formatSize('abc'), '0 B');
  });

  await test('formatTime 毫秒和秒', () => {
    assert.strictEqual(formatTime(500), '500ms');
    assert.strictEqual(formatTime(1500), '1s');
    assert.strictEqual(formatTime(65000), '1m 5s');
  });

  await test('formatTime 处理非法输入', () => {
    assert.strictEqual(formatTime(-1), '0ms');
    assert.strictEqual(formatTime(NaN), '0ms');
  });
}

// ============================================================
// 单元测试：路径安全校验
// ============================================================
async function testPathSafety() {
  console.log('\n--- 测试路径安全校验 ---\n');

  await test('正常相对路径通过', () => {
    assert.strictEqual(isSafeRelativePath('src/index.js'), true);
    assert.strictEqual(isSafeRelativePath('a/b/c.txt'), true);
  });

  await test('.. 段被拒绝', () => {
    assert.strictEqual(isSafeRelativePath('../etc/passwd'), false);
    assert.strictEqual(isSafeRelativePath('foo/../../bar'), false);
    assert.strictEqual(isSafeRelativePath('..'), false);
  });

  await test('绝对路径被拒绝', () => {
    assert.strictEqual(isSafeRelativePath('/etc/passwd'), false);
    assert.strictEqual(isSafeRelativePath('C:/Windows/system32'), false);
    assert.strictEqual(isSafeRelativePath('c:\\windows'), false);
  });

  await test('空路径被拒绝', () => {
    assert.strictEqual(isSafeRelativePath(''), false);
    assert.strictEqual(isSafeRelativePath(null), false);
    assert.strictEqual(isSafeRelativePath(undefined), false);
  });

  await test('反斜杠路径正常处理', () => {
    // 内部会先转换 \\ 为 /
    assert.strictEqual(isSafeRelativePath('src\\index.js'), true);
    assert.strictEqual(isSafeRelativePath('..\\evil'), false);
  });
}

// ============================================================
// 集成测试：打包 → 解包
// ============================================================

// 创建测试项目
async function createTestProject() {
  console.log('创建测试项目...\n');

  // 清理旧的测试文件
  if (fs.existsSync(TEST_DIR)) {
    await fs.promises.rm(TEST_DIR, { recursive: true });
  }
  if (fs.existsSync(JSON_PATH)) {
    await fs.promises.unlink(JSON_PATH);
  }
  if (fs.existsSync(RESTORE_DIR)) {
    await fs.promises.rm(RESTORE_DIR, { recursive: true });
  }

  // 创建目录结构
  const dirs = [
    'src',
    'src/utils',
    'src/components',
    'docs',
    'config',
    'test',
  ];

  for (const dir of dirs) {
    await fs.promises.mkdir(path.join(TEST_DIR, dir), { recursive: true });
  }

  // 创建测试文件
  const files = {
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      description: 'Test project for json-build',
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        test: 'node test/test.js'
      }
    }, null, 2),

    'README.md': `# Test Project

This is a test project for json-build tool.

## Features
- Feature 1
- Feature 2
`,

    '.gitignore': `node_modules
dist
*.log
.DS_Store
`,

    'src/index.js': `const utils = require('./utils/helper');

function main() {
  console.log('Hello, World!');
  console.log(utils.add(1, 2));
}

main();
`,

    'src/utils/helper.js': `function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}

module.exports = { add, multiply };
`,

    'src/components/App.js': `class App {
  constructor() {
    this.name = 'TestApp';
  }

  render() {
    return \`<div>\${this.name}</div>\`;
  }
}

module.exports = App;
`,

    'docs/README.md': `# Documentation

## Getting Started
1. Install dependencies
2. Run the app
`,

    'config/default.json': JSON.stringify({
      port: 3000,
      host: 'localhost',
      debug: true
    }, null, 2),

    'test/test.js': `const assert = require('assert');
const { add } = require('../src/utils/helper');

assert.strictEqual(add(1, 2), 3);
console.log('All tests passed!');
`,
  };

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(TEST_DIR, filePath);
    await fs.promises.writeFile(fullPath, content, 'utf-8');
  }

  // 创建一个二进制文件（模拟）
  const binaryContent = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  await fs.promises.writeFile(path.join(TEST_DIR, 'logo.png'), binaryContent);

  console.log('测试项目创建完成\n');
}

// 测试打包
async function testPack() {
  console.log('测试打包功能...\n');

  const progressCalls = [];
  await pack(TEST_DIR, {
    output: JSON_PATH,
    maxSize: 10,
    onProgress: (info) => progressCalls.push(info),
  });

  // 验证JSON文件
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error('JSON文件未创建');
  }

  const content = JSON.parse(await fs.promises.readFile(JSON_PATH, 'utf-8'));

  console.log('\n验证打包结果:');
  console.log(`  版本: ${content.version}`);
  console.log(`  文件数: ${content.files.length}`);
  console.log(`  源目录: ${content.source}`);

  // 检查文件是否都包含
  const expectedFiles = [
    'package.json',
    'README.md',
    '.gitignore',
    'src/index.js',
    'src/utils/helper.js',
    'src/components/App.js',
    'docs/README.md',
    'config/default.json',
    'test/test.js',
    'logo.png',
  ];

  for (const file of expectedFiles) {
    const found = content.files.find(f => f.path === file);
    if (!found) {
      throw new Error(`缺少文件: ${file}`);
    }
    console.log(`  ✓ ${file}`);
  }

  // 验证二进制文件使用 base64 编码
  const logo = content.files.find(f => f.path === 'logo.png');
  assert.strictEqual(logo.encoding, 'base64', 'logo.png 应使用 base64 编码');

  // 验证文本文件使用 utf-8 编码
  const pkg = content.files.find(f => f.path === 'package.json');
  assert.strictEqual(pkg.encoding, 'utf-8', 'package.json 应使用 utf-8 编码');

  // 验证进度回调被调用
  assert.ok(progressCalls.length > 0, '进度回调应被调用');
  assert.strictEqual(progressCalls[progressCalls.length - 1].current, progressCalls[progressCalls.length - 1].total, '最后一次进度应为完成状态');

  console.log('\n打包测试通过!\n');
}

// 测试解包
async function testRebuild() {
  console.log('测试解包功能...\n');

  const progressCalls = [];
  await rebuild(JSON_PATH, {
    dest: RESTORE_DIR,
    timestamps: true,
    onProgress: (info) => progressCalls.push(info),
  });

  // 验证重建的文件
  console.log('\n验证重建结果:');

  const expectedFiles = [
    'package.json',
    'README.md',
    '.gitignore',
    'src/index.js',
    'src/utils/helper.js',
    'src/components/App.js',
    'docs/README.md',
    'config/default.json',
    'test/test.js',
    'logo.png',
  ];

  for (const file of expectedFiles) {
    const fullPath = path.join(RESTORE_DIR, 'test-project', file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`文件未恢复: ${file}`);
    }

    // 比较内容
    const originalPath = path.join(TEST_DIR, file);
    const originalContent = await fs.promises.readFile(originalPath);
    const restoredContent = await fs.promises.readFile(fullPath);

    if (!originalContent.equals(restoredContent)) {
      throw new Error(`文件内容不匹配: ${file}`);
    }

    console.log(`  ✓ ${file}`);
  }

  // 验证进度回调被调用
  assert.ok(progressCalls.length > 0, '进度回调应被调用');

  console.log('\n解包测试通过!\n');
}

// 测试路径遍历防护
async function testPathTraversalProtection() {
  console.log('测试路径遍历防护...\n');

  // 构造一个恶意 JSON 文件
  const maliciousJson = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    source: 'evil',
    fileCount: 1,
    totalSize: 5,
    files: [
      {
        path: '../../../etc/evil.txt',
        content: 'pwned',
        encoding: 'utf-8',
        size: 5,
      },
      {
        path: 'C:/Windows/evil.txt',
        content: 'pwned',
        encoding: 'utf-8',
        size: 5,
      },
      {
        path: '/etc/evil.txt',
        content: 'pwned',
        encoding: 'utf-8',
        size: 5,
      },
    ],
  };

  const maliciousPath = path.join(__dirname, 'test-malicious.json');
  await fs.promises.writeFile(maliciousPath, JSON.stringify(maliciousJson));

  const trapDir = path.join(__dirname, 'test-trap');
  if (fs.existsSync(trapDir)) {
    await fs.promises.rm(trapDir, { recursive: true });
  }

  try {
    await rebuild(maliciousPath, { dest: trapDir, timestamps: false });
    // 解包完成后，所有恶意路径都不应跳出 trapDir/evil
    const evilRoot = path.join(trapDir, 'evil');
    // 校验：trapDir 之外不应有任何 evil.txt
    const outsideCheck = path.resolve(__dirname, '../../../etc/evil.txt');
    assert.strictEqual(fs.existsSync(outsideCheck), false, '路径遍历导致外部文件被写入！');

    // trapDir 内部除了 evil 子目录外不应有其他文件
    const entries = await fs.promises.readdir(trapDir);
    assert.ok(entries.includes('evil'), '应创建 source 子目录');
  } finally {
    if (fs.existsSync(maliciousPath)) await fs.promises.unlink(maliciousPath);
    if (fs.existsSync(trapDir)) await fs.promises.rm(trapDir, { recursive: true });
  }

  console.log('  ✓ 路径遍历被拦截\n');
}

// 清理测试文件
async function cleanup() {
  console.log('清理测试文件...');

  try {
    if (fs.existsSync(TEST_DIR)) {
      await fs.promises.rm(TEST_DIR, { recursive: true });
    }
    if (fs.existsSync(JSON_PATH)) {
      await fs.promises.unlink(JSON_PATH);
    }
    if (fs.existsSync(RESTORE_DIR)) {
      await fs.promises.rm(RESTORE_DIR, { recursive: true });
    }
    console.log('清理完成\n');
  } catch (err) {
    console.error('清理失败:', err.message);
  }
}

// 运行测试
async function main() {
  console.log('=== json-build 测试 ===\n');

  try {
    // 单元测试（不依赖文件系统）
    await testIgnoreFilter();
    await testUtils();
    await testPathSafety();

    // 集成测试
    await createTestProject();
    await testPack();
    await testRebuild();
    await testPathTraversalProtection();

    console.log(`\n=== 所有测试通过! (${passCount}/${testCount}) ===\n`);
  } catch (err) {
    console.error('\n测试失败:', err.message);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

main();
