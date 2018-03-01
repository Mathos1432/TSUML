import * as ts from "typescript";
import * as path from "path";
import { Element, Module, Class, Method, ImportedModule, Property, Visibility, QualifiedName, Lifetime, Enum, EnumMember } from "./ts-elements";
import { Collections } from "./extensions";

export class Analyser {
    private typeChecker: ts.TypeChecker;
    public constructor(program: ts.Program) {
        this.typeChecker = program.getTypeChecker();
    }

    public collectInformation(sourceFile: ts.SourceFile): Module {
        let filename = sourceFile.fileName;
        filename = filename.substr(0, filename.lastIndexOf(".")); // filename without extension
        let moduleName = path.basename(filename); // get module filename without directory
        let module = new Module(moduleName, null);
        module.path = path.dirname(filename);
        this.analyseNode(sourceFile, module);
        return module;
    }

    private analyseNode(currentNode: ts.Node, currentElement: Element) {
        let childElement: Element;
        let skipChildren = false;

        switch (currentNode.kind) {
            case ts.SyntaxKind.ModuleDeclaration:
                let moduleDeclaration = <ts.ModuleDeclaration>currentNode;
                childElement = new Module(moduleDeclaration.name.text, currentElement, this.getVisibility(currentNode));
                break;

            case ts.SyntaxKind.ImportEqualsDeclaration:
                let importEqualDeclaration = (<ts.ImportEqualsDeclaration>currentNode);
                childElement = new ImportedModule(importEqualDeclaration.name.text, currentElement);
                break;

            case ts.SyntaxKind.ImportDeclaration:
                let importDeclaration = (<ts.ImportDeclaration>currentNode);
                let moduleName = (<ts.StringLiteral>importDeclaration.moduleSpecifier).text;
                childElement = new ImportedModule(moduleName, currentElement);
                break;
            case ts.SyntaxKind.ClassDeclaration:
                let classDeclaration = <ts.ClassDeclaration>currentNode;
                let classDef = new Class(classDeclaration.name.text, currentElement, this.getVisibility(currentNode));
                if (classDeclaration.heritageClauses) {
                    let extendsClause = Collections.firstOrDefault(classDeclaration.heritageClauses, c => c.token === ts.SyntaxKind.ExtendsKeyword);
                    if (extendsClause && extendsClause.types.length > 0) {
                        classDef.extends = this.getFullyQualifiedName(extendsClause.types[0]);
                    }
                }
                childElement = classDef;
                break;

            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.PropertyDeclaration:
                let propertyDeclaration = <ts.PropertyDeclaration>currentNode;
                let property = new Property((<ts.Identifier>propertyDeclaration.name).text, currentElement, this.getVisibility(currentNode), this.getLifetime(currentNode));
                switch (currentNode.kind) {
                    case ts.SyntaxKind.GetAccessor:
                        property.hasGetter = true;
                        break;
                    case ts.SyntaxKind.SetAccessor:
                        property.hasSetter = true;
                }
                childElement = property;
                skipChildren = true;
                break;

            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.FunctionDeclaration:
                let functionDeclaration = <ts.Declaration>currentNode;
                childElement = new Method((<ts.Identifier>functionDeclaration.name).text, currentElement, this.getVisibility(currentNode), this.getLifetime(currentNode));
                skipChildren = true;
                break;
            case ts.SyntaxKind.EnumDeclaration:
                let enumDeclaration = <ts.Declaration>currentNode;
                childElement = new Enum((<ts.Identifier>enumDeclaration.name).text, currentElement, this.getVisibility(currentNode), this.getLifetime(currentNode));
                // skipChildren = true;

            case ts.SyntaxKind.EnumMember:
                let enumMemberDeclaration = <ts.EnumMember>currentNode;
                let member = new EnumMember((<ts.Identifier>enumMemberDeclaration.name).text, currentElement, this.getVisibility(currentNode), this.getLifetime(currentNode));
                childElement = member;
                // skipChildren = true;
        }

        if (childElement) {
            currentElement.addElement(childElement);
        }

        if (skipChildren) {
            return;
        }

        ts.forEachChild(currentNode, (node) => this.analyseNode(node, childElement || currentElement));
    }

    private getFullyQualifiedName(expression: ts.ExpressionWithTypeArguments) {
        let symbol = this.typeChecker.getSymbolAtLocation(expression.expression);
        if (symbol) {
            let nameParts = this.typeChecker.getFullyQualifiedName(symbol).split(".");
            if (symbol.declarations.length > 0 && symbol.declarations[0].kind === ts.SyntaxKind.ImportSpecifier) {
                // symbol comes from an imported module
                // get the module name from the import declaration
                let importSpecifier = symbol.declarations[0];
                let moduleName = (<ts.StringLiteral>(<ts.ImportDeclaration>importSpecifier.parent.parent.parent).moduleSpecifier).text;
                nameParts.unshift(moduleName);
            } else {
                if (nameParts.length > 0 && nameParts[0].indexOf("\"") === 0) {
                    // if first name part has " then it should be a module name
                    let moduleName = nameParts[0].replace(/\"/g, ""); // remove " from module name
                    nameParts[0] = moduleName;
                }
            }
            return new QualifiedName(nameParts);
        }
        console.warn("Unable to resolve type: '" + expression.getText() + "'");
        return new QualifiedName(["unknown?"]);
    }

    private getVisibility(node: ts.Node) {
        if (node.modifiers) {
            if (this.hasModifierSet(node.modifiers.flags, ts.NodeFlags.Protected)) {
                return Visibility.Protected;
            } else if (this.hasModifierSet(node.modifiers.flags, ts.NodeFlags.Private)) {
                return Visibility.Private;
            } else if (this.hasModifierSet(node.modifiers.flags, ts.NodeFlags.Public)) {
                return Visibility.Public;
            } else if (this.hasModifierSet(node.modifiers.flags, ts.NodeFlags.Export)) {
                return Visibility.Public;
            }
        }
        switch (node.parent.kind) {
            case ts.SyntaxKind.ClassDeclaration:
                return Visibility.Public;
            case ts.SyntaxKind.ModuleDeclaration:
                return Visibility.Private;
        }
        return Visibility.Private;
    }

    private getLifetime(node: ts.Node) {
        if (node.modifiers) {
            if (this.hasModifierSet(node.modifiers.flags, ts.NodeFlags.Static)) {
                return Lifetime.Static;
            }
        }
        return Lifetime.Instance;
    }

    private hasModifierSet(value: number, modifier: number) {
        return (value & modifier) === modifier;
    }
}