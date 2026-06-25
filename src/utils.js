const fs = require('fs');
const path = require('path');

// 文本文件扩展名列表
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.json', '.js', '.mjs', '.cjs',
  '.ts', '.tsx', '.jsx', '.vue', '.svelte',
  '.html', '.htm', '.xml', '.svg', '.xhtml',
  '.css', '.scss', '.sass', '.less', '.styl',
  '.py', '.rb', '.php', '.java', '.kt', '.scala',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.swift',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
  '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.config',
  '.env', '.env.*', '.gitignore', '.gitattributes', '.editorconfig',
  '.prettierrc', '.eslintrc', '.babelrc',
  '.sql', '.graphql', '.gql',
  '.r', '.R', '.lua', '.pl', '.pm',
  '.dart', '.elm', '.ex', '.exs', '.erl',
  '.hs', '.lhs', '.ml', '.mli', '.clj', '.cljs',
  '.coffee', '.litcoffee', '.ts',
  '.log', '.csv', '.tsv',
  '.dockerfile', '.dockerignore',
  '.makefile', '.cmake',
  '.gradle', '.properties',
  '.lock', '.sum',
]);

// 检测文件是否为文本文件
function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();

  // 特殊文件名
  const textFileNames = new Set([
    'dockerfile', 'makefile', 'gemfile', 'rakefile',
    'procfile', 'vagrantfile', '.gitignore', '.gitattributes',
    '.editorconfig', '.prettierrc', '.eslintrc', '.babelrc',
    'license', 'licence', 'changelog', 'readme',
    'authors', 'contributors', 'copying', 'install',
    'news', 'thanks',
  ]);

  if (textFileNames.has(basename)) {
    return true;
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    return true;
  }

  // 没有扩展名的文件可能是文本
  if (!ext) {
    return true;
  }

  return false;
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化时间
function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds % 60}s`;
}

// 安全读取文件（流式）
function readFileAsStream(filePath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// 安全写入文件（流式）
function writeFileAsStream(filePath, data) {
  return new Promise((resolve, reject) => {
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    stream.write(data);
    stream.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// 获取文件信息
async function getFileInfo(filePath) {
  const stat = await fs.promises.stat(filePath);
  return {
    size: stat.size,
    mtime: stat.mtimeMs,
    atime: stat.atimeMs,
    ctime: stat.ctimeMs,
    mode: stat.mode,
  };
}

// 设置文件时间戳
async function setFileTimestamps(filePath, timestamps) {
  try {
    await fs.promises.utimes(filePath, timestamps.atime / 1000, timestamps.mtime / 1000);
  } catch (err) {
    // 忽略时间戳设置错误
  }
}

module.exports = {
  isTextFile,
  formatSize,
  formatTime,
  readFileAsStream,
  writeFileAsStream,
  getFileInfo,
  setFileTimestamps,
  TEXT_EXTENSIONS,
};
