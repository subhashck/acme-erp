const { execSync } = require('child_process');

try {
  const output = execSync('git log -p -G "ACON" src/components/ReportForm.tsx', { encoding: 'utf8' });
  console.log('Git history for ReportForm.tsx:');
  console.log(output.substring(0, 3000));
} catch (e) {
  console.error('Error running git log:', e.message);
}
