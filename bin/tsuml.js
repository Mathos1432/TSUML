"use strict";
var fs_1 = require("fs");
var ts = require("typescript");
var ts_analyser_1 = require("./ts-analyser");
var uml_builder_1 = require("./uml-builder");
var DEFAULT_COMPILER_OPTIONS = {
    noEmitOnError: true,
    noImplicitAny: true,
    target: 1,
    module: 2
};
var Parser = (function () {
    function Parser(isRecursive) {
        if (isRecursive === void 0) { isRecursive = false; }
        this.isRecursive = isRecursive;
        this.results = new Array();
        this.currentFileIndex = 0;
    }
    Parser.prototype.walk = function (currentDirectory) {
        this.filesInCurrentDirectory = fs_1.readdirSync(currentDirectory);
        this.next(currentDirectory);
        return this.results;
    };
    Parser.prototype.next = function (currentDirectory) {
        var currentFile = this.filesInCurrentDirectory[this.currentFileIndex++];
        if (!currentFile) {
            return this.results;
        }
        currentFile = currentDirectory + '/' + currentFile;
        var stat = fs_1.statSync(currentFile);
        if (stat && stat.isDirectory()) {
            if (this.isRecursive) {
                this.results.concat(this.walk(currentFile));
                this.next(currentDirectory);
            }
        }
        else {
            this.results.push(currentFile);
            this.next(currentDirectory);
        }
    };
    Parser.prototype.getFiles = function (targetPath) {
        var fileNames = new Array();
        if (fs_1.existsSync(targetPath)) {
            if (fs_1.lstatSync(targetPath).isDirectory()) {
                fileNames = fileNames.concat(this.walk(targetPath));
            }
            else {
                fileNames.push(targetPath);
            }
        }
        else {
            console.error("'" + targetPath + "' does not exist");
        }
        return fileNames;
    };
    Parser.prototype.getModules = function (targetPath) {
        var originalDir = process.cwd();
        var fileNames = this.getFiles(targetPath);
        var setParentNodes = true;
        var compilerHost = ts.createCompilerHost(DEFAULT_COMPILER_OPTIONS, setParentNodes);
        var program = ts.createProgram(fileNames, DEFAULT_COMPILER_OPTIONS, compilerHost);
        var analyser = new ts_analyser_1.Analyser(program);
        var modules = program.getSourceFiles()
            .filter(function (f) { return f.fileName.lastIndexOf(".d.ts") !== f.fileName.length - ".d.ts".length; })
            .map(function (sourceFile) { return analyser.collectInformation(sourceFile); });
        process.chdir(originalDir);
        console.log("Found " + modules.length + " module(s)");
        return modules;
    };
    return Parser;
}());
exports.Parser = Parser;
function createGraph(targetPath, outputFilename, dependenciesOnly, recursive, outputType, couplingConfig) {
    var visualiser = new Parser(recursive);
    var modules = visualiser.getModules(targetPath);
    var modulesToIgnore = ["app\.module", ".*\.spec"];
    var dependenciesToIgnore = ["@", "three", "inversify.*", "express"];
    var umlBuilder = new uml_builder_1.UmlBuilder(outputType, modulesToIgnore, dependenciesToIgnore, couplingConfig);
    umlBuilder.outputUmlDiagram(modules, outputFilename, dependenciesOnly);
}
exports.createGraph = createGraph;
