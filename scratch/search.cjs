const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        searchDir(fullPath, query);
      }
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found in: ${fullPath}`);
        // print matching lines
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            console.log(`  L${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

console.log('Searching for ACON...');
searchDir('d:\\dev\\acme\\acme-erp\\src', 'ACON');
searchDir('d:\\dev\\acme\\acme-erp\\server', 'ACON');

console.log('Searching for SIR...');
searchDir('d:\\dev\\acme\\acme-erp\\src', 'SIR');
searchDir('d:\\dev\\acme\\acme-erp\\server', 'SIR');

console.log('Searching for MAM...');
searchDir('d:\\dev\\acme\\acme-erp\\src', 'MAM');
searchDir('d:\\dev\\acme\\acme-erp\\server', 'MAM');
