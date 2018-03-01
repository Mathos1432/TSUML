"use strict";
var graphviz = require("graphviz");
var ts_elements_1 = require("./ts-elements");
var extensions_1 = require("./extensions");
var diagramOutputType_1 = require("./diagramOutputType");
var config_1 = require("./config");
var UmlBuilder = (function () {
    function UmlBuilder(outputType, modulesToIgnore, dependenciesToIgnore, couplingConfig) {
        this.outputType = outputType;
        this.modulesToIgnore = modulesToIgnore;
        this.dependenciesToIgnore = dependenciesToIgnore;
        this.couplingConfig = couplingConfig;
        this.nodes = {};
        this.initialiseGraphSettings();
    }
    UmlBuilder.prototype.outputUmlDiagram = function (modules, outputFilename, dependenciesOnly) {
        var _this = this;
        modules.forEach(function (module) {
            _this.buildModule(module, _this.graph, module.path, 0, dependenciesOnly);
        });
        if (process.platform === "win32") {
            var pathVariable = process.env["PATH"];
            if (pathVariable.indexOf("Graphviz") === -1) {
                console.warn("Could not find Graphviz in PATH.");
            }
        }
        this.graph.output(diagramOutputType_1.DiagramOutputType[this.outputType].toLowerCase(), outputFilename);
    };
    UmlBuilder.prototype.initialiseGraphSettings = function () {
        this.graph = graphviz.digraph("G");
        this.graph.set(config_1.LAYOUT_KEY, config_1.LAYOUT_TYPE);
        this.graph.set(config_1.OVERLAP_KEY, config_1.OVERLAP_TYPE);
        this.graph.set(config_1.FONT_SIZE_KEY, config_1.FONT_SIZE);
        this.graph.set(config_1.FONT_NAME_KEY, config_1.FONT_NAME);
        this.graph.setEdgeAttribut(config_1.FONT_SIZE_KEY, config_1.FONT_SIZE);
        this.graph.setEdgeAttribut(config_1.FONT_NAME_KEY, config_1.FONT_NAME);
        this.graph.setNodeAttribut(config_1.FONT_SIZE_KEY, config_1.FONT_SIZE);
        this.graph.setNodeAttribut(config_1.FONT_NAME_KEY, config_1.FONT_NAME);
        this.graph.setNodeAttribut("shape", "record");
    };
    UmlBuilder.prototype.buildModule = function (module, graph, path, level, dependenciesOnly) {
        var _this = this;
        var ModulePrefix = "cluster_";
        var moduleId = this.getGraphNodeId(path, module.name);
        var cluster = graph.addCluster("\"" + ModulePrefix + moduleId + "\"");
        cluster.set("label", (module.visibility !== ts_elements_1.Visibility.Public ? UmlBuilder.visibilityToString(module.visibility) + " " : "") + module.name);
        cluster.set("style", "filled");
        cluster.set("color", "gray" + Math.max(40, (95 - (level * 6))));
        if (dependenciesOnly) {
            extensions_1.Collections.distinct(module.dependencies, function (d) { return d.name; }).forEach(function (d) {
                if (_this.shouldEdgeBeIgnored(module.name, d.name)) {
                    var edge = graph.addEdge(module.name, _this.getGraphNodeId("", d.name));
                    _this.checkImportCount(edge.nodeTwo);
                }
            });
        }
        else {
            var moduleMethods = this.combineSignatures(module.methods, this.getMethodSignature);
            if (moduleMethods) {
                cluster.addNode(this.getGraphNodeId(path, module.name), {
                    "label": moduleMethods,
                    "shape": "none"
                });
            }
            module.modules.forEach(function (childModule) {
                _this.buildModule(childModule, cluster, moduleId, level + 1, false);
            });
            module.classes.forEach(function (childClass) {
                _this.buildClass(childClass, cluster, moduleId);
            });
        }
    };
    UmlBuilder.prototype.shouldEdgeBeIgnored = function (moduleName, dependencyName) {
        return !this.stringIsInArray(this.dependenciesToIgnore, dependencyName)
            && !this.stringIsInArray(this.modulesToIgnore, moduleName);
    };
    UmlBuilder.prototype.stringIsInArray = function (array, value) {
        return array.some(function (element) { if (value.match(element) !== null) {
            return true;
        } });
    };
    UmlBuilder.prototype.checkImportCount = function (targetNode) {
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
    };
    UmlBuilder.prototype.buildClass = function (classDef, graph, path) {
        var methodsSignatures = this.combineSignatures(classDef.methods, this.getMethodSignature);
        var propertiesSignatures = this.combineSignatures(classDef.properties, this.getPropertySignature);
        var classNode = this.buildClassNode(graph, path, classDef, methodsSignatures, propertiesSignatures);
        this.buildExtendsEdge(classDef, graph, classNode);
    };
    UmlBuilder.prototype.buildExtendsEdge = function (classDef, graph, classNode) {
        var _this = this;
        if (classDef.extends) {
            var targetNode = classDef.extends.parts.reduce(function (path, name) { return _this.getGraphNodeId(path, name); }, "");
            var attributes = { "arrowhead": "onormal" };
            graph.addEdge(classNode, targetNode, attributes);
        }
    };
    UmlBuilder.prototype.buildClassNode = function (graph, path, classDef, methodsSignatures, propertiesSignatures) {
        var sourceNodeId = this.getGraphNodeId(path, classDef.name);
        var label = [classDef.name, methodsSignatures, propertiesSignatures].filter(function (e) { return e.length > 0; }).join("|");
        var attributes = { "label": "{" + label + "}" };
        return graph.addNode(sourceNodeId, attributes);
    };
    UmlBuilder.prototype.combineSignatures = function (elements, map) {
        return elements.filter(function (e) { return e.visibility == ts_elements_1.Visibility.Public; })
            .map(function (e) { return map(e) + "\\l"; })
            .join("");
    };
    UmlBuilder.prototype.getMethodSignature = function (method) {
        return [
            UmlBuilder.visibilityToString(method.visibility),
            UmlBuilder.lifetimeToString(method.lifetime),
            method.name + "()"
        ].join(" ");
    };
    UmlBuilder.prototype.getPropertySignature = function (property) {
        return [
            UmlBuilder.visibilityToString(property.visibility),
            UmlBuilder.lifetimeToString(property.lifetime),
            [
                (property.hasGetter ? "get" : null),
                (property.hasSetter ? "set" : null)
            ].filter(function (v) { return v !== null; }).join("/"),
            property.name
        ].join(" ");
    };
    UmlBuilder.prototype.getGraphNodeId = function (path, name) {
        return ((path ? path + "/" : "") + name).replace(/\//g, "|");
    };
    UmlBuilder.visibilityToString = function (visibility) {
        switch (visibility) {
            case ts_elements_1.Visibility.Public:
                return "+";
            case ts_elements_1.Visibility.Protected:
                return "~";
            case ts_elements_1.Visibility.Private:
                return "-";
        }
    };
    UmlBuilder.lifetimeToString = function (lifetime) {
        return lifetime === ts_elements_1.Lifetime.Static ? "\\<static\\>" : "";
    };
    return UmlBuilder;
}());
exports.UmlBuilder = UmlBuilder;
