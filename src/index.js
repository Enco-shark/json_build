// 公共 API 入口
// 作为 npm 包被引入时使用此文件（见 package.json 的 exports 字段）

const { pack, scanDirectory } = require('./packer');
const { rebuild, isSafeRelativePath } = require('./rebuilder');
const { IgnoreFilter, DEFAULT_IGNORES } = require('./ignore');
const {
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
} = require('./utils');

module.exports = {
  // 主功能
  pack,
  rebuild,
  scanDirectory,
  // 忽略规则
  IgnoreFilter,
  DEFAULT_IGNORES,
  // 工具
  isTextFile,
  formatSize,
  formatTime,
  readFileAsStream,
  writeFileAsStream,
  getFileInfo,
  setFileTimestamps,
  isSafeRelativePath,
  // 常量
  TEXT_EXTENSIONS,
  BINARY_EXTENSIONS,
  TEXT_FILENAMES,
};
