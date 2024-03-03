'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var require$$0 = require('os');
var require$$4 = require('path');
var require$$2 = require('cluster');
var index = require('./index-d2a9133c.js');
require('colors/safe');
require('glob-parent');
require('glob');
require('fs-extra');
require('compressing');

var src = {};

var handler = {};

const os = require$$0;
const { join } = require$$4;
const cluster = require$$2;
const { logger: logger$1 } = index.utils;

function masterCluster$1({
  jobs,
  type,
  cpu
}, options) {
  return new Promise((resolve, reject) => {
    (cluster.setupMaster || cluster.setupPrimary)({
      exec: join(__dirname, 'workerCluster.js'),
      silent: false
    });
    if (cluster.isMaster || cluster.isPrimary) {
      const workerID = [];
      let countCompleted = 0;
      let forkCount = 0;
      let maxCpu = getMaxCup(cpu, jobs.length);
      while (forkCount < maxCpu) {
        const wk = cluster.fork();
        workerID.push(wk.id);
        wk.send({
          job: jobs[forkCount++],
          type,
          options
        });
      }
      cluster.on('error', (e) => {
        logger$1.error(`[master] error:  ${e}`);
        reject(e);
      });
      workerID.forEach((id) => {
        cluster.workers[id].on('message', function () {
          countCompleted++;
          const jobsLength = jobs.length;
          if (forkCount < jobsLength) {
            this.send({
              job: jobs[forkCount++],
              type,
              options
            });
          }
          if (countCompleted === jobsLength) {
            workerID.forEach((id) => {
              if (!cluster.workers[id].isDead()) {
                cluster.workers[id].disconnect();
              }
            });
            resolve(countCompleted);
          }
        });
      });
    }
  });
}

function getMaxCup(cpu, jobsLength) {
  let maxCpu = os.cpus().length - 1;
  if (cpu && !isNaN(cpu) && cpu > 0) {
    maxCpu = Math.min(Number(cpu), maxCpu);
  }
  return Math.min(maxCpu, jobsLength);
}

var masterCluster_1 = masterCluster$1;

const masterCluster = masterCluster_1;
const commander = index.commander;
const { cacheSingle } = index.utils;
const COMMAND_LIST = ['copy', 'move', 'del', 'zip', 'unzip', 'rename'];

/**
 * @description Execute different actions according to commands,
 * do multi-progress depending on the parallel of the globalOptions parameter
 * @param commands {object}
 * @param globalOptions {object}
 * @returns {Promise<void>}
 */
async function handleCommand$2(commands = {}, globalOptions = {}) {
  for (const command in commands) {
    if (commands.hasOwnProperty(command) && COMMAND_LIST.includes(command)) {
      const {
        items = [],
        options = {}
      } = commands[command] || {};
      
      const opts = Object.assign({}, globalOptions, options);
      const { parallel } = globalOptions;
      const { cache: optCache = true } = opts;
      const content = JSON.stringify(items);
      if ((optCache && cacheSingle()[command] === content) || items.length ===
        0) {
        continue;
      }
      
      if (parallel) {
        await masterCluster(
          {
            jobs: items,
            cpu: parallel,
            type: command
          },
          opts
        );
      } else {
        for (const item of items) {
          await commander[command](item, opts);
        }
      }
      optCache && (cacheSingle()[command] = content);
    }
  }
}

handler.handleCommand = handleCommand$2;

const { handleCommand: handleCommand$1 } = handler;
const { logger } = index.utils;

const NAMESPACE_REGISTER_NAME = 'REGISTER_';
const BUILTIN_EVENTS_MAP = {
  start: {
    hookType: 'tapAsync',
    hookName: 'beforeCompile',
    registerName: NAMESPACE_REGISTER_NAME + 'beforeCompile'
  },
  end: {
    hookType: 'tapAsync',
    hookName: 'done',
    registerName: NAMESPACE_REGISTER_NAME + 'done'
  }
};
const BUILTIN_EVENT_NAMES = Object.keys(BUILTIN_EVENTS_MAP);
const SUPPORT_HOOKS_TYPE = ['tap', 'tapPromise', 'tapAsync'];

class webpackPlugin {
  constructor(opts) {
    this.opts = {};
    if (Object.prototype.toString.call(opts) === '[object Object]') {
      this.opts = opts;
    }
  }
  
  /**
   * @description runs according to different operates like delete, when different hooks called
   * @param commands {object}
   * @returns {function}
   */
  hooksRegisterCallback(commands) {
    return async (compilation, callback) => {
      await handleCommand$1(commands, this.opts?.options);
      typeof callback === 'function' && callback();
    };
  }
  
  /**
   * @description translate 'options' to other options with hooks and types of webpack
   * @returns {Array}
   * @example
   * [
   * {
   *   hookType: 'tapAsync', // reference to webpack compiler hook type
   *   hookName: 'afterEmit', // reference to webpack compiler hook name
   *   registerName: 'REGISTER_afterEmit',
   *   commands: {
   *     del: {
   *       items: [
   *          { source: './unzip/a.tar', destination: './dist/unzip/a', type: 'tar', options: {}},
   *       ]
   *     }
   *   }
   * }
   * ]
   */
  translateHooks() {
    const {
      events = {},
      customHooks = []
    } = this.opts;
    let result = [];
    if (customHooks.length > 0) {
      result = customHooks.map((hook) => {
        const {
          registerName,
          hookName
        } = hook;
        if (!registerName) {
          hook.registerName = NAMESPACE_REGISTER_NAME + Math.random() +
            hookName;
        }
        return hook;
      });
    } else {
      for (const event in events) {
        if (
          events.hasOwnProperty(event) &&
          BUILTIN_EVENT_NAMES.includes(event) &&
          events[event]
        ) {
          result.push({
            ...BUILTIN_EVENTS_MAP[event],
            commands: events[event]
          });
        }
      }
    }
    return result;
  }
  
  apply(compiler) {
    const hooks = this.translateHooks();
    for (const hookItem of hooks) {
      const {
        hookType,
        hookName,
        commands,
        registerName
      } = hookItem;
      if (!SUPPORT_HOOKS_TYPE.includes(hookType)) continue;
      try {
        compiler.hooks[hookName][hookType](
          registerName,
          this.hooksRegisterCallback(commands)
        );
      } catch (e) {
        logger.error(`File manager error: ${e}`);
      }
    }
  }
}

var webpackPlugin_1 = webpackPlugin;

const { handleCommand } = handler;
const EVENT_NAMES_MAP = {
  start: 'buildStart',
  end: 'buildEnd'
};

const EVENT_NAMES = Object.keys(EVENT_NAMES_MAP);

/**
 * @description Extract hook from 'events' and 'customHooks'
 * @param opts {Object}
 * @returns {Array}
 * @example
 * [
 *    {
 *      hookName: 'buildstart',
 *      commands: {
 *        del: {....}
 *      }
 *    }
 * ]
 */
function extractHooks(opts) {
  const {
    events = {},
    customHooks = [],
    options: globalOptions = {}
  } = opts;
  let hooks = [];
  if (customHooks.length > 0) {
    hooks = customHooks.map((hook) => {
      hook.globalOptions = globalOptions;
      return hook;
    });
  } else {
    for (const event in events) {
      if (events.hasOwnProperty(event) && EVENT_NAMES.includes(event)) {
        hooks.push({
          hookName: EVENT_NAMES_MAP[event],
          commands: events[event],
          globalOptions
        });
      }
    }
  }
  return hooks;
}

/**
 * @description Create each hook method
 * @param hooks {Array}
 * @returns {Object<Promise>}
 */
function createHooks(hooks) {
  return hooks.reduce((pre, cur) => {
    const {
      hookName,
      commands,
      globalOptions
    } = cur;
    pre[hookName] = async () => {
      await handleCommand(commands, globalOptions);
    };
    return pre;
  }, {});
}

function rollupPlugin(opts) {
  if (Object.prototype.toString.call(opts) !== '[object Object]') return;
  return {
    name: 'file-manager',
    ...createHooks(extractHooks(opts))
  };
}

var rollupPlugin_1 = rollupPlugin;

const wpPlugin = webpackPlugin_1;
const ruPlugin = rollupPlugin_1;
var WebpackFilemanager = src.WebpackFilemanager = wpPlugin;
var RollupFilemanager = src.RollupFilemanager = ruPlugin;
var ViteFilemanager = src.ViteFilemanager = ruPlugin;

exports.RollupFilemanager = RollupFilemanager;
exports.ViteFilemanager = ViteFilemanager;
exports.WebpackFilemanager = WebpackFilemanager;
exports.default = src;
