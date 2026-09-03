const fs = require('fs');

let content = fs.readFileSync('src/store/portfolioStore.tsx', 'utf8');

// A robust way to clean duplicate keys in object literals:
// We can find lines that are exact duplicate property assignments right next to each other,
// or use a regex to clean common duplicates.
// Let's inspect the exact lines with duplicate keys from esbuild output:
// realRootOnly, exampleWiped, includesBitcoin, real, productionReady

// Let's replace any consecutive or duplicated properties inside object literals:
// Pattern 1:
//   realRootOnly: true,
//   exampleWiped: true,
//   includesBitcoin: true
// appearing twice or multiple times
content = content.replace(/(realRootOnly:\s*true,[\s\n]*exampleWiped:\s*true,[\s\n]*includesBitcoin:\s*true)\s*(?:,\s*|\n\s*)(\1)/g, '$1');

content = content.replace(/(realRootOnly:\s*true,[\s\n]*exampleWiped:\s*true,[\s\n]*includesBitcoinBtc:\s*true)\s*(?:,\s*|\n\s*)(\1)/g, '$1');

content = content.replace(/(real:\s*true)\s*,\s*\1/g, '$1');
content = content.replace(/(productionReady:\s*true)\s*,\s*\1/g, '$1');
content = content.replace(/(realRootOnly:\s*true)\s*,\s*\1/g, '$1');
content = content.replace(/(exampleWiped:\s*true)\s*,\s*\1/g, '$1');
content = content.replace(/(includesBitcoin:\s*true)\s*,\s*\1/g, '$1');

// Also remove duplicate properties separated by a closing brace }
content = content.replace(/\};\s*\n\s*(realRootOnly:\s*true,\s*\n\s*exampleWiped:\s*true,\s*\n\s*includesBitcoin:\s*true\s*\});/g, '\};');

fs.writeFileSync('src/store/portfolioStore.tsx', content, 'utf8');
console.log('Duplicate keys removal script executed.');
