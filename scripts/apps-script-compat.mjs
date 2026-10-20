import ts from 'typescript';

// Apps Script's upload parser rejects bigint literals although its V8 runtime supports BigInt().
// Transform syntax through the AST, preserving strings, comments, and the bigint's exact value.
export function appsScriptCompatible(source) {
  const file=ts.createSourceFile('Central.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const transformed=ts.transform(file,[context=>{
    const visit=node=>ts.isBigIntLiteral(node)
      ? ts.factory.createCallExpression(ts.factory.createIdentifier('BigInt'),undefined,[ts.factory.createStringLiteral(node.text.slice(0,-1).replace(/_/g,''))])
      : ts.visitEachChild(node,visit,context);
    return root=>ts.visitNode(root,visit);
  }]);
  try { return ts.createPrinter().printFile(transformed.transformed[0]); }
  finally { transformed.dispose(); }
}
