const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\subha\\.gemini\\antigravity-ide\\brain\\d35744f4-b116-48a4-9706-b11cef4edd5e\\.system_generated\\logs\\transcript_full.jsonl';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Total lines in log: ${lines.length}`);
  lines.forEach((line, idx) => {
    if (line.includes('ACON') || line.includes('SIR') || line.includes('MAM') || line.includes('subhead') || line.includes('receipt')) {
      // Print first 300 chars of matching line to avoid huge output
      console.log(`L${idx+1}: ${line.substring(0, 500)}...`);
    }
  });
} else {
  console.log('Log file not found at:', logPath);
}
