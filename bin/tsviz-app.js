"use strict";
var tsviz = require("./tsviz");
var diagramOutputType_1 = require("./diagramOutputType");
function main(args) {
    var switches = args.filter(function (a) { return a.indexOf("-") === 0; });
    var nonSwitches = args.filter(function (a) { return a.indexOf("-") !== 0; });
    if (nonSwitches.length < 1) {
        console.error("Invalid number of arguments. Usage:\n" +
            "  <switches> <sources filename/directory> <output.png>\n" +
            "Available switches:\n" +
            "  -d, dependencies: produces the modules' dependencies diagram\n" +
            "  -r, recursive: include files in subdirectories (must be non-cyclic)" +
            "  -c, coupling: print classes with a high coupling in different colors." +
            "  -svg: output an svg file");
        return;
    }
    var targetPath = nonSwitches.length > 0 ? nonSwitches[0] : "";
    var outputFilename = nonSwitches.length > 1 ? nonSwitches[1] : "diagram.png";
    var dependenciesOnly = switches.indexOf("-d") >= 0 || switches.indexOf("-dependencies") >= 0;
    var recursive = switches.indexOf("-r") >= 0 || switches.indexOf("-recursive") >= 0;
    var outputType = switches.indexOf("-svg") >= 0 ? diagramOutputType_1.DiagramOutputType.SVG : diagramOutputType_1.DiagramOutputType.PNG;
    var couplingConfig = {
        active: switches.indexOf("-c") >= 0 || switches.indexOf("-coupling") >= 0,
        warning: 5,
        problem: 9
    };
    console.log("---------- Configuration ----------");
    console.log("|");
    console.log("| Sources location:    " + targetPath);
    console.log("| Ouput location:      " + outputFilename);
    console.log("| Dependencies only:   " + dependenciesOnly);
    console.log("| Recursive:           " + recursive);
    console.log("| Output type:         " + diagramOutputType_1.DiagramOutputType[outputType]);
    console.log("| Flag coupling:       " + couplingConfig.active);
    console.log("| Coupling Warning:    " + couplingConfig.warning);
    console.log("| Coupling Problem:    " + couplingConfig.problem);
    console.log("|");
    console.log("-----------------------------------");
    tsviz.createGraph(targetPath, outputFilename, dependenciesOnly, recursive, outputType, couplingConfig);
    console.log("Done");
}
function run() {
    main(process.argv.slice(2));
}
exports.run = run;
