const fs = require('fs');
const path = require('path');
const { ProgressBar, Spinner } = require('./progress');
const {
  formatSize,
  formatTime,
  writeFileAsStream,
  setFileTimestamps,
} = require('./utils');

// 校验相对路径安全，防止路径遍历攻击
function isSafeRelativePath(relativePath) {
  if (typeof relativePath !== 'string' || relativePath === '') {
    return false;
  }

  // 统一为正斜杠
  const normalized = relativePath.replace(/\\/g, '/');

  // 不允许绝对路径（Windows 盘符或 POSIX 根）
  if (/^[a-zA-Z]:/.test(normalized) || normalized.startsWith('/')) {
    return false;
  }

  // 不允许路径中包含 .. 段
  const segments = normalized.split('/');
  if (segments.some(seg => seg === '..')) {
    return false;
  }

  return true;
}

async function rebuild(jsonPath, options = {}) {
  const startTime = Date.now();
  const restoreTimestamps = options.timestamps !== false;

  // 验证JSON文件
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`JSON文件不存在: ${jsonPath}`);
  }

  console.log('\n  json-build rebuild\n');
  console.log(`  JSON文件: ${jsonPath}`);

  // 读取JSON文件
  const readSpinner = new Spinner('正在读取JSON文件...');
  readSpinner.start();

  let structure;
  try {
    const content = await fs.promises.readFile(jsonPath, 'utf-8');
    structure = JSON.parse(content);
    readSpinner.succeed(`读取完成: ${structure.files.length} 个文件`);
  } catch (err) {
    readSpinner.fail('读取失败');
    throw new Error(`无法解析JSON文件: ${err.message}`);
  }

  // 验证结构
  if (!structure.version || !structure.files || !Array.isArray(structure.files)) {
    throw new Error('无效的JSON结构: 缺少必要的字段');
  }

  // 确定目标目录：统一行为，总是在目标目录下创建 source 子目录
  // 这样保持与原项目目录结构一致，避免污染目标目录
  const baseDestPath = options.dest || process.cwd();
  const baseDestResolved = path.resolve(baseDestPath);
  let destPath = baseDestResolved;

  if (structure.source) {
    // 安全校验 source 字段，防止恶意 JSON 通过 source 字段进行路径遍历
    // source 应为单个目录名，不含路径分隔符或 ..
    const safeSource = isSafeRelativePath(structure.source);
    if (!safeSource) {
      throw new Error(`无效的 source 字段: "${structure.source}"（可能包含路径遍历字符）`);
    }
    destPath = path.join(baseDestResolved, structure.source);
  }

  // 二次校验：destPath 必须在 baseDestPath 之下
  if (destPath !== baseDestResolved && !destPath.startsWith(baseDestResolved + path.sep)) {
    throw new Error('目标目录越界，可能存在路径遍历攻击');
  }

  console.log(`  目标目录: ${destPath}`);
  console.log(`  文件数量: ${structure.files.length}`);
  console.log(`  原始大小: ${formatSize(structure.totalSize || 0)}`);
  console.log(`  创建时间: ${structure.createdAt || '未知'}`);
  console.log('');

  // 创建目标目录
  if (!fs.existsSync(destPath)) {
    await fs.promises.mkdir(destPath, { recursive: true });
  }

  // 进度条
  const progressBar = new ProgressBar({
    total: structure.files.length,
    label: '重建进度',
  });

  const errors = [];
  let restoredCount = 0;
  let totalSize = 0;

  // 处理每个文件
  for (let i = 0; i < structure.files.length; i++) {
    const file = structure.files[i];
    const relativePath = file.path;

    progressBar.increment(1, relativePath);

    // 通知外部进度（用于 GUI IPC）
    if (options.onProgress) {
      options.onProgress({
        current: i + 1,
        total: structure.files.length,
        file: relativePath,
      });
    }

    // 安全校验：防止路径遍历
    if (!isSafeRelativePath(relativePath)) {
      errors.push({
        file: relativePath,
        error: '不安全的路径（可能包含 .. 或绝对路径）',
      });
      continue;
    }

    const fullPath = path.join(destPath, relativePath);

    // 二次校验：解析后必须仍在 destPath 之下
    const resolvedFull = path.resolve(fullPath);
    if (resolvedFull !== destPath && !resolvedFull.startsWith(destPath + path.sep)) {
      errors.push({
        file: relativePath,
        error: '路径越界，已跳过',
      });
      continue;
    }

    try {
      // 确保目录存在
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      // 解码内容
      let content;
      if (file.encoding === 'base64') {
        content = Buffer.from(file.content, 'base64');
      } else {
        content = file.content;
      }

      // 写入文件
      await writeFileAsStream(fullPath, content);

      // 恢复时间戳
      if (restoreTimestamps && file.timestamps) {
        await setFileTimestamps(fullPath, file.timestamps);
      }

      // 恢复文件权限（如果提供且合理）
      if (file.mode !== undefined && typeof file.mode === 'number') {
        try {
          await fs.promises.chmod(fullPath, file.mode & 0o777);
        } catch (_e) {
          // 权限设置失败不阻断流程
        }
      }

      restoredCount++;
      totalSize += file.size || 0;

    } catch (err) {
      errors.push({
        file: relativePath,
        error: err.message,
      });
    }
  }

  progressBar.done('文件重建完成');

  // 输出统计
  const elapsed = Date.now() - startTime;
  console.log('\n  重建统计:');
  console.log(`    成功恢复: ${restoredCount} 个文件`);
  console.log(`    总大小:   ${formatSize(totalSize)}`);
  console.log(`    耗时:     ${formatTime(elapsed)}`);

  if (errors.length > 0) {
    console.log(`\n  ⚠ ${errors.length} 个文件恢复失败:`);
    errors.slice(0, 5).forEach(e => {
      console.log(`    - ${e.file}: ${e.error}`);
    });
    if (errors.length > 5) {
      console.log(`    ... 还有 ${errors.length - 5} 个`);
    }
  }

  console.log('\n  ✓ 重建完成!\n');
}

module.exports = { rebuild, isSafeRelativePath };
