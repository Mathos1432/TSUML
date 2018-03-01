import * as tsuml from "./tsuml";
import { DiagramOutputType } from "./diagramOutputType";

function main(args: string[]) {
    const switches = args.filter(a => a.indexOf("-") === 0);
    const nonSwitches = args.filter(a => a.indexOf("-") !== 0);

    if (nonSwitches.length < 1) {
        console.error(
            "Invalid number of arguments. Usage:\n" +
            "  <switches> <sources filename/directory> <output.png>\n" +
            "Available switches:\n" +
            "  -d, dependencies: produces the modules' dependencies diagram\n" +
            "  -r, recursive: include files in subdirectories (must be non-cyclic)" +
            "  -c, coupling: print classes with a high coupling in different colors." +
            "  -svg: output an svg file");
        return;
    }

    const targetPath = nonSwitches.length > 0 ? nonSwitches[0] : "";
    const outputFilename = nonSwitches.length > 1 ? nonSwitches[1] : "diagram.png";

    const dependenciesOnly = switches.indexOf("-d") >= 0 || switches.indexOf("-dependencies") >= 0; // dependencies or uml?
    const recursive = switches.indexOf("-r") >= 0 || switches.indexOf("-recursive") >= 0;
    const outputType = switches.indexOf("-svg") >= 0 ? DiagramOutputType.SVG : DiagramOutputType.PNG;

    const couplingConfig: ICouplingConfig = {
        active: switches.indexOf("-c") >= 0 || switches.indexOf("-coupling") >= 0,
        warning: 5,
        problem: 9
    }

    console.log("---------- Configuration ----------");
    console.log("|");
    console.log("| Sources location:    " + targetPath);
    console.log("| Ouput location:      " + outputFilename);
    console.log("| Dependencies only:   " + dependenciesOnly);
    console.log("| Recursive:           " + recursive);
    console.log("| Output type:         " + DiagramOutputType[outputType]);
    console.log("| Flag coupling:       " + couplingConfig.active);
    console.log("| Coupling Warning:    " + couplingConfig.warning);
    console.log("| Coupling Problem:    " + couplingConfig.problem);
    console.log("|");
    console.log("-----------------------------------");



    tsuml.createGraph(targetPath, outputFilename, dependenciesOnly, recursive, outputType, couplingConfig);

    console.log("Done");
}

export function run() {
    main(process.argv.slice(2));
}

export interface ICouplingConfig {
    active: boolean;
    warning: number;
    problem: number;
}