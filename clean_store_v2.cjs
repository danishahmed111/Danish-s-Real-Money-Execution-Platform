const fs = require('fs');

let content = fs.readFileSync('src/store/portfolioStore.tsx', 'utf8');

// Let's remove duplicate trailing properties in object literals.
// For instance, if realRootOnly: true appears twice in close proximity inside an object, remove the second one.
// Even simpler: let's replace common duplicated multi-line blocks:

content = content.replace(/(  realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoin: true\n)(\s*\},\s*\n\s*realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoin: true\n)/g, '$1');

content = content.replace(/(  realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoinBtc: true,\n)(\s*\},\s*\n\s*realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoinBtc: true,\n)/g, '$1');

content = content.replace(/(  real: true,\n  includesBitcoin: true\n)(\s*\},\s*\n\s*realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoin: true\n)/g, '$1');

content = content.replace(/(  real: true,\n  includesBitcoin: true,\n  realRootOnly: true,\n  exampleWiped: true,\n  productionReady: true\n)(\s*\},\s*\n\s*productionReady: true,\n  realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoin: true\n)/g, '$1');

// Let's also remove duplicate "real: true" or "productionReady: true" if they appear consecutively in objects
content = content.replace(/(\b(real|realRootOnly|exampleWiped|includesBitcoin|productionReady)\b\s*:\s*[^\n]+,\s*)\s*\2\s*:\s*[^\n]+,/g, '$1');

// Fix require('ethers')
content = content.replace(/const \{ ethers \} = require\('ethers'\);/g, '// ethers imported at top');
content = content.replace(/const \{ HDNodeWallet, Mnemonic \} = require\('ethers'\);/g, 'const { HDNodeWallet, Mnemonic } = ethers;');

fs.writeFileSync('src/store/portfolioStore.tsx', content, 'utf8');
console.log('Cleaned portfolioStore.tsx successfully.');
