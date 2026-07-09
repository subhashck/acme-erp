const fs = require('fs');
const content = fs.readFileSync('d:\\dev\\acme\\acme-erp\\server\\routes\\daily-closing.ts', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('reports') || line.includes('put(') || line.includes('post(')) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});
