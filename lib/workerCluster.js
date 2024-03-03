'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var index = require('./index-d2a9133c.js');
require('colors/safe');
require('glob-parent');
require('glob');
require('fs-extra');
require('path');
require('compressing');

var workerCluster = {};

const commander = index.commander;

process.on('message', async (msg) => {
  const {
    job,
    type,
    options
  } = msg;
  await commander[type](job, options);
  process.send('done');
});

exports.default = workerCluster;
