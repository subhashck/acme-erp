const { execSync } = require('child_process');

try {
  const output = execSync('git log -p -S ACON', { encoding: 'utf8' });
  console.log('Git history for ACON:');
  console.log(output.substring(0, 2000));
} catch (e) {
  console.error('Error running git log:', e.message);
}
