/// <reference path="typings/graphviz/graphviz.d.ts"/>

import * as graphviz from "graphviz";
import { Element, Module, Class, Method, Property, Visibility, QualifiedName, Lifetime, Enum } from "./ts-elements";
import { Collections } from "./extensions";
import { DiagramOutputType } from "./diagramOutputType";
import { LAYOUT_KEY, OVERLAP_KEY, FONT_SIZE_KEY, FONT_NAME_KEY, LAYOUT_TYPE, OVERLAP_TYPE, FONT_SIZE, FONT_NAME } from "./config";
import { ICouplingConfig } from "./tsviz-app";
import { GraphNodeFactory } from "./factories/graphNodeFactory";

export class UmlBuilder {
    private graph: graphviz.Graph;
    private nodes: {
        [id: string]: {
            count: number,
            node: graphviz.Node
        }
    }

    public constructor(
        private outputType: DiagramOutputType,
        private modulesToIgnore: string[],
        private dependenciesToIgnore: string[],
        private couplingConfig: ICouplingConfig) {

        this.nodes = {};
        this.initialiseGraphSettings()
    }

    public outputUmlDiagram(modules: Module[], outputFilename: string, dependenciesOnly: boolean) {
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
        this.graph.output(DiagramOutputType[this.outputType].toLowerCase(), outputFilename);
    }

    private initialiseGraphSettings() {
        this.graph = graphviz.digraph("G");
        this.graph.set(LAYOUT_KEY, LAYOUT_TYPE);
        this.graph.set(OVERLAP_KEY, OVERLAP_TYPE);
        this.graph.set(FONT_SIZE_KEY, FONT_SIZE);
        this.graph.set(FONT_NAME_KEY, FONT_NAME);
        this.graph.setEdgeAttribut(FONT_SIZE_KEY, FONT_SIZE);
        this.graph.setEdgeAttribut(FONT_NAME_KEY, FONT_NAME);
        this.graph.setNodeAttribut(FONT_SIZE_KEY, FONT_SIZE);
        this.graph.setNodeAttribut(FONT_NAME_KEY, FONT_NAME);
        this.graph.setNodeAttribut("shape", "record");
    }

    private buildModule(module: Module, graph: graphviz.Graph, path: string, level: number, dependenciesOnly: boolean) {
        const ModulePrefix = "cluster_";
        const graphNodeFactory = new GraphNodeFactory();
        let moduleId = UmlBuilder.getGraphNodeId(path, module.name);
        let cluster = graph.addCluster("\"" + ModulePrefix + moduleId + "\"");

        cluster.set("label", (module.visibility !== Visibility.Public ? UmlBuilder.visibilityToString(module.visibility) + " " : "") + module.name);
        cluster.set("style", "filled");
        cluster.set("color", "gray" + Math.max(40, (95 - (level * 6))));

        if (dependenciesOnly) {
            Collections.distinct(module.dependencies, d => d.name).forEach(d => {
                if (this.shouldEdgeBeIgnored(module.name, d.name)) {
                    const edge = graph.addEdge(module.name, UmlBuilder.getGraphNodeId("", d.name));
                    this.checkImportCount((edge as any).nodeTwo);
                }
            });
        } else {
            let moduleMethods = this.combineSignatures(module.methods, this.getMethodSignature);
            if (moduleMethods) {
                const attributes = {
                    "label": moduleMethods,
                    "shape": "none"
                };
                cluster.addNode(UmlBuilder.getGraphNodeId(path, module.name), attributes);
            }

            module.modules.forEach(childModule => {
                this.buildModule(childModule, cluster, moduleId, level + 1, false);
            });

            module.classes.forEach(childClass => {
                graphNodeFactory.create(childClass, cluster, moduleId);
            });

            module.enums.forEach(childEnum => {
                graphNodeFactory.create(childEnum, cluster, moduleId);
            });
        }
    }

    private shouldEdgeBeIgnored(moduleName: string, dependencyName: string): boolean {
        return !UmlBuilder.stringIsInArray(this.dependenciesToIgnore, dependencyName)
            && !UmlBuilder.stringIsInArray(this.modulesToIgnore, moduleName);
    }

    private static stringIsInArray(array: string[], value: string): boolean {
        return array.some((element: string) => { if (value.match(element) !== null) { return true; } })
    }

    private checkImportCount(targetNode: any): void {
        if (!this.nodes[targetNode.id]) {
            this.nodes[targetNode.id] = {
                node: targetNode, count: 0
            };
        }
        this.nodes[targetNode.id].count++;
        if (this.nodes[targetNode.id].count >= this.couplingConfig.warning) {
            targetNode.set("color", "orange");
            targetNode.set("style", "filled");
        }
        if (this.nodes[targetNode.id].count >= this.couplingConfig.problem) {
            targetNode.set("color", "red");
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

    public static getGraphNodeId(path: string, name: string): string {
        return ((path ? path + "/" : "") + name).replace(/\//g, "|");
    }

    public static visibilityToString(visibility: Visibility) {
        switch (visibility) {
            case Visibility.Public:
                return "+";
            case Visibility.Protected:
                return "~";
            case Visibility.Private:
                return "-";
        }
    }

    public static lifetimeToString(lifetime: Lifetime) {
        return lifetime === Lifetime.Static ? "\\<static\\>" : "";
    }
}