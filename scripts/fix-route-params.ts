import path from 'node:path';

import {
  ArrowFunction,
  FunctionDeclaration,
  FunctionExpression,
  Node,
  ParameterDeclaration,
  Project,
  PropertySignature,
  StringLiteral,
  SyntaxKind,
  TypeLiteralNode,
} from 'ts-morph';

type FunctionLike =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunction;

async function main() {
  const project = new Project({
    tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
  });

  project.addSourceFilesAtPaths(['app/api/**/*.ts', 'app/api/**/*.tsx']);

  let filesUpdated = 0;
  let paramsUpdated = 0;

  for (const sourceFile of project.getSourceFiles()) {
    let fileChanged = false;

    const fnNodes: FunctionLike[] = [
      ...sourceFile.getFunctions(),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionExpression),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
    ];

    for (const fn of fnNodes) {
      const changedCount = transformFunction(fn);
      if (changedCount > 0) {
        fileChanged = true;
        paramsUpdated += changedCount;
      }
    }

    if (fileChanged) {
      filesUpdated += 1;
    }
  }

  await project.save();

  console.log(
    `Normalized route params in ${paramsUpdated} handlers across ${filesUpdated} files.`,
  );
}

main().catch((error) => {
  console.error('Failed to normalize route params:', error);
  process.exitCode = 1;
});

function transformFunction(fn: FunctionLike): number {
  let changed = 0;

  for (const param of fn.getParameters()) {
    if (transformParameter(fn, param)) {
      changed += 1;
    }
  }

  return changed;
}

function transformParameter(
  fn: FunctionLike,
  param: ParameterDeclaration,
): boolean {
  const nameNode = param.getNameNode();
  if (!Node.isObjectBindingPattern(nameNode)) {
    return false;
  }

  const elements = nameNode.getElements();
  if (
    elements.length !== 1 ||
    elements[0].getName() !== 'params' ||
    elements[0].getDotDotDotToken()
  ) {
    return false;
  }

  const typeNode = param.getTypeNode();
  if (!typeNode || typeNode.getKind() !== SyntaxKind.TypeLiteral) {
    return false;
  }

  const typeLiteral = typeNode as TypeLiteralNode;
  const paramsProp = typeLiteral
    .getProperties()
    .filter(
      (prop): prop is PropertySignature =>
        prop.getKind() === SyntaxKind.PropertySignature,
    )
    .find((prop) => prop.getName() === 'params');

  const paramsTypeNode = paramsProp?.getTypeNode();
  if (!paramsTypeNode) {
    return false;
  }

  let paramsTypeText = paramsTypeNode.getText().trim();
  if (!paramsTypeText) {
    return false;
  }

  const promiseMatch = paramsTypeText.match(/^Promise<([\s\S]+)>$/);
  if (promiseMatch) {
    paramsTypeText = promiseMatch[1].trim();
  }

  param.replaceWithText(`context: { params: Promise<${paramsTypeText}> }`);

  const body = fn.getBody();
  if (body && body.getKind() === SyntaxKind.Block) {
    const bodyText = body.getText();
    if (!bodyText.includes('context.params')) {
      const statements = body.getStatements();
      let insertIndex = 0;

      if (statements.length > 0) {
        const first = statements[0];
        if (first.getKind() === SyntaxKind.ExpressionStatement) {
          const expression = first.getExpression();
          if (
            expression.getKind() === SyntaxKind.StringLiteral &&
            ['use server', 'use client'].includes(
              (expression as StringLiteral).getLiteralText(),
            )
          ) {
            insertIndex = 1;
          }
        }
      }

      body.insertStatements(insertIndex, (writer) => {
        writer.write('const params = await context.params;');
      });
    }
  }

  return true;
}
import path from 'node:path';

import {
  ArrowFunction,
  FunctionDeclaration,
  FunctionExpression,
  Node,
  ParameterDeclaration,
  Project,
  PropertySignature,
  StringLiteral,
  SyntaxKind,
  TypeLiteralNode,
} from 'ts-morph';

type FunctionLike =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunction;

async function main() {
  const project = new Project({
    tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
  });

  project.addSourceFilesAtPaths(['app/api/**/*.ts', 'app/api/**/*.tsx']);

  let filesUpdated = 0;
  let paramsUpdated = 0;

  for (const sourceFile of project.getSourceFiles()) {
    let fileChanged = false;

    const fnNodes: FunctionLike[] = [
      ...sourceFile.getFunctions(),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionExpression),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
    ];

    for (const fn of fnNodes) {
      const changedCount = transformFunction(fn);
      if (changedCount > 0) {
        fileChanged = true;
        paramsUpdated += changedCount;
      }
    }

    if (fileChanged) {
      filesUpdated += 1;
    }
  }

  await project.save();

  console.log(
    `Normalized route params in ${paramsUpdated} handlers across ${filesUpdated} files.`,
  );
}

main().catch((error) => {
  console.error('Failed to normalize route params:', error);
  process.exitCode = 1;
});

function transformFunction(fn: FunctionLike): number {
  let changed = 0;

  for (const param of fn.getParameters()) {
    if (transformParameter(fn, param)) {
      changed += 1;
    }
  }

  return changed;
}

function transformParameter(
  fn: FunctionLike,
  param: ParameterDeclaration,
): boolean {
  const nameNode = param.getNameNode();
  if (!Node.isObjectBindingPattern(nameNode)) {
    return false;
  }

  const elements = nameNode.getElements();
  if (
    elements.length !== 1 ||
    elements[0].getName() !== 'params' ||
    elements[0].getDotDotDotToken()
  ) {
    return false;
  }

  const typeNode = param.getTypeNode();
  if (!typeNode || typeNode.getKind() !== SyntaxKind.TypeLiteral) {
    return false;
  }

  const typeLiteral = typeNode as TypeLiteralNode;
  const paramsProp = typeLiteral
    .getProperties()
    .filter((prop): prop is PropertySignature => prop.getKind() === SyntaxKind.PropertySignature)
    .find((prop) => prop.getName() === 'params');

  const paramsTypeNode = paramsProp?.getTypeNode();
  if (!paramsTypeNode) {
    return false;
  }

  let paramsTypeText = paramsTypeNode.getText().trim();
  if (!paramsTypeText) {
    return false;
  }

  const promiseMatch = paramsTypeText.match(/^Promise<([\s\S]+)>$/);
  if (promiseMatch) {
    paramsTypeText = promiseMatch[1].trim();
  }

  param.replaceWithText(`context: { params: Promise<${paramsTypeText}> }`);

  const body = fn.getBody();
  if (body && body.getKind() === SyntaxKind.Block) {
    const bodyText = body.getText();
    if (!bodyText.includes('context.params')) {
      const statements = body.getStatements();
      let insertIndex = 0;

      if (statements.length > 0) {
        const first = statements[0];
        if (first.getKind() === SyntaxKind.ExpressionStatement) {
          const expression = first.getExpression();
          if (
            expression.getKind() === SyntaxKind.StringLiteral &&
            ['use server', 'use client'].includes(
              (expression as StringLiteral).getLiteralText(),
            )
          ) {
          insertIndex = 1;
          }
        }
      }

      body.insertStatements(insertIndex, (writer) => {
        writer.write('const params = await context.params;');
      });
    }
  }

  return true;
}

