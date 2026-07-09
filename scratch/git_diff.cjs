const { execSync } = require('child_process');

try {
  const output = execSync('git diff', { encoding: 'utf8' });
  console.log('Searching git diff...');
  const lines = output.split('\n');
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('acon')) {
      console.log(`ACON match at line ${idx}: ${line}`);
    }
  });
} catch (e) {
  console.error('Error running git diff:', e.message);
}
