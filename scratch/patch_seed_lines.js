const fs = require('fs');
const lines = fs.readFileSync('c:/Users/Dell/Desktop/blue-app-main/prisma/seed.ts', 'utf8').split('\n');

const targetProps = [
  'projectId:', 'taskId:', 'clientId:', 'employeeId:', 'checklistId:', 'entityType:', 'supplierId:', 'contractorId:'
];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Is it a one-liner object?
  if (line.includes('{') && line.includes('}') && !line.includes('organizationId')) {
    // Does it have one of the target props?
    if (targetProps.some(prop => line.includes(prop))) {
      const lastBraceIndex = line.lastIndexOf('}');
      lines[i] = line.substring(0, lastBraceIndex) + ', organizationId: org1.id ' + line.substring(lastBraceIndex);
    }
  }
}

fs.writeFileSync('c:/Users/Dell/Desktop/blue-app-main/prisma/seed.ts', lines.join('\n'), 'utf8');
console.log('Fixed one-liners safely!');
