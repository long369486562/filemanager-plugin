'use strict';

var require$$0 = require('colors/safe');
var require$$1 = require('glob-parent');
var require$$1$1 = require('glob');
var require$$2 = require('fs-extra');
var require$$4 = require('path');
var require$$1$2 = require('compressing');

var utils = {};

const colors = require$$0;
const isTest = process.env.NODE_ENV === 'test';
const log = console.log;
const DEFAULT_TYPE = 'all';

const logger$6 = {
  BUILTIN_LOGS: ['all', 'error'],
  type: DEFAULT_TYPE,
  
  setType(type) {
    this.type = this.BUILTIN_LOGS.includes(type) ? type : DEFAULT_TYPE;
    return this;
  },
  info(msg) {
    if (isTest || this.type !== 'all') return;
    log(colors.green(msg));
  },
  error(msg) {
    if (isTest) return;
    log(colors.red(msg));
    process.exitCode = 1;
  }
};

const flat$1 = (arr) => {
  return arr.reduce(
    (pre, cur) => pre.concat(Array.isArray(cur) ? flat$1(cur) : [cur]),
    []
  );
};

/**
 * @description singleton mode
 * @returns {function}
 */
const cacheSingle = (() => {
  let instance = null;
  const obj = {};
  return () => {
    instance = instance || obj;
    return instance;
  };
})();

utils.logger = logger$6;
utils.flat = flat$1;
utils.cacheSingle = cacheSingle;

const {
  flat,
  logger: logger$5
} = utils;
const globParent = require$$1;
const { globSync: globSync$4 } = require$$1$1;
const {
  copySync,
  renameSync: renameSync$1,
  statSync
} = require$$2;
const {
  basename: basename$1,
  join: join$2
} = require$$4;

const copy$1 = ({
  source,
  destination,
  globOptions = {},
  ...restOption
}, globalOptions = {}) => {
  const {
    log: logType
  } = globalOptions;
  const {
    isFlat = true,
    name = ''
  } = restOption;
  const wrapSources = Array.isArray(source) ? source : [source];
  try {
    const sources = wrapSources.map((source) => globSync$4(source, globOptions));
    const parentPath = globParent(source, {});
    for (const source of flat(sources)) {
      const withFolderBaseName = source.substr(parentPath.length);
      const dest = join$2(destination,
        isFlat ? basename$1(source) : withFolderBaseName);
      copySync(source, dest);
      if (name && statSync(source).isFile()) {
        renameSync$1(dest, join$2(destination, name));
      }
      logger$5
        .setType(logType)
        .info(`success: copy '${source}' to '${destination}'`);
    }
  } catch (e) {
    logger$5.error(`copy error: ${e}`);
  }
};

var copy_1 = copy$1;

const { logger: logger$4 } = utils;
const { globSync: globSync$3 } = require$$1$1;
const { moveSync } = require$$2;
const {
  basename,
  join: join$1
} = require$$4;
const move$1 = ({ source, destination }, options = {}) => {
  const { log: logType } = options;

  try {
    globSync$3(source).forEach((source) => {
      const dest = join$1(destination, basename(source));
      moveSync(source, dest,{ overwrite: true });
      logger$4
        .setType(logType)
        .info(`move: move '${source}' to '${destination}'`);
    });
  } catch (e) {
    logger$4.error(`move error: ${e}`);
  }
};

var move_1 = move$1;

const { logger: logger$3 } = utils;
const { globSync: globSync$2 } = require$$1$1;
const fs$1 = require$$2;

const del$1 = (file, options = {}) => {
  const { log: logType } = options;
  try {
    const files = globSync$2(file);
    for (const file of files) {
      fs$1.removeSync(file);
      logger$3.setType(logType).info(`success: delete '${file}'`);
    }
  } catch (e) {
    logger$3.error(`delete error: ${e}`);
  }
};

var del_1 = del$1;

const { logger: logger$2 } = utils;
const Compressing = require$$1$2;
const fs = require$$2;
const { globSync: globSync$1 } = require$$1$1;
const { dirname } = require$$4;

/**
 * @desc Zip file/folder. Support zip, tar, gzip.
 * @param source {string}
 * @param destination {string}
 * @param type {string}
 * @param globalOptions
 * @param option {Object}
 * @returns {Promise<void>}
 */
const zip$1 = async (
  {
    source,
    destination,
    type = 'zip'
  },
  globalOptions = {}
) => {
  const { log: logType } = globalOptions;
  
  try {
    const sources = globSync$1(source);
    if (sources.length === 0) {
      logger$2.error(`zip error: '${source}' is not exist`);
      return;
    }
    fs.ensureDirSync(dirname(destination));
    if (type === 'gzip') {
      // gzip
      const hasDirectory = sources.find((source) =>
        fs.statSync(source).isDirectory()
      );
      if (sources.length > 1 || hasDirectory) {
        logger$2.error(`zip error: Gzip only support compressing a single file`);
        return;
      }
      await new Promise((resolve, reject) => {
        Compressing.gzip
          .compressFile(source, destination)
          .then(() => {
            logger$2
              .setType(logType)
              .info(`success: zip '${source}' to '${destination}'`);
            resolve();
          })
          .catch((e) => {
            logger$2.error(`zip error: ${e}`);
            reject(e);
          });
      });
    } else {
      // tar, zip, tgz
      const targetStream = new Compressing[type].Stream();
      for (const item of sources) {
        targetStream.addEntry(item);
      }
      await new Promise((resolve, reject) => {
        targetStream
          .pipe(fs.createWriteStream(destination))
          .on('finish', () => {
            logger$2
              .setType(logType)
              .info(`success: zip '${source}' to '${destination}'`);
            resolve();
          })
          .on('error', (e) => {
            logger$2.error(`zip error: ${e}`);
            reject(e);
          });
      });
    }
  } catch (e) {
    logger$2.error(`zip error: ${e}`);
  }
};

var zip_1 = zip$1;

const compressing = require$$1$2;
const { globSync } = require$$1$1;
const { logger: logger$1 } = utils;

/**
 * @desc Unzip file/folder. Support zip, tar, gzip.
 * @param source {string}
 * @param destination {string}
 * @param type {string}
 * @param option {Object}
 * @param globalOptions {Object}
 * @returns {Promise<void>}
 */

const unzip$1 = async (
  {
    source,
    destination,
    type = 'zip'
  },
  globalOptions = {}
) => {
  const { log: logType } = globalOptions;
  
  try {
    const sources = globSync(source);
    for (const source of sources) {
      await new Promise((resolve, reject) => {
        compressing[type]
          .uncompress(source, destination)
          .then(() => {
            logger$1
              .setType(logType)
              .info(`success: unzip '${source}' to '${destination}'`);
            resolve();
          })
          .catch((e) => {
            logger$1.error(`unzip error: ${e}`);
            reject(e);
          });
      });
    }
  } catch (e) {
    logger$1.error(`unzip error: ${e}`);
  }
};

var unzip_1 = unzip$1;

const { renameSync } = require$$2;
const { join } = require$$4;
const { logger } = utils;

const rename$1 = ({
  path,
  oldName,
  newName
}, options = {}) => {
  const { log: logType } = options;
  try {
    const oldPath = join(path, oldName);
    const newPath = join(path, newName);
    renameSync(oldPath, newPath);
    logger
      .setType(logType)
      .info(`success: rename '${oldName}' to '${newName}'`);
  } catch (e) {
    logger.error(`rename error: ${e}`);
  }
};

var rename_1 = rename$1;

const copy = copy_1;
const move = move_1;
const del = del_1;
const zip = zip_1;
const unzip = unzip_1;
const rename = rename_1;
var commander = {
  copy,
  move,
  del,
  zip,
  unzip,
  rename,
};

exports.commander = commander;
exports.utils = utils;
