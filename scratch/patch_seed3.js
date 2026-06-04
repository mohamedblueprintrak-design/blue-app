const fs = require('fs');
const seedPath = 'c:/Users/Dell/Desktop/blue-app-main/prisma/seed.ts';
let content = fs.readFileSync(seedPath, 'utf8');

content = content.replace(/projectId:\s*([a-zA-Z0-9]+)\.id,/g, 'projectId: $1.id, organizationId: org1.id,');

// Also, some objects use `projectId: project1.id` as the LAST property before `}`
content = content.replace(/projectId:\s*([a-zA-Z0-9]+)\.id\s*\}/g, 'projectId: $1.id, organizationId: org1.id }');

// Meeting creation might not have projectId but let's check
// Submittal might just have projectId

fs.writeFileSync(seedPath, content, 'utf8');
console.log('Patched seed.ts using proper JS file');
