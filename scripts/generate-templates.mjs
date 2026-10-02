import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

// Build fixture shapes from the original UI model declarations, never from live user data.
const result = {};
for (const dir of fs.readdirSync('src/features')) {
  for (const file of fs.readdirSync(`src/features/${dir}`).filter(x => /models\.ts$/.test(x))) {
    const source = ts.createSourceFile(file, fs.readFileSync(`src/features/${dir}/${file}`, 'utf8'), ts.ScriptTarget.Latest, true);
    const defs = new Map(source.statements.filter(n => ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)).map(n => [n.name.text, n]));
    const textValue = key => /Points|Limit|balance|price|Share|Rate|Ratio/i.test(key) ? '0.00' : /At$|asOf|expiresAt/.test(key) ? '2026-10-03T02:00:00+08:00' : /Date$/.test(key) ? '2026-10-03' : /version|hash|watermark/i.test(key) ? '1' : /issueCode/i.test(key) ? '2026261' : '';
    function value(node, key='', seen=[]) {
      if (!node) return null;
      if (ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node)) return Object.fromEntries(node.members.filter(ts.isPropertySignature).map(m => [m.name.getText(source).replaceAll('"',''), value(m.type, m.name.getText(source), seen)]));
      if (ts.isTypeAliasDeclaration(node)) return value(node.type,key,seen);
      if (ts.isUnionTypeNode(node)) { if(node.types.some(t => t.kind === ts.SyntaxKind.LiteralType && t.literal.kind === ts.SyntaxKind.NullKeyword)) return null; return value(node.types[0],key,seen); }
      if (ts.isLiteralTypeNode(node)) { if(ts.isStringLiteral(node.literal)) return node.literal.text; if(node.literal.kind===ts.SyntaxKind.TrueKeyword)return true;if(node.literal.kind===ts.SyntaxKind.FalseKeyword)return false;return Number(node.literal.text)||null; }
      if (ts.isArrayTypeNode(node)) return [];
      if (ts.isTypeOperatorNode(node) || ts.isParenthesizedTypeNode(node)) return value(node.type,key,seen);
      if (ts.isTypeReferenceNode(node)) { const name=node.typeName.getText(source); if(['Array','ReadonlyArray'].includes(name))return [];if(name==='Readonly')return value(node.typeArguments[0],key,seen);if(name==='Record')return {};if(name==='LotteryCode')return 'SSQ';if(defs.has(name)&&!seen.includes(name))return value(defs.get(name),key,[...seen,name]);return {}; }
      if (node.kind===ts.SyntaxKind.StringKeyword) return textValue(key);
      if (node.kind===ts.SyntaxKind.NumberKeyword) return 0;
      if (node.kind===ts.SyntaxKind.BooleanKeyword) return false;
      return {};
    }
    result[dir]=Object.fromEntries([...defs].map(([key,node])=>[key,value(node,key,[key])]));
  }
}
fs.writeFileSync('src/demo/templates.json',JSON.stringify(result,null,2)+'\n');
console.log('Fixture templates:',Object.values(result).reduce((n,g)=>n+Object.keys(g).length,0));
