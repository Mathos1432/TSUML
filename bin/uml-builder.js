"use strict";
var graphviz = require("graphviz");
var ts_elements_1 = require("./ts-elements");
var extensions_1 = require("./extensions");
var diagramOutputType_1 = require("./diagramOutputType");
var FONT_SIZE_KEY = "fontsize";
var FONT_SIZE = 12;
var FONT_NAME_KEY = "fontname";
var FONT_NAME = "Verdana";
var LAYOUT_KEY = "layout";
var LAYOUT_TYPE = "sfdp";
var OVERLAP_KEY = "overlap";
var OVERLAP_TYPE = "scale";
var UmlBuilder = (function () {
    function UmlBuilder(outputType, modulesToIgnore, dependenciesToIgnore) {
        this.outputType = outputType;
        this.modulesToIgnore = modulesToIgnore;
        this.dependenciesToIgnore = dependenciesToIgnore;
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
        this.graph.set(LAYOUT_KEY, LAYOUT_TYPE);
        this.graph.set(OVERLAP_KEY, OVERLAP_TYPE);
        this.graph.set(FONT_SIZE_KEY, FONT_SIZE);
        this.graph.set(FONT_NAME_KEY, FONT_NAME);
        this.graph.setEdgeAttribut(FONT_SIZE_KEY, FONT_SIZE);
        this.graph.setEdgeAttribut(FONT_NAME_KEY, FONT_NAME);
        this.graph.setNodeAttribut(FONT_SIZE_KEY, FONT_SIZE);
        this.graph.setNodeAttribut(FONT_NAME_KEY, FONT_NAME);
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
                if (d.name[0] !== "@" && module.name !== "app.module" && d.name !== "three" && d.name !== "inversify") {
                    var edge = graph.addEdge(module.name, _this.getGraphNodeId("", d.name));
                    var targetNode = edge.nodeTwo;
                    if (!_this.nodes[targetNode.id]) {
                        _this.nodes[targetNode.id] = {
                            node: targetNode, count: 0
                        };
                    }
                    _this.nodes[targetNode.id].count++;
                    if (_this.nodes[targetNode.id].count >= 5) {
                        targetNode.set("color", "orange");
                        targetNode.set("style", "filled");
                    }
                    if (_this.nodes[targetNode.id].count >= 9) {
                        targetNode.set("color", "red");
                    }
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
    UmlBuilder.prototype.buildClass = function (classDef, graph, path) {
        var _this = this;
        var methodsSignatures = this.combineSignatures(classDef.methods, this.getMethodSignature);
        var propertiesSignatures = this.combineSignatures(classDef.properties, this.getPropertySignature);
        var classNode = graph.addNode(this.getGraphNodeId(path, classDef.name), {
            "label": "{" + [classDef.name, methodsSignatures, propertiesSignatures].filter(function (e) { return e.length > 0; }).join("|") + "}"
        });
        if (classDef.extends) {
            graph.addEdge(classNode, classDef.extends.parts.reduce(function (path, name) { return _this.getGraphNodeId(path, name); }, ""), { "arrowhead": "onormal" });
        }
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
