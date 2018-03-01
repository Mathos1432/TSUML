/// <reference path="typings/node/node.d.ts" />

import { readdirSync, lstatSync, existsSync, statSync } from "fs";
import * as ts from "typescript";
import { Module } from "./ts-elements";
import { Analyser } from "./ts-analyser";
import { UmlBuilder } from "./uml-builder";
import { DiagramOutputType } from "./diagramOutputType";
import { ICouplingConfig } from "./tsviz-app";

const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
    noEmitOnError: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.AMD
};

export class Parser {
    private results: string[];
    private currentFileIndex: number;
    private filesInCurrentDirectory: string[];

    public constructor(private isRecursive: boolean = false) {
        this.results = new Array<string>();
        this.currentFileIndex = 0;
    }

    private walk(currentDirectory: string): string[] {
        /* Source: http://stackoverflow.com/a/5827895 */
        this.filesInCurrentDirectory = readdirSync(currentDirectory);
        this.next(currentDirectory);
        return this.results;
    }

    private next(currentDirectory: string): string[] {
        let currentFile = this.filesInCurrentDirectory[this.currentFileIndex++];
        if (!currentFile) {
            return this.results;
        }
        currentFile = currentDirectory + '/' + currentFile;
        let stat = statSync(currentFile);

        if (stat && stat.isDirectory()) {
            if (this.isRecursive) {
                this.results.concat(this.walk(currentFile));
                this.next(currentDirectory);
            }
        } else {
            this.results.push(currentFile);
            this.next(currentDirectory);
        }
    }

    private getFiles(targetPath: string): string[] {
        let fileNames: string[] = new Array<string>();
        if (existsSync(targetPath)) {
            if (lstatSync(targetPath).isDirectory()) {
                fileNames = fileNames.concat(this.walk(targetPath));
            } else {
                fileNames.push(targetPath);
            }
        } else {
            console.error("'" + targetPath + "' does not exist");
        }

        return fileNames;
    }

    public getModules(targetPath: string): Module[] {
        let originalDir = process.cwd();
        let fileNames = this.getFiles(targetPath);
        // analyse sources
        const setParentNodes = true;
        let compilerHost = ts.createCompilerHost(DEFAULT_COMPILER_OPTIONS, setParentNodes);
        let program = ts.createProgram(fileNames, DEFAULT_COMPILER_OPTIONS, compilerHost);
        const analyser = new Analyser(program);
        let modules = program.getSourceFiles()
            .filter(f => f.fileName.lastIndexOf(".d.ts") !== f.fileName.length - ".d.ts".length)
            .map(sourceFile => analyser.collectInformation(sourceFile));

        // go back to the original dir
        process.chdir(originalDir);

        console.log("Found " + modules.length + " module(s)");

        return modules;
    }
}

export function createGraph(targetPath: string, outputFilename: string, dependenciesOnly: boolean, recursive: boolean, outputType: DiagramOutputType, couplingConfig: ICouplingConfig) {
    const visualiser = new Parser(recursive);
    const modules = visualiser.getModules(targetPath);
    const modulesToIgnore = ["app\.module", ".*\.spec"];
    const dependenciesToIgnore = ["@", "three", "inversify.*", "express"];
    const umlBuilder = new UmlBuilder(outputType, modulesToIgnore, dependenciesToIgnore, couplingConfig);
    umlBuilder.outputUmlDiagram(modules, outputFilename, dependenciesOnly);
}