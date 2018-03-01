/// <reference path="../typings/graphviz/graphviz.d.ts"/>

import * as graphviz from "graphviz";
import { Class, Element, Property, Method, Visibility } from "../ts-elements";
import { Graph } from "graphviz";
import { UmlBuilder } from "../uml-builder";

export class ClassNodeFactory {
    public create(classDefinition: Class, graph: graphviz.Graph, path: string): graphviz.Node {
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