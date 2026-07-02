const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'server', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  content = content.replace(/staff\.id/g, 'staff.staffId');
  content = content.replace(/manager\.id/g, 'manager.staffId');
  content = content.replace(/director\.id/g, 'director.staffId');
  
  // also for leaves supervisor stuff
  content = content.replace(/staff\.supervisorLevel1Id/g, 'staffSupervisors.supervisor1Id');
  content = content.replace(/staff\.supervisorLevel2Id/g, 'staffSupervisors.supervisor2Id');
  content = content.replace(/currentStaff\.id/g, 'currentStaff.staffId');

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Fixed IDs in server/routes');
