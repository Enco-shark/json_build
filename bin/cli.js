#!/usr/bin/env node

const path = require('path');
const { pack } = require('../src/packer');
const { rebuild } = require('../src/rebuilder');

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
json-build - 项目打包与解包工具

用法:
  json-build pack <目录路径> [选项]    将目录打包为JSON文件
  json-build rebuild <json路径> [选项] 从JSON文件重建目录

选项:
  -o, --output <路径>      指定输出文件路径 (默认: structure.json)
  -d, --dest <路径>        指定重建目标目录 (默认: 当前目录)
  --no-timestamps          不恢复文件时间戳
  --ignore <规则>          自定义忽略规则 (逗号分隔)
  --max-size <MB>          最大文件大小限制 (默认: 50MB)
  -h, --help               显示帮助信息
  -v, --version            显示版本号

示例:
  json-build pack ./my-project
  json-build pack ./my-project -o backup.json
  json-build rebuild structure.json
  json-build rebuild structure.json -d ./restored-project
`);
}

function showVersion() {
  const pkg = require('../package.json');
  console.log(`json-build v${pkg.version}`);
}

function parseArgs(args) {
  const options = {
    command: null,
    target: null,
    output: null,
    dest: null,
    timestamps: true,
    ignore: null,
    maxSize: 50
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      showHelp();
      process.exit(0);
    }

    if (arg === '-v' || arg === '--version') {
      showVersion();
      process.exit(0);
    }

    if (!options.command) {
      options.command = arg;
    } else if (!options.target) {
      options.target = arg;
    } else if (arg === '-o' || arg === '--output') {
      options.output = args[++i];
    } else if (arg === '-d' || arg === '--dest') {
      options.dest = args[++i];
    } else if (arg === '--no-timestamps') {
      options.timestamps = false;
    } else if (arg === '--ignore') {
      options.ignore = args[++i];
    } else if (arg === '--max-size') {
      options.maxSize = parseInt(args[++i], 10);
    }

    i++;
  }

  return options;
}

async function main() {
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    showHelp();
    return;
  }

  const options = parseArgs(args);

  if (!options.command) {
    console.error('错误: 请指定命令 (pack 或 rebuild)');
    showHelp();
    process.exit(1);
  }

  if (!options.target) {
    console.error('错误: 请指定目标路径');
    showHelp();
    process.exit(1);
  }

  try {
    if (options.command === 'pack') {
      const targetPath = path.resolve(options.target);
      const outputPath = options.output
        ? path.resolve(options.output)
        : path.join(process.cwd(), 'structure.json');

      await pack(targetPath, {
        output: outputPath,
        ignore: options.ignore,
        maxSize: options.maxSize
      });

    } else if (options.command === 'rebuild') {
      const jsonPath = path.resolve(options.target);
      const destPath = options.dest
        ? path.resolve(options.dest)
        : process.cwd();

      await rebuild(jsonPath, {
        dest: destPath,
        timestamps: options.timestamps
      });

    } else {
      console.error(`错误: 未知命令 '${options.command}'`);
      showHelp();
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n错误: ${error.message}`);
    process.exit(1);
  }
}

main();
