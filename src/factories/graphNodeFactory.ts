/// <reference path="../typings/graphviz/graphviz.d.ts"/>

import * as graphviz from "graphviz";
import { Class, Element, Property, Method, Visibility, Enum, Module, EnumMember, Interface } from "../ts-elements";
import { Graph } from "graphviz";
import { UmlBuilder } from "../uml-builder";

export class GraphNodeFactory {

    public create(element: Element, graph: graphviz.Graph, path: string): graphviz.Node {
        if (element instanceof Class) {
            return this.createClassNode(element as Class, graph, path)
        } else if (element instanceof Interface) {
            console.error("Instanciation of interfaces hasn't been implemented yet.");
        } else if (element instanceof Enum) {
            return this.createEnumNode(element as Enum, graph, path);
        } else {
            throw new Error("The factory can't handle creation of " + element.name);
        }
    }

    private createEnumNode(enumDef: Enum, graph: graphviz.Graph, path: string): graphviz.Node {
        const sourceNodeId = UmlBuilder.getGraphNodeId(path, enumDef.name);
        const members = enumDef.members.map(m => m.name + "\\l").join("");
        const label = [enumDef.name, members].filter(e => e.length > 0).join("|");
        const attributes = { "label": "{" + label + "}" };
        return graph.addNode(sourceNodeId, attributes);
    }

    private createClassNode(classDefinition: Class, graph: graphviz.Graph, path: string): graphviz.Node {
        let methodsSignatures = this.combineSignatures(classDefinition.methods, this.getMethodSignature);
        let propertiesSignatures = this.combineSignatures(classDefinition.properties, this.getPropertySignature);
        let classNode = this.buildClassNode(graph, path, classDefinition, methodsSignatures, propertiesSignatures);
        if (classDefinition.extends) {
            // add inheritance arrow
            const targetNode = classDefinition.extends.parts.reduce((path, name) => UmlBuilder.getGraphNodeId(path, name), "");
            const attributes = { "arrowhead": "onormal" };
            graph.addEdge(classNode, targetNode, attributes);
        }
        const sourceNodeId = UmlBuilder.getGraphNodeId(path, classDefinition.name);
        const label = [classDefinition.name, methodsSignatures, propertiesSignatures].filter(e => e.length > 0).join("|");
        const attributes = { "label": "{" + label + "}" };
        return graph.addNode(sourceNodeId, attributes);
    }

    private buildClassNode(graph: graphviz.Graph, path: string, classDefinition: Class, methodsSignatures: string, propertiesSignatures: string) {
        const sourceNodeId = UmlBuilder.getGraphNodeId(path, classDefinition.name);
        const label = [classDefinition.name, methodsSignatures, propertiesSignatures].filter(e => e.length > 0).join("|");
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

}