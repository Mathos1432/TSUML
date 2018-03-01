"use strict";
var graphviz = require("graphviz");
var ts_elements_1 = require("./ts-elements");
var extensions_1 = require("./extensions");
var diagramOutputType_1 = require("./diagramOutputType");
var config_1 = require("./config");
var classNodeFactory_1 = require("./factories/classNodeFactory");
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
        var classNodeFactory = new classNodeFactory_1.ClassNodeFactory();
        var moduleId = UmlBuilder.getGraphNodeId(path, module.name);
        var cluster = graph.addCluster("\"" + ModulePrefix + moduleId + "\"");
        cluster.set("label", (module.visibility !== ts_elements_1.Visibility.Public ? UmlBuilder.visibilityToString(module.visibility) + " " : "") + module.name);
        cluster.set("style", "filled");
        cluster.set("color", "gray" + Math.max(40, (95 - (level * 6))));
        if (dependenciesOnly) {
            extensions_1.Collections.distinct(module.dependencies, function (d) { return d.name; }).forEach(function (d) {
                if (_this.shouldEdgeBeIgnored(module.name, d.name)) {
                    var edge = graph.addEdge(module.name, UmlBuilder.getGraphNodeId("", d.name));
                    _this.checkImportCount(edge.nodeTwo);
                }
            });
        }
        else {
            var moduleMethods = this.combineSignatures(module.methods, this.getMethodSignature);
            if (moduleMethods) {
                cluster.addNode(UmlBuilder.getGraphNodeId(path, module.name), {
                    "label": moduleMethods,
                    "shape": "none"
                });
            }
            module.modules.forEach(function (childModule) {
                _this.buildModule(childModule, cluster, moduleId, level + 1, false);
            });
            module.classes.forEach(function (childClass) {
                classNodeFactory.create(childClass, cluster, moduleId);
            });
            module.enums.forEach(function (childEnum) {
                _this.buildEnum(childEnum, cluster, moduleId);
            });
        }
    };
    UmlBuilder.prototype.buildEnum = function (enumDef, graph, path) {
        var sourceNodeId = UmlBuilder.getGraphNodeId(path, enumDef.name);
        var members = enumDef.members.map(function (m) { return m.name + "\\l"; }).join("");
        var label = [enumDef.name, members].filter(function (e) { return e.length > 0; }).join("|");
        var attributes = { "label": "{" + label + "}" };
        var enumNode = graph.addNode(sourceNodeId, attributes);
    };
    UmlBuilder.prototype.shouldEdgeBeIgnored = function (moduleName, dependencyName) {
        return !UmlBuilder.stringIsInArray(this.dependenciesToIgnore, dependencyName)
            && !UmlBuilder.stringIsInArray(this.modulesToIgnore, moduleName);
    };
    UmlBuilder.stringIsInArray = function (array, value) {
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
    UmlBuilder.getGraphNodeId = function (path, name) {
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
