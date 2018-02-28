"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var ts = require("typescript");
var analyser = require("./ts-analyser");
var umlBuilder = require("./uml-builder");
var Visualizer = (function () {
    function Visualizer(isRecursive) {
        if (isRecursive === void 0) { isRecursive = false; }
        this.isRecursive = isRecursive;
        this.results = new Array();
        this.i = 0;
    }
    Visualizer.prototype.walk = function (dir) {
        this.list = fs_1.readdirSync(dir);
        this.next(dir);
        return this.results;
    };
    Visualizer.prototype.next = function (dir) {
        var file = this.list[this.i++];
        if (!file) {
            return this.results;
        }
        file = dir + '/' + file;
        var stat = fs_1.statSync(file);
        if (stat && stat.isDirectory()) {
            if (this.isRecursive) {
                this.results.concat(this.walk(file));
                this.next(dir);
            }
        }
        else {
            this.results.push(file);
            this.next(dir);
        }
    };
    Visualizer.prototype.getFiles = function (targetPath) {
        if (!fs_1.existsSync(targetPath)) {
            console.error("'" + targetPath + "' does not exist");
            return [];
        }
        var fileNames;
        if (fs_1.lstatSync(targetPath).isDirectory()) {
            fileNames = this.walk(targetPath);
        }
        else {
            fileNames = [targetPath];
        }
        return fileNames;
    };
    Visualizer.prototype.getModules = function (targetPath) {
        var originalDir = process.cwd();
        var fileNames = this.getFiles(targetPath);
        var compilerOptions = {
            noEmitOnError: true,
            noImplicitAny: true,
            target: 1,
            module: 2
        };
        var compilerHost = ts.createCompilerHost(compilerOptions, true);
        var program = ts.createProgram(fileNames, compilerOptions, compilerHost);
        var modules = program.getSourceFiles()
            .filter(function (f) { return f.fileName.lastIndexOf(".d.ts") !== f.fileName.length - ".d.ts".length; })
            .map(function (sourceFile) { return analyser.collectInformation(program, sourceFile); });
        process.chdir(originalDir);
        console.log("Found " + modules.length + " module(s)");
        return modules;
    };
    return Visualizer;
}());
exports.Visualizer = Visualizer;
function createGraph(targetPath, outputFilename, dependenciesOnly, recursive, svgOutput) {
    var visualiser = new Visualizer(recursive);
    var modules = visualiser.getModules(targetPath);
    umlBuilder.buildUml(modules, outputFilename, dependenciesOnly, svgOutput);
}
exports.createGraph = createGraph;
