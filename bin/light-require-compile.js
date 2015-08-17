#!/usr/bin/env node

var lightRequireCompile = require('../index.js');
var argv = process.argv;
var mainMod = argv[2];
var outputFile = argv[3];
var exportName = argv[4];

if (!mainMod) {
  console.log("Usage: light-require-compile main.js output-bundle.js [mainGlobalExportName]")
}

lightRequireCompile(mainMod,outputFile,exportName);

