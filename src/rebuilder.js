const fs = require('fs');
const path = require('path');
const { ProgressBar, Spinner } = require('./progress');
const {
  formatSize,
  formatTime,
  writeFileAsStream,
  setFileTimestamps,
} = require('./utils');

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

  // 确定目标目录
  let destPath = options.dest || process.cwd();

  // 如果指定了源目录名，创建子目录
  if (structure.source && options.dest) {
    destPath = path.join(options.dest, structure.source);
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
    const fullPath = path.join(destPath, relativePath);

    progressBar.increment(1, relativePath);

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

module.exports = { rebuild };
