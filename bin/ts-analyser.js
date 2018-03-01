"use strict";
var ts = require("typescript");
var path = require("path");
var ts_elements_1 = require("./ts-elements");
var extensions_1 = require("./extensions");
var Analyser = (function () {
    function Analyser(program) {
        this.typeChecker = program.getTypeChecker();
    }
    Analyser.prototype.collectInformation = function (sourceFile) {
        var filename = sourceFile.fileName;
        filename = filename.substr(0, filename.lastIndexOf("."));
        var moduleName = path.basename(filename);
        var module = new ts_elements_1.Module(moduleName, null);
        module.path = path.dirname(filename);
        this.analyseNode(sourceFile, module);
        return module;
    };
    Analyser.prototype.analyseNode = function (currentNode, currentElement) {
        var _this = this;
        var childElement;
        var skipChildren = false;
        switch (currentNode.kind) {
            case 221:
                var moduleDeclaration = currentNode;
                childElement = new ts_elements_1.Module(moduleDeclaration.name.text, currentElement, this.getVisibility(currentNode));
                break;
            case 224:
                var importEqualDeclaration = currentNode;
                childElement = new ts_elements_1.ImportedModule(importEqualDeclaration.name.text, currentElement);
                break;
            case 225:
                var importDeclaration = currentNode;
                var moduleName = importDeclaration.moduleSpecifier.text;
                childElement = new ts_elements_1.ImportedModule(moduleName, currentElement);
                break;
            case 217:
                var classDeclaration = currentNode;
                var classDef = new ts_elements_1.Class(classDeclaration.name.text, currentElement, this.getVisibility(currentNode));
                if (classDeclaration.heritageClauses) {
                    var extendsClause = extensions_1.Collections.firstOrDefault(classDeclaration.heritageClauses, function (c) { return c.token === 83; });
                    if (extendsClause && extendsClause.types.length > 0) {
                        classDef.extends = this.getFullyQualifiedName(extendsClause.types[0]);
                    }
                }
                childElement = classDef;
                break;
            case 146:
            case 147:
            case 142:
                var propertyDeclaration = currentNode;
                var property = new ts_elements_1.Property(propertyDeclaration.name.text, currentElement, this.getVisibility(currentNode), this.getLifetime(currentNode));
                switch (currentNode.kind) {
                    case 146:
                        property.hasGetter = true;
                        break;
                    case 147:
                        property.hasSetter = true;
                }
                childElement = property;
                skipChildren = true;
                break;
            case 144:
            case 216:
                var functionDeclaration = currentNode;
                childElement = new ts_elements_1.Method(functionDeclaration.name.text, currentElement, this.getVisibility(currentNode), this.getLifetime(currentNode));
                skipChildren = true;
                break;
            case 220:
                var enumDeclaration = currentNode;
                childElement = new ts_elements_1.Enum(enumDeclaration.name.text, currentElement, this.getVisibility(currentNode), this.getLifetime(currentNode));
            case 250:
                var enumMemberDeclaration = currentNode;
                var member = new ts_elements_1.EnumMember(enumMemberDeclaration.name.text, currentElement, this.getVisibility(currentNode), this.getLifetime(currentNode));
                childElement = member;
        }
        if (childElement) {
            currentElement.addElement(childElement);
        }
        if (skipChildren) {
            return;
        }
        ts.forEachChild(currentNode, function (node) { return _this.analyseNode(node, childElement || currentElement); });
    };
    Analyser.prototype.getFullyQualifiedName = function (expression) {
        var symbol = this.typeChecker.getSymbolAtLocation(expression.expression);
        if (symbol) {
            var nameParts = this.typeChecker.getFullyQualifiedName(symbol).split(".");
            if (symbol.declarations.length > 0 && symbol.declarations[0].kind === 229) {
                var importSpecifier = symbol.declarations[0];
                var moduleName = importSpecifier.parent.parent.parent.moduleSpecifier.text;
                nameParts.unshift(moduleName);
            }
            else {
                if (nameParts.length > 0 && nameParts[0].indexOf("\"") === 0) {
                    var moduleName = nameParts[0].replace(/\"/g, "");
                    nameParts[0] = moduleName;
                }
            }
            return new ts_elements_1.QualifiedName(nameParts);
        }
        console.warn("Unable to resolve type: '" + expression.getText() + "'");
        return new ts_elements_1.QualifiedName(["unknown?"]);
    };
    Analyser.prototype.getVisibility = function (node) {
        if (node.modifiers) {
            if (this.hasModifierSet(node.modifiers.flags, 64)) {
                return ts_elements_1.Visibility.Protected;
            }
            else if (this.hasModifierSet(node.modifiers.flags, 32)) {
                return ts_elements_1.Visibility.Private;
            }
            else if (this.hasModifierSet(node.modifiers.flags, 16)) {
                return ts_elements_1.Visibility.Public;
            }
            else if (this.hasModifierSet(node.modifiers.flags, 1)) {
                return ts_elements_1.Visibility.Public;
            }
        }
        switch (node.parent.kind) {
            case 217:
                return ts_elements_1.Visibility.Public;
            case 221:
                return ts_elements_1.Visibility.Private;
        }
        return ts_elements_1.Visibility.Private;
    };
    Analyser.prototype.getLifetime = function (node) {
        if (node.modifiers) {
            if (this.hasModifierSet(node.modifiers.flags, 128)) {
                return ts_elements_1.Lifetime.Static;
            }
        }
        return ts_elements_1.Lifetime.Instance;
    };
    Analyser.prototype.hasModifierSet = function (value, modifier) {
        return (value & modifier) === modifier;
    };
    return Analyser;
}());
exports.Analyser = Analyser;
