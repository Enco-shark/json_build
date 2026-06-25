const fs = require('fs');
const path = require('path');
const { IgnoreFilter } = require('./ignore');
const { ProgressBar, Spinner } = require('./progress');
const {
  isTextFile,
  formatSize,
  formatTime,
  readFileAsStream,
  getFileInfo,
} = require('./utils');

async function pack(targetPath, options = {}) {
  const startTime = Date.now();

  // 验证目标路径
  if (!fs.existsSync(targetPath)) {
    throw new Error(`目标路径不存在: ${targetPath}`);
  }

  const stat = await fs.promises.stat(targetPath);
  if (!stat.isDirectory()) {
    throw new Error(`目标路径不是目录: ${targetPath}`);
  }

  const outputPath = options.output || path.join(process.cwd(), 'structure.json');
  const maxSize = (options.maxSize || 50) * 1024 * 1024; // 转换为字节

  // 初始化忽略过滤器
  const ignoreFilter = new IgnoreFilter({
    projectRoot: targetPath,
    customRules: options.ignore ? options.ignore.split(',') : [],
  });

  console.log('\n  json-build pack\n');
  console.log(`  源目录: ${targetPath}`);
  console.log(`  输出文件: ${outputPath}`);
  console.log(`  最大文件: ${formatSize(maxSize)}`);
  console.log('');

  // 第一阶段：扫描文件
  const spinner = new Spinner('正在扫描文件...');
  spinner.start();

  const files = [];
  const errors = [];
  let totalSize = 0;

  await scanDirectory(targetPath, targetPath, ignoreFilter, files, errors, maxSize, options.onScanProgress);

  spinner.succeed(`扫描完成，发现 ${files.length} 个文件`);

  if (errors.length > 0) {
    console.log(`\n  ⚠ 跳过 ${errors.length} 个超大文件`);
  }

  if (files.length === 0) {
    console.log('\n  没有找到需要打包的文件');
    return;
  }

  // 计算总大小
  for (const file of files) {
    totalSize += file.size;
  }

  console.log(`  总大小: ${formatSize(totalSize)}\n`);

  // 第二阶段：读取文件内容
  const progressBar = new ProgressBar({
    total: files.length,
    label: '打包进度',
  });

  const structure = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    source: path.basename(targetPath),
    rootPath: targetPath,
    fileCount: files.length,
    totalSize: totalSize,
    files: [],
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    progressBar.increment(1, path.relative(targetPath, file.path));

    // 通知外部进度（用于 GUI IPC）
    if (options.onProgress) {
      options.onProgress({
        current: i + 1,
        total: files.length,
        file: file.relativePath,
      });
    }

    try {
      const content = await processFile(file);
      structure.files.push(content);
    } catch (err) {
      errors.push({
        file: file.relativePath,
        error: err.message,
      });
    }
  }

  progressBar.done('文件读取完成');

  // 第三阶段：写入JSON文件
  const writeSpinner = new Spinner('正在写入JSON文件...');
  writeSpinner.start();

  try {
    const jsonContent = JSON.stringify(structure, null, 2);
    await fs.promises.writeFile(outputPath, jsonContent, 'utf-8');

    const outputStat = await fs.promises.stat(outputPath);
    writeSpinner.succeed(`写入完成: ${formatSize(outputStat.size)}`);
  } catch (err) {
    writeSpinner.fail('写入失败');
    throw err;
  }

  // 输出统计
  const elapsed = Date.now() - startTime;
  console.log('\n  打包统计:');
  console.log(`    文件数量: ${structure.files.length}`);
  console.log(`    原始大小: ${formatSize(totalSize)}`);

  const outputSize = (await fs.promises.stat(outputPath)).size;
  console.log(`    JSON大小: ${formatSize(outputSize)}`);
  console.log(`    压缩率:   ${((1 - outputSize / totalSize) * 100).toFixed(1)}%`);
  console.log(`    耗时:     ${formatTime(elapsed)}`);

  if (errors.length > 0) {
    console.log(`\n  ⚠ ${errors.length} 个文件处理失败:`);
    errors.slice(0, 5).forEach(e => {
      console.log(`    - ${e.file}: ${e.error}`);
    });
    if (errors.length > 5) {
      console.log(`    ... 还有 ${errors.length - 5} 个`);
    }
  }

  console.log('\n  ✓ 打包完成!\n');
}

// 递归扫描目录
async function scanDirectory(basePath, currentPath, ignoreFilter, files, errors, maxSize) {
  let entries;

  try {
    entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
  } catch (err) {
    errors.push({
      path: currentPath,
      error: `无法读取目录: ${err.message}`,
    });
    return;
  }

  // 排序以确保一致的顺序
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);

    // 检查是否应该忽略
    if (ignoreFilter.shouldIgnore(relativePath, entry.isDirectory())) {
      continue;
    }

    if (entry.isDirectory()) {
      // 递归扫描子目录
      await scanDirectory(basePath, fullPath, ignoreFilter, files, errors, maxSize);
    } else if (entry.isFile()) {
      try {
        const stat = await fs.promises.stat(fullPath);

        // 检查文件大小（maxSize 为 0 或未设置时跳过过滤）
        if (maxSize && stat.size > maxSize) {
          errors.push({
            path: fullPath,
            error: `文件过大: ${formatSize(stat.size)}`,
          });
          continue;
        }

        files.push({
          path: fullPath,
          relativePath: relativePath,
          size: stat.size,
          mtime: stat.mtimeMs,
          atime: stat.atimeMs,
          ctime: stat.ctimeMs,
          mode: stat.mode,
        });
      } catch (err) {
        errors.push({
          path: fullPath,
          error: `无法获取文件信息: ${err.message}`,
        });
      }
    }
  }
}

// 处理单个文件
async function processFile(file) {
  const isText = isTextFile(file.path);
  let content;
  let encoding;

  if (isText) {
    // 文本文件直接读取
    content = await fs.promises.readFile(file.path, 'utf-8');
    encoding = 'utf-8';
  } else {
    // 二进制文件使用Base64编码
    const buffer = await readFileAsStream(file.path);
    content = buffer.toString('base64');
    encoding = 'base64';
  }

  return {
    path: file.relativePath.replace(/\\/g, '/'), // 统一使用正斜杠
    content: content,
    encoding: encoding,
    size: file.size,
    timestamps: {
      mtime: file.mtime,
      atime: file.atime,
      ctime: file.ctime,
    },
    mode: file.mode,
  };
}

module.exports = { pack, scanDirectory };
