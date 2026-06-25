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
  // maxSize: undefined → 默认 50MB；0 → 不限制；正数 → 对应 MB
  const maxSizeMB = options.maxSize ?? 50;
  const maxSize = maxSizeMB > 0 ? maxSizeMB * 1024 * 1024 : 0;

  // 初始化忽略过滤器
  const ignoreFilter = await IgnoreFilter.create({
    projectRoot: targetPath,
    customRules: options.ignore ? options.ignore.split(',') : [],
  });

  console.log('\n  json-build pack\n');
  console.log(`  源目录: ${targetPath}`);
  console.log(`  输出文件: ${outputPath}`);
  console.log(`  最大文件: ${maxSize > 0 ? formatSize(maxSize) : '不限'}`);
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

  // 第三阶段：流式写入JSON文件，避免一次性序列化导致内存翻倍
  const writeSpinner = new Spinner('正在写入JSON文件...');
  writeSpinner.start();

  let outputSize;
  try {
    outputSize = await writeJsonStream(outputPath, structure);
    writeSpinner.succeed(`写入完成: ${formatSize(outputSize)}`);
  } catch (err) {
    writeSpinner.fail('写入失败');
    throw err;
  }

  // 输出统计
  const elapsed = Date.now() - startTime;
  console.log('\n  打包统计:');
  console.log(`    文件数量: ${structure.files.length}`);
  console.log(`    原始大小: ${formatSize(totalSize)}`);

  console.log(`    JSON大小: ${formatSize(outputSize)}`);
  // 全空项目 totalSize=0 时跳过压缩率计算
  const ratioStr = totalSize > 0
    ? `${((1 - outputSize / totalSize) * 100).toFixed(1)}%`
    : 'N/A';
  console.log(`    压缩率:   ${ratioStr}`);
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
async function scanDirectory(basePath, currentPath, ignoreFilter, files, errors, maxSize, onScanProgress) {
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
      await scanDirectory(basePath, fullPath, ignoreFilter, files, errors, maxSize, onScanProgress);
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

        // 通知扫描进度
        if (onScanProgress) {
          onScanProgress({
            scanned: files.length,
            current: relativePath,
          });
        }
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

// 流式写入 JSON，避免一次性 JSON.stringify 导致内存翻倍
// 正确处理写流背压，避免大项目时内存积压
async function writeJsonStream(outputPath, structure) {
  const stream = fs.createWriteStream(outputPath, 'utf-8');

  // 写入一块数据，若返回 false 则等待 drain 事件（背压处理）
  const write = (chunk) => new Promise((resolve, reject) => {
    if (stream.write(chunk)) resolve();
    else stream.once('drain', resolve);
    // drain 期间若出错，stream error 事件会 reject 整个 Promise
  });

  return new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('finish', () => {
      fs.stat(outputPath, (err, stat) => {
        if (err) reject(err);
        else resolve(stat.size);
      });
    });

    (async () => {
      try {
        // 写入头部字段
        await write('{\n');
        await write(`  "version": ${JSON.stringify(structure.version)},\n`);
        await write(`  "createdAt": ${JSON.stringify(structure.createdAt)},\n`);
        await write(`  "source": ${JSON.stringify(structure.source)},\n`);
        await write(`  "fileCount": ${structure.fileCount},\n`);
        await write(`  "totalSize": ${structure.totalSize},\n`);

        // 流式写入 files 数组，逐项序列化
        await write('  "files": [\n');
        for (let i = 0; i < structure.files.length; i++) {
          const comma = i < structure.files.length - 1 ? ',' : '';
          // 每个文件对象单独 stringify，避免全量驻留内存
          await write('    ' + JSON.stringify(structure.files[i]) + comma + '\n');
        }
        await write('  ]\n}\n');

        stream.end();
      } catch (err) {
        // 触发外层 error 事件
        stream.destroy(err);
      }
    })();
  });
}

module.exports = { pack, scanDirectory };
