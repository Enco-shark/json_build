const fs = require('fs');
const path = require('path');

// 文本文件扩展名列表（仅包含真正的扩展名，不含完整文件名）
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.json', '.js', '.mjs', '.cjs',
  '.ts', '.tsx', '.jsx', '.vue', '.svelte',
  '.html', '.htm', '.xml', '.svg', '.xhtml',
  '.css', '.scss', '.sass', '.less', '.styl',
  '.py', '.rb', '.php', '.java', '.kt', '.scala',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.swift',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
  '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.config',
  '.sql', '.graphql', '.gql',
  '.r', '.lua', '.pl', '.pm',
  '.dart', '.elm', '.ex', '.exs', '.erl',
  '.hs', '.lhs', '.ml', '.mli', '.clj', '.cljs',
  '.coffee', '.litcoffee',
  '.log', '.csv', '.tsv',
  '.gradle', '.properties',
  '.lock', '.sum',
]);

// 特殊文本文件名（无扩展名或点开头的配置文件）
const TEXT_FILENAMES = new Set([
  'dockerfile', 'makefile', 'gemfile', 'rakefile',
  'procfile', 'vagrantfile',
  '.gitignore', '.gitattributes', '.editorconfig',
  '.prettierrc', '.eslintrc', '.babelrc',
  '.npmignore', '.dockerignore', '.env',
  'license', 'licence', 'changelog', 'readme',
  'authors', 'contributors', 'copying', 'install',
  'news', 'thanks',
]);

// 常见二进制文件扩展名（优先级高于"无扩展名默认文本"）
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.icns', '.webp', '.tiff',
  '.mp3', '.mp4', '.avi', '.mov', '.mkv', '.wav', '.flac', '.ogg', '.webm',
  '.zip', '.gz', '.tar', '.rar', '.7z', '.bz2', '.xz',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.class',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.sqlite', '.db', '.mdb',
  '.wasm',
]);

// 二进制内容魔数（前 N 字节特征）
const BINARY_MAGIC_BYTES = [
  [0x89, 0x50, 0x4E, 0x47],           // PNG
  [0xFF, 0xD8, 0xFF],                  // JPEG
  [0x47, 0x49, 0x46, 0x38],           // GIF
  [0x42, 0x4D],                        // BMP
  [0x25, 0x50, 0x44, 0x46],           // PDF
  [0x50, 0x4B, 0x03, 0x04],           // ZIP
  [0x52, 0x61, 0x72, 0x21],           // RAR
  [0x37, 0x7A, 0xBC, 0xAF],           // 7z
  [0x1F, 0x8B],                        // GZIP
  [0x4D, 0x5A],                        // EXE/DLL
  [0x7F, 0x45, 0x4C, 0x46],           // ELF
  [0xCA, 0xFE, 0xBA, 0xBE],           // Java class
  [0x00, 0x61, 0x73, 0x6D],           // WASM
];

// 同步读取文件头部用于魔数检测
function readHeadBytes(filePath, n) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(n);
    const bytesRead = fs.readSync(fd, buf, 0, n, 0);
    fs.closeSync(fd);
    return buf.slice(0, bytesRead);
  } catch (_e) {
    return Buffer.alloc(0);
  }
}

// 通过魔数判断是否为二进制文件
function looksBinaryByMagic(filePath) {
  const head = readHeadBytes(filePath, 8);
  if (head.length === 0) return false;
  return BINARY_MAGIC_BYTES.some(magic =>
    magic.every((b, i) => head[i] === b)
  );
}

// 检测文件是否为文本文件
function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();

  // 1. 文件名匹配（dockerfile、.gitignore 等）
  if (TEXT_FILENAMES.has(basename)) {
    return true;
  }

  // 2. 已知文本扩展名
  if (TEXT_EXTENSIONS.has(ext)) {
    return true;
  }

  // 3. 已知二进制扩展名直接判为二进制
  if (BINARY_EXTENSIONS.has(ext)) {
    return false;
  }

  // 4. 无扩展名文件：先用魔数检测，未命中再默认按文本处理
  if (!ext) {
    if (looksBinaryByMagic(filePath)) {
      return false;
    }
    return true;
  }

  // 5. 未知扩展名：用魔数辅助判断
  if (looksBinaryByMagic(filePath)) {
    return false;
  }

  return true;
}

// 格式化文件大小
function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化时间
function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  if (ms < 1000) return `${Math.round(ms)}ms`;
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
  BINARY_EXTENSIONS,
  TEXT_FILENAMES,
};
