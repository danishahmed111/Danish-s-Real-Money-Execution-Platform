const fs = require('fs');

// 1. Fix PortfolioDashboard.tsx extra closing div or brace if any
let dashboard = fs.readFileSync('src/components/PortfolioDashboard.tsx', 'utf8');
// Let's check opening vs closing divs or add a closing div if needed or remove extra closing div
// Actually let's count <div and </div in dashboard
const openDivs = (dashboard.match(/<div\b/g) || []).length;
const closeDivs = (dashboard.match(/<\/div>/g) || []).length;
console.log(`Dashboard open divs: ${openDivs}, close divs: ${closeDivs}`);

// 2. Fix portfolioStore.tsx duplicate keys by removing repeated trailing properties in objects
let store = fs.readFileSync('src/store/portfolioStore.tsx', 'utf8');

// Let's replace any duplicated property blocks at the end of objects
// For instance, multiple realRootOnly, exampleWiped, includesBitcoin, real, productionReady
store = store.replace(/(realRootOnly:\s*true[\s\S]*?includesBitcoin:\s*true)\s*\},\s*\n\s*(realRootOnly:\s*true[\s\S]*?includesBitcoin:\s*true)/g, '$1');

// More generic: let's remove any duplicate lines of "realRootOnly: true", "exampleWiped: true", "includesBitcoin: true", "real: true", "productionReady: true" within 10 lines of each other
const lines = store.split('\n');
const cleanedLines = [];
const seenKeysInObject = new Set();
let inObject = false;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  if (line.includes('{')) {
    // opening a new scope or object, clear or track
  }
  if (line.includes('}')) {
    seenKeysInObject.clear();
  }
  
  // Check if line is a simple property assignment like "realRootOnly: true,"
  const match = line.match(/^\s*([a-zA-Z0-9_]+)\s*:/);
  if (match) {
    const key = match[1];
    // If it's realRootOnly, exampleWiped, includesBitcoin, real, productionReady and already seen recently, skip it
    if (['realRootOnly', 'exampleWiped', 'includesBitcoin', 'productionReady'].includes(key)) {
      // let's check if we saw it in the last 20 lines without a }
      let duplicate = false;
      for (let j = cleanedLines.length - 1; j >= Math.max(0, cleanedLines.length - 20); j--) {
        if (cleanedLines[j].includes('}')) break;
        if (cleanedLines[j].trim().startsWith(key + ':')) {
          duplicate = true;
          break;
        }
      }
      if (duplicate) {
        console.log(`Removing duplicate key "${key}" at line ${i+1}`);
        continue;
      }
    }
  }
  cleanedLines.push(line);
}

fs.writeFileSync('src/store/portfolioStore.tsx', cleanedLines.join('\n'), 'utf8');
console.log('Portfolio store cleaned successfully.');
