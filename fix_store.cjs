const fs = require('fs');

let content = fs.readFileSync('src/store/portfolioStore.tsx', 'utf8');

// Clean duplicate trailing blocks
content = content.replace(/  realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoin: true\n\};\n\n  realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoin: true\n\};/g, '  realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoin: true\n};');

content = content.replace(/  realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoinBtc: true,\n\};\n\n  realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoinBtc: true,\n\};/g, '  realRootOnly: true,\n  exampleWiped: true,\n  includesBitcoinBtc: true,\n};');

content = content.replace(/const \{ ethers \} = require\('ethers'\);/g, '// ethers imported at top');
content = content.replace(/const \{ HDNodeWallet, Mnemonic \} = require\('ethers'\);/g, 'const { HDNodeWallet, Mnemonic } = ethers;');

fs.writeFileSync('src/store/portfolioStore.tsx', content, 'utf8');
console.log('Successfully fixed portfolioStore.tsx with CJS script');
