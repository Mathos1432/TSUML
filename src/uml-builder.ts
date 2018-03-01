/// <reference path="typings/graphviz/graphviz.d.ts"/>

import * as graphviz from "graphviz";
import { Element, Module, Class, Method, Property, Visibility, QualifiedName, Lifetime } from "./ts-elements";
import { Collections } from "./extensions";
import { DiagramOutputType } from "./diagramOutputType";
import { LAYOUT_KEY, OVERLAP_KEY, FONT_SIZE_KEY, FONT_NAME_KEY, LAYOUT_TYPE, OVERLAP_TYPE, FONT_SIZE, FONT_NAME } from "./config";

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
        private dependenciesToIgnore: string[]) {

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

        let moduleId = this.getGraphNodeId(path, module.name);
        let cluster = graph.addCluster("\"" + ModulePrefix + moduleId + "\"");

        cluster.set("label", (module.visibility !== Visibility.Public ? UmlBuilder.visibilityToString(module.visibility) + " " : "") + module.name);
        cluster.set("style", "filled");
        cluster.set("color", "gray" + Math.max(40, (95 - (level * 6))));

        if (dependenciesOnly) {
            Collections.distinct(module.dependencies, d => d.name).forEach(d => {

                if (this.shouldEdgeBeIgnored(module.name, d.name)) {
                    const edge = graph.addEdge(module.name, this.getGraphNodeId("", d.name));
                    this.checkImportCount((edge as any).nodeTwo);
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

    private shouldEdgeBeIgnored(moduleName: string, dependencyName: string): boolean {
        return !this.stringIsInArray(this.dependenciesToIgnore, dependencyName)
            && !this.stringIsInArray(this.modulesToIgnore, moduleName);
    }

    private stringIsInArray(array: string[], value: string): boolean {
        return array.some((element: string) => { if (value.match(element) !== null) { return true; } })
    }

    private checkImportCount(targetNode: any): void {
        if (!this.nodes[targetNode.id]) {
            this.nodes[targetNode.id] = {
                node: targetNode, count: 0
            };
        }
        this.nodes[targetNode.id].count++;
        if (this.nodes[targetNode.id].count >= 5) {
            targetNode.set("color", "orange");
            targetNode.set("style", "filled");
        }
        if (this.nodes[targetNode.id].count >= 9) {
            targetNode.set("color", "red");
        }
    }

    private buildClass(classDef: Class, graph: graphviz.Graph, path: string) {
        let methodsSignatures = this.combineSignatures(classDef.methods, this.getMethodSignature);
        let propertiesSignatures = this.combineSignatures(classDef.properties, this.getPropertySignature);
        let classNode = this.buildClassNode(graph, path, classDef, methodsSignatures, propertiesSignatures);
        this.buildExtendsEdge(classDef, graph, classNode);
    }

    private buildExtendsEdge(classDef: Class, graph: graphviz.Graph, classNode: graphviz.Node) {
        if (classDef.extends) {
            // add inheritance arrow
            const targetNode = classDef.extends.parts.reduce((path, name) => this.getGraphNodeId(path, name), "");
            const attributes = { "arrowhead": "onormal" };
            graph.addEdge(classNode, targetNode, attributes);
        }
    }

    private buildClassNode(graph: graphviz.Graph, path: string, classDef: Class, methodsSignatures: string, propertiesSignatures: string) {
        const sourceNodeId = this.getGraphNodeId(path, classDef.name);
        const label = [classDef.name, methodsSignatures, propertiesSignatures].filter(e => e.length > 0).join("|");
        const attributes = { "label": "{" + label + "}" };
        return graph.addNode(sourceNodeId, attributes);
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

    private getGraphNodeId(path: string, name: string): string {
        return ((path ? path + "/" : "") + name).replace(/\//g, "|");
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
}