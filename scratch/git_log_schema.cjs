const { execSync } = require('child_process');

try {
  const output = execSync('git log -p -G "handover" server/db/schema.ts', { encoding: 'utf8' });
  console.log('Git history for schema.ts:');
  console.log(output.substring(0, 3000));
} catch (e) {
  console.error('Error running git log:', e.message);
}
