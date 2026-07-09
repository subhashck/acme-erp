const fs = require('fs');

let content = fs.readFileSync('d:\\dev\\acme\\acme-erp\\src\\routes\\_authenticated\\reports\\$id.tsx', 'utf8');

const summaryRegex = /\s*\{\/\* Reconciled Summary Block \*\/\}[\s\S]*?Closing Statement Summary[\s\S]*?Calculated Closing[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;

const match = content.match(summaryRegex);

if (match) {
  let summaryBlock = match[0];
  content = content.replace(match[0], '');
  
  // Make the summary block take full width and add some margin at bottom
  summaryBlock = summaryBlock.replace('max-w-lg ml-auto', 'w-full max-w-none mb-8');

  // Insert before 3-Column Reconciliation Sheet
  const insertTarget = '      {/* 3-Column Reconciliation Sheet */}';
  content = content.replace(insertTarget, summaryBlock.trim() + '\n\n' + insertTarget);
  fs.writeFileSync('d:\\dev\\acme\\acme-erp\\src\\routes\\_authenticated\\reports\\$id.tsx', content, 'utf8');
  console.log("Success");
} else {
  console.log("Summary block not found!");
}
