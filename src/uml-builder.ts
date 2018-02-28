/// <reference path="typings/graphviz/graphviz.d.ts"/>

import * as graphviz from "graphviz";
import { Element, Module, Class, Method, Property, Visibility, QualifiedName, Lifetime } from "./ts-elements";
import { Collections } from "./extensions";

const FONT_SIZE_KEY = "fontsize";
const FONT_SIZE = 12;
const FONT_NAME_KEY = "fontname";
const FONT_NAME = "Verdana";

export enum DiagramOutputType {
    SVG,
    PNG
}

export class UmlBuilder {
    private graph: graphviz.Graph;
    private outputType: DiagramOutputType;

    public constructor(outputType: DiagramOutputType) {
        // set diagram default styles
        this.graph = graphviz.digraph("G");
        this.graph.set(FONT_SIZE_KEY, FONT_SIZE);
        // this.graph.set("pack", false);
        this.graph.set("layout", "sfdp");
        this.graph.set("overlap", "scale");
        this.graph.set(FONT_NAME_KEY, FONT_NAME);
        this.graph.setEdgeAttribut(FONT_SIZE_KEY, FONT_SIZE);
        this.graph.setEdgeAttribut(FONT_NAME_KEY, FONT_NAME);
        this.graph.setNodeAttribut(FONT_SIZE_KEY, FONT_SIZE);
        this.graph.setNodeAttribut(FONT_NAME_KEY, FONT_NAME);
        this.graph.setNodeAttribut("shape", "record");
        this.outputType = outputType;
    }

    public build(modules: Module[], outputFilename: string, dependenciesOnly: boolean) {
        modules.forEach(module => {
            this.buildModule(module, this.graph, module.path, 0, dependenciesOnly);
        });

        if (process.platform === "win32") {
            let pathVariable = <string>process.env["PATH"];
            if (pathVariable.indexOf("Graphviz") === -1) {
                console.warn("Could not find Graphviz in PATH.");
            }
        }

        // Generate a PNG/SVG output
        this.graph.output({
            type: DiagramOutputType[this.outputType].toLowerCase()//,
            // use: "circo"
            // use: "sfdp"
        } as graphviz.RenderOptions, outputFilename);
    }

    private buildModule(module: Module, graph: graphviz.Graph, path: string, level: number, dependenciesOnly: boolean) {
        const ModulePrefix = "cluster_";

        let moduleId = this.getGraphNodeId(path, module.name);
        let cluster = graph.addCluster("\"" + ModulePrefix + moduleId + "\"");

        cluster.set("label", (module.visibility !== Visibility.Public ? UmlBuilder.visibilityToString(module.visibility) + " " : "") + module.name);
        // cluster.set("style", "filled");
        // cluster.set("color", "gray" + Math.max(40, (95 - (level * 6))));

        if (dependenciesOnly) {
            Collections.distinct(module.dependencies, d => d.name).forEach(d => {
                if (d.name[0] !== "@" && module.name !== "app.module" && d.name !== "three" && d.name !== "inversify") {
                    graph.addEdge(module.name, this.getGraphNodeId("", d.name));
                }
            });
        } else {
            let moduleMethods = this.combineSignatures(module.methods, this.getMethodSignature);
            if (moduleMethods) {
                cluster.addNode(
                    this.getGraphNodeId(path, module.name),
                    {
                        "label": moduleMethods,
                        "shape": "none"
                    });
            }

            module.modules.forEach(childModule => {
                this.buildModule(childModule, cluster, moduleId, level + 1, false);
            });

            module.classes.forEach(childClass => {
                this.buildClass(childClass, cluster, moduleId);
            });
        }
    }

    private buildClass(classDef: Class, graph: graphviz.Graph, path: string) {
        let methodsSignatures = this.combineSignatures(classDef.methods, this.getMethodSignature);
        let propertiesSignatures = this.combineSignatures(classDef.properties, this.getPropertySignature);

        let classNode = graph.addNode(
            this.getGraphNodeId(path, classDef.name),
            {
                "label": "{" + [classDef.name, methodsSignatures, propertiesSignatures].filter(e => e.length > 0).join("|") + "}"
            });

        if (classDef.extends) {
            // add inheritance arrow
            graph.addEdge(
                classNode,
                classDef.extends.parts.reduce((path, name) => this.getGraphNodeId(path, name), ""),
                { "arrowhead": "onormal" }
            );
        }

    }

    private combineSignatures<T extends Element>(elements: T[], map: (e: T) => string): string {
        return elements.filter(e => e.visibility == Visibility.Public)
            .map(e => map(e) + "\\l")
            .join("");
    }

    private getMethodSignature(method: Method): string {
        return [
            UmlBuilder.visibilityToString(method.visibility),
            UmlBuilder.lifetimeToString(method.lifetime),
            method.name + "()"
        ].join(" ");
    }

    private getPropertySignature(property: Property): string {
        return [
            UmlBuilder.visibilityToString(property.visibility),
            UmlBuilder.lifetimeToString(property.lifetime),
            [
                (property.hasGetter ? "get" : null),
                (property.hasSetter ? "set" : null)
            ].filter(v => v !== null).join("/"),
            property.name
        ].join(" ");
    }

    private static visibilityToString(visibility: Visibility) {
        switch (visibility) {
            case Visibility.Public:
                return "+";
            case Visibility.Protected:
                return "~";
            case Visibility.Private:
                return "-";
        }
    }

    private static lifetimeToString(lifetime: Lifetime) {
        return lifetime === Lifetime.Static ? "\\<static\\>" : "";
    }

    private getGraphNodeId(path: string, name: string): string {
        return ((path ? path + "/" : "") + name).replace(/\//g, "|");
    }
}