
var fs = require('fs');
var path = require('path');
/**

lightRequireCompile
@param {FilePath} mainMod  The main js
@param {FilePath} outputFile The output target file
@param {String} exportName The global export name, default won't exposed global

*/
function lightRequireCompile(mainMod,outputFile,exportName) {
  var all = findModules(mainMod);
  var main = all.main;
  var modules = all.modules;
  // printModules(modules,0);
  // console.log(modules.join("\n"));

  var vars = modules.map(function (m){return m.module_id}).concat(['_tmp']);
  var prologue = '\n(function () {var '+vars.join(',')+';\n',
      epilogue = (exportName?'\nthis.'+exportName+' = '+main.module_id+'\n':'') +
                 '\n})();\n';
  var modCodes = modules.map(wrapModule);
  var code = prologue + modCodes.join("\n") + epilogue;
  if (outputFile === "-") {
    console.log(code);
  } else {
    fs.writeFileSync(outputFile,code);
  }

}



function wrapModule(mod,outputFile) {
  return "\n_tmp={exports:{}};\n(function (module) {\n" +
            mod.content +
            "\n})(_tmp);\n" +
            mod.module_id + " = _tmp.exports;\n";

}

function printModules(modules,indent) {
  modules.forEach(function (mod) {
    console.log(repeats("  ",indent)+"|-"+mod.name);
    printModules(mod.deps,indent+1);
  });
}


function repeats(s,n) {return new Array(n+1).join(s)}

function findModules(main) {
  var modules = [], cache = Object.create(null);
  var depFlow = ["#TOP"];
  depFlow.toString = function () {return this.join("\n->")};

  var mainMod = traverse(main,process.cwd(),depFlow,modules,cache);

  return {main:mainMod,modules:modules};
}

var requireRegex = /\brequire\s*\(\s*(['"])(.+)\1\s*\)\s*/g;

function traverse(modName,cwd,depFlow,modules,cache) {
  var mod = readModule(modName,cwd,cache);
  if (!mod) {
    throw new Error("Module ["+ modName + "] not found when processing modules " + depFlow );
  }
  if (mod._traversed) return mod;
  depFlow = depFlow.concat(mod.name);
  if (mod._traversing) {
    console.log(modules)
    throw new Error("Cyclic dependencies detected:" + depFlow)
  }
  mod._traversing = true;
  var deps = [];
  mod.content = mod.content.replace(
                  requireRegex,
                  function (_,_1,depModName) {
                    var depMod = traverse(depModName,mod.dir,depFlow,modules,cache);
                    deps.push(depMod);
                    return " "+depMod.module_id+" ";
                  });
  mod._traversed = true;
  mod._traversing = false;
  mod.deps = deps;
  modules.push(mod);
  return mod;
}



var  _AUTO_INCREMENT_ID = 1;
function guid() {
  _AUTO_INCREMENT_ID = (_AUTO_INCREMENT_ID + 1) | 0;
  var a = _AUTO_INCREMENT_ID.toString(36);
  var date = (+(new Date)).toString(36) + a;
  var rand = ((Math.random() * 1e8) | 0).toString(36);
  return '_'+(date + rand).toUpperCase();
}

function readModule(modName,cwd,cache) {
  var modFile = modName;
  if (modFile.slice(-3)!=='.js') modFile += '.js';
  modFile = path.resolve(cwd,modFile);
  if (!fs.existsSync(modFile)) return null;
  modFile = fs.realpathSync(modFile);
  return cache[modFile] = cache[modFile] || new Module(modName,modFile);
}

function Module(modName,modFile) {
  this.name = modName;
  this.file = modFile;
  this.dir = path.dirname(modFile);
  this.module_id = (modName + guid()).replace(/[^\w$]+/g,'_').replace(/^[^a-z_]+/i,'_').replace(/_+/g,'_');
  Object.defineProperty(this,'content',{
    enumerable:false,
    writable:true,
    value:fs.readFileSync(modFile,{encoding:'utf-8'})
  });
  if (this.content.slice(0,2) === '#!') { // remove shebang
    this.content = this.content.replace(/^#![^\n\r]+/,'\n');
  }
  this._traversing = false;
  this._traversed = false;
}

Module.prototype.toString = function () {
  return this.name;
};




module.exports = lightRequireCompile
