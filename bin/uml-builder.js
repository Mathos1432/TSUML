"use strict";
var graphviz = require("graphviz");
var ts_elements_1 = require("./ts-elements");
var extensions_1 = require("./extensions");
var FONT_SIZE_KEY = "fontsize";
var FONT_SIZE = 12;
var FONT_NAME_KEY = "fontname";
var FONT_NAME = "Verdana";
(function (DiagramOutputType) {
    DiagramOutputType[DiagramOutputType["SVG"] = 0] = "SVG";
    DiagramOutputType[DiagramOutputType["PNG"] = 1] = "PNG";
})(exports.DiagramOutputType || (exports.DiagramOutputType = {}));
var DiagramOutputType = exports.DiagramOutputType;
var UmlBuilder = (function () {
    function UmlBuilder(outputType) {
        this.graph = graphviz.digraph("G");
        this.graph.set(FONT_SIZE_KEY, FONT_SIZE);
        this.graph.set("pack", false);
        this.graph.set(FONT_NAME_KEY, FONT_NAME);
        this.graph.setEdgeAttribut(FONT_SIZE_KEY, FONT_SIZE);
        this.graph.setEdgeAttribut(FONT_NAME_KEY, FONT_NAME);
        this.graph.setNodeAttribut(FONT_SIZE_KEY, FONT_SIZE);
        this.graph.setNodeAttribut(FONT_NAME_KEY, FONT_NAME);
        this.graph.setNodeAttribut("shape", "record");
        this.outputType = outputType;
    }
    UmlBuilder.prototype.build = function (modules, outputFilename, dependenciesOnly) {
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
        this.graph.output({
            type: DiagramOutputType[this.outputType].toLowerCase(),
            use: "fdp"
        }, outputFilename);
    };
    UmlBuilder.prototype.buildModule = function (module, graph, path, level, dependenciesOnly) {
        var _this = this;
        var ModulePrefix = "cluster_";
        var moduleId = this.getGraphNodeId(path, module.name);
        var cluster = graph.addCluster("\"" + ModulePrefix + moduleId + "\"");
        cluster.set("label", (module.visibility !== ts_elements_1.Visibility.Public ? this.visibilityToString(module.visibility) + " " : "") + module.name);
        if (dependenciesOnly) {
            extensions_1.Collections.distinct(module.dependencies, function (d) { return d.name; }).forEach(function (d) {
                graph.addEdge(module.name, _this.getGraphNodeId("", d.name));
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
    UmlBuilder.prototype.buildClass = function (classDef, g, path) {
        var _this = this;
        var methodsSignatures = this.combineSignatures(classDef.methods, this.getMethodSignature);
        var propertiesSignatures = this.combineSignatures(classDef.properties, this.getPropertySignature);
        var classNode = g.addNode(this.getGraphNodeId(path, classDef.name), {
            "label": "{" + [classDef.name, methodsSignatures, propertiesSignatures].filter(function (e) { return e.length > 0; }).join("|") + "}"
        });
        if (classDef.extends) {
            g.addEdge(classNode, classDef.extends.parts.reduce(function (path, name) { return _this.getGraphNodeId(path, name); }, ""), { "arrowhead": "onormal" });
        }
    };
    UmlBuilder.prototype.combineSignatures = function (elements, map) {
        return elements.filter(function (e) { return e.visibility == ts_elements_1.Visibility.Public; })
            .map(function (e) { return map(e) + "\\l"; })
            .join("");
    };
    UmlBuilder.prototype.getMethodSignature = function (method) {
        return [
            this.visibilityToString(method.visibility),
            this.lifetimeToString(method.lifetime),
            this.getName(method) + "()"
        ].join(" ");
    };
    UmlBuilder.prototype.getPropertySignature = function (property) {
        return [
            this.visibilityToString(property.visibility),
            this.lifetimeToString(property.lifetime),
            [
                (property.hasGetter ? "get" : null),
                (property.hasSetter ? "set" : null)
            ].filter(function (v) { return v !== null; }).join("/"),
            this.getName(property)
        ].join(" ");
    };
    UmlBuilder.prototype.visibilityToString = function (visibility) {
        switch (visibility) {
            case ts_elements_1.Visibility.Public:
                return "+";
            case ts_elements_1.Visibility.Protected:
                return "~";
            case ts_elements_1.Visibility.Private:
                return "-";
        }
    };
    UmlBuilder.prototype.lifetimeToString = function (lifetime) {
        return lifetime === ts_elements_1.Lifetime.Static ? "\\<static\\>" : "";
    };
    UmlBuilder.prototype.getName = function (element) {
        return element.name;
    };
    UmlBuilder.prototype.getGraphNodeId = function (path, name) {
        var result = ((path ? path + "/" : "") + name).replace(/\//g, "|");
        return result;
    };
    return UmlBuilder;
}());
exports.UmlBuilder = UmlBuilder;
