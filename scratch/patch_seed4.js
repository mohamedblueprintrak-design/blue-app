const fs = require('fs');
const seedPath = 'c:/Users/Dell/Desktop/blue-app-main/prisma/seed.ts';
let content = fs.readFileSync(seedPath, 'utf8');

// Replace duplicate occurrences of organizationId
content = content.replace(/(organizationId:\s*org1\.id\s*,?\s*){2,}/g, 'organizationId: org1.id, ');
content = content.replace(/organizationId:\s*org1\.id\s*,\s*(.*?)\s*organizationId:\s*org1\.id/g, 'organizationId: org1.id, $1');

fs.writeFileSync(seedPath, content, 'utf8');
console.log('Removed duplicates from seed.ts');
