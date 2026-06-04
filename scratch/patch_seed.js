const fs = require('fs');

const seedPath = 'c:/Users/Dell/Desktop/blue-app-main/prisma/seed.ts';
let content = fs.readFileSync(seedPath, 'utf8');

const regex = /(await db\.[a-zA-Z]+\.createMany\(\{\s*data:\s*\[)([\s\S]*?)(\]\s*\}\);)/g;

content = content.replace(regex, (match, p1, p2, p3) => {
  const newP2 = p2.replace(/(\{[\s\S]*?\})/g, (objMatch, inner) => {
    // Only patch if it is a complete object (not nested) and missing organizationId
    if (!inner.includes('organizationId') && !inner.includes('data:')) {
      return inner.replace(/\}$/, ', organizationId: org1.id }');
    }
    return objMatch;
  });
  return p1 + newP2 + p3;
});

// Fix individual create()
const createRegex = /(await db\.[a-zA-Z]+\.create\(\{\s*data:\s*\{)([\s\S]*?)(\}\s*\}\);)/g;
content = content.replace(createRegex, (match, p1, p2, p3) => {
  if (!p2.includes('organizationId') && !p2.includes('data:')) {
    return p1 + p2 + ', organizationId: org1.id ' + p3;
  }
  return match;
});

// Fix specific known cases like projectStage and schedulePhase where objects are defined in an array first
const arrayRegex = /(const \w+ = \[\s*)([\s\S]*?)(\s*\];)/g;
content = content.replace(arrayRegex, (match, p1, p2, p3) => {
  // Only patch objects that have projectId
  if (p2.includes('projectId')) {
    const newP2 = p2.replace(/(\{[\s\S]*?\})/g, (objMatch, inner) => {
      if (!inner.includes('organizationId')) {
         return inner.replace(/\}$/, ', organizationId: org1.id }');
      }
      return objMatch;
    });
    return p1 + newP2 + p3;
  }
  return match;
});

fs.writeFileSync(seedPath, content, 'utf8');
console.log('patched seed.ts');
