"use strict";
var ts_elements_1 = require("../ts-elements");
var uml_builder_1 = require("../uml-builder");
var GraphNodeFactory = (function () {
    function GraphNodeFactory() {
    }
    GraphNodeFactory.prototype.create = function (element, graph, path, level, dependenciesOnly) {
        if (element instanceof ts_elements_1.Class) {
            return this.createClassNode(element, graph, path);
        }
        else if (element instanceof ts_elements_1.EnumMember) {
            return this.createEnumNode(element, graph, path);
        }
        else if (element instanceof ts_elements_1.Module) {
            if (level === undefined || dependenciesOnly === undefined) {
                throw new Error("To create a module node, the level and dependenciesOnly parameters are required.");
            }
            console.log("module");
        }
        else {
            throw new Error("The factory can't handle creation of " + element.name);
        }
        return {};
    };
    GraphNodeFactory.prototype.createEnumNode = function (enumDef, graph, path) {
        var sourceNodeId = uml_builder_1.UmlBuilder.getGraphNodeId(path, enumDef.name);
        var members = enumDef.members.map(function (m) { return m.name + "\\l"; }).join("");
        var label = [enumDef.name, members].filter(function (e) { return e.length > 0; }).join("|");
        var attributes = { "label": "{" + label + "}" };
        return graph.addNode(sourceNodeId, attributes);
    };
    GraphNodeFactory.prototype.createClassNode = function (classDefinition, graph, path) {
        var methodsSignatures = this.combineSignatures(classDefinition.methods, this.getMethodSignature);
        var propertiesSignatures = this.combineSignatures(classDefinition.properties, this.getPropertySignature);
        var classNode = this.buildClassNode(graph, path, classDefinition, methodsSignatures, propertiesSignatures);
        if (classDefinition.extends) {
            var targetNode = classDefinition.extends.parts.reduce(function (path, name) { return uml_builder_1.UmlBuilder.getGraphNodeId(path, name); }, "");
            var attributes_1 = { "arrowhead": "onormal" };
            graph.addEdge(classNode, targetNode, attributes_1);
        }
        var sourceNodeId = uml_builder_1.UmlBuilder.getGraphNodeId(path, classDefinition.name);
        var label = [classDefinition.name, methodsSignatures, propertiesSignatures].filter(function (e) { return e.length > 0; }).join("|");
        var attributes = { "label": "{" + label + "}" };
        return graph.addNode(sourceNodeId, attributes);
    };
    GraphNodeFactory.prototype.buildClassNode = function (graph, path, classDefinition, methodsSignatures, propertiesSignatures) {
        var sourceNodeId = uml_builder_1.UmlBuilder.getGraphNodeId(path, classDefinition.name);
        var label = [classDefinition.name, methodsSignatures, propertiesSignatures].filter(function (e) { return e.length > 0; }).join("|");
        var attributes = { "label": "{" + label + "}" };
        return graph.addNode(sourceNodeId, attributes);
    };
    GraphNodeFactory.prototype.combineSignatures = function (elements, map) {
        return elements.filter(function (e) { return e.visibility == ts_elements_1.Visibility.Public; })
            .map(function (e) { return map(e) + "\\l"; })
            .join("");
    };
    GraphNodeFactory.prototype.getMethodSignature = function (method) {
        return [
            uml_builder_1.UmlBuilder.visibilityToString(method.visibility),
            uml_builder_1.UmlBuilder.lifetimeToString(method.lifetime),
            method.name + "()"
        ].join(" ");
    };
    GraphNodeFactory.prototype.getPropertySignature = function (property) {
        return [
            uml_builder_1.UmlBuilder.visibilityToString(property.visibility),
            uml_builder_1.UmlBuilder.lifetimeToString(property.lifetime),
            [
                (property.hasGetter ? "get" : null),
                (property.hasSetter ? "set" : null)
            ].filter(function (v) { return v !== null; }).join("/"),
            property.name
        ].join(" ");
    };
    return GraphNodeFactory;
}());
exports.GraphNodeFactory = GraphNodeFactory;
