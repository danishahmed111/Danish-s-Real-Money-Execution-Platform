const fs = require('fs');
let dashboard = fs.readFileSync('src/components/PortfolioDashboard.tsx', 'utf8');
const openDivs = (dashboard.match(/<div\b/g) || []).length;
const closeDivs = (dashboard.match(/<\/div>/g) || []).length;
console.log(`Open divs: ${openDivs}, Close divs: ${closeDivs}, Diff: ${openDivs - closeDivs}`);
