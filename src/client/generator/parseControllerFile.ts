/**
 * Parser utilities for extracting ViewController metadata from source files.
 */

import { promises as fs } from "fs";
import ts from "typescript";
import {
  IDiscoveredCallableMethod,
  IDiscoveredController,
  IParseControllerFileOptions,
  IParseControllerFileResult,
} from "./types.js";

/**
 * Returns decorators attached to a node.
 *
 * @param node - TypeScript AST node.
 * @returns Decorator list.
 */
function getDecorators(node: ts.Node): readonly ts.Decorator[] {
  if (!ts.canHaveDecorators(node)) {
    return [];
  }
  return ts.getDecorators(node) ?? [];
}

/**
 * Reads a string literal property from a decorator object argument.
 *
 * @param decorator - Decorator to inspect.
 * @param propertyName - Object property name.
 * @returns String value when present.
 */
function getDecoratorStringProperty(
  decorator: ts.Decorator,
  propertyName: string
): string | undefined {
  if (!ts.isCallExpression(decorator.expression)) {
    return undefined;
  }

  const firstArg = decorator.expression.arguments[0];
  if (!firstArg || !ts.isObjectLiteralExpression(firstArg)) {
    return undefined;
  }

  for (const property of firstArg.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    if (!ts.isIdentifier(property.name) || property.name.text !== propertyName) {
      continue;
    }

    if (ts.isStringLiteral(property.initializer)) {
      return property.initializer.text;
    }
  }

  return undefined;
}

/**
 * Finds a decorator by identifier name.
 *
 * @param decorators - Decorator list.
 * @param name - Decorator identifier.
 * @returns Matching decorator or undefined.
 */
function findDecoratorByName(
  decorators: readonly ts.Decorator[],
  name: string
): ts.Decorator | undefined {
  for (const decorator of decorators) {
    if (!ts.isCallExpression(decorator.expression)) {
      continue;
    }

    const callee = decorator.expression.expression;
    if (ts.isIdentifier(callee) && callee.text === name) {
      return decorator;
    }
  }

  return undefined;
}

/**
 * Extracts a JSDoc comment block from a method declaration.
 *
 * @param method - Static method declaration.
 * @param sourceText - Full source text.
 * @returns JSDoc block when present.
 */
function extractMethodJsDoc(
  method: ts.MethodDeclaration,
  sourceText: string
): string | undefined {
  const leadingText = sourceText.slice(method.getFullStart(), method.getStart());
  const matches = leadingText.match(/\/\*\*[\s\S]*?\*\//g);
  if (!matches || matches.length === 0) {
    return undefined;
  }
  const jsDocText = matches[matches.length - 1].trim();
  return jsDocText.length > 0 ? jsDocText : undefined;
}

/**
 * Parses callable metadata from static methods on one controller class.
 *
 * @param classDeclaration - Controller class declaration.
 * @param sourceText - Full source text.
 * @returns Discovered callable methods.
 */
function parseCallableMethods(
  classDeclaration: ts.ClassDeclaration,
  sourceText: string,
  sourceFile: ts.SourceFile
): IDiscoveredCallableMethod[] {
  const methods: IDiscoveredCallableMethod[] = [];

  for (const member of classDeclaration.members) {
    if (!ts.isMethodDeclaration(member)) {
      continue;
    }

    const isStatic = member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword);
    if (!isStatic || !member.name || !ts.isIdentifier(member.name)) {
      continue;
    }

    const callableDecorator = findDecoratorByName(getDecorators(member), "Callable");
    if (!callableDecorator) {
      continue;
    }

    const rpcMethodKey = getDecoratorStringProperty(callableDecorator, "key");
    if (!rpcMethodKey) {
      continue;
    }

    methods.push({
      methodName: member.name.text,
      rpcMethodKey,
      argsType: member.parameters[0]?.type?.getText(sourceFile) ?? "unknown",
      returnType:
        member.type &&
        ts.isTypeReferenceNode(member.type) &&
        member.type.typeArguments?.[0]
          ? member.type.typeArguments[0].getText(sourceFile)
          : "unknown",
      jsDoc: extractMethodJsDoc(member, sourceText),
    });
  }

  return methods;
}

/**
 * Parses ViewController metadata from one source file.
 *
 * @param options - Parse options.
 * @returns Parsed controller metadata.
 */
export async function parseControllerFile(
  options: IParseControllerFileOptions
): Promise<IParseControllerFileResult> {
  const sourceText = await fs.readFile(options.filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    options.filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  const controllers: IDiscoveredController[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement) || !statement.name) {
      continue;
    }

    const decorator = findDecoratorByName(getDecorators(statement), "ViewController");
    if (!decorator) {
      continue;
    }

    const viewKey = getDecoratorStringProperty(decorator, "key");
    if (!viewKey) {
      continue;
    }

    const viewDataType =
      statement.heritageClauses
        ?.flatMap((clause) => clause.types)
        .find((typeNode) => typeNode.expression.getText(sourceFile).includes("BaseViewController"))
        ?.typeArguments?.[0]
        ?.getText(sourceFile) ?? "unknown";

    const callables = parseCallableMethods(statement, sourceText, sourceFile);
    if (callables.length === 0) {
      continue;
    }

    controllers.push({
      className: statement.name.text,
      viewKey,
      viewDataType,
      callables,
    });
  }

  return {
    filePath: options.filePath,
    controllers,
  };
}
