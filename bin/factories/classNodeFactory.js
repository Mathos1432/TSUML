"use strict";
var ts_elements_1 = require("../ts-elements");
var uml_builder_1 = require("../uml-builder");
var ClassNodeFactory = (function () {
    function ClassNodeFactory() {
    }
    ClassNodeFactory.prototype.create = function (classDefinition, graph, path) {
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
    ClassNodeFactory.prototype.buildClassNode = function (graph, path, classDefinition, methodsSignatures, propertiesSignatures) {
        var sourceNodeId = uml_builder_1.UmlBuilder.getGraphNodeId(path, classDefinition.name);
        var label = [classDefinition.name, methodsSignatures, propertiesSignatures].filter(function (e) { return e.length > 0; }).join("|");
        var attributes = { "label": "{" + label + "}" };
        return graph.addNode(sourceNodeId, attributes);
    };
    ClassNodeFactory.prototype.combineSignatures = function (elements, map) {
        return elements.filter(function (e) { return e.visibility == ts_elements_1.Visibility.Public; })
            .map(function (e) { return map(e) + "\\l"; })
            .join("");
    };
    ClassNodeFactory.prototype.getMethodSignature = function (method) {
        return [
            uml_builder_1.UmlBuilder.visibilityToString(method.visibility),
            uml_builder_1.UmlBuilder.lifetimeToString(method.lifetime),
            method.name + "()"
        ].join(" ");
    };
    ClassNodeFactory.prototype.getPropertySignature = function (property) {
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
    return ClassNodeFactory;
}());
exports.ClassNodeFactory = ClassNodeFactory;
