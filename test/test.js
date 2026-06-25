const fs = require('fs');
const path = require('path');
const { pack } = require('../src/packer');
const { rebuild } = require('../src/rebuilder');

const TEST_DIR = path.join(__dirname, 'test-project');
const JSON_PATH = path.join(__dirname, 'test-output.json');
const RESTORE_DIR = path.join(__dirname, 'test-restored');

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

  await pack(TEST_DIR, {
    output: JSON_PATH,
    maxSize: 10,
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

  console.log('\n打包测试通过!\n');
}

// 测试解包
async function testRebuild() {
  console.log('测试解包功能...\n');

  await rebuild(JSON_PATH, {
    dest: RESTORE_DIR,
    timestamps: true,
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

  console.log('\n解包测试通过!\n');
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
    await createTestProject();
    await testPack();
    await testRebuild();
    console.log('=== 所有测试通过! ===\n');
  } catch (err) {
    console.error('\n测试失败:', err.message);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

main();
