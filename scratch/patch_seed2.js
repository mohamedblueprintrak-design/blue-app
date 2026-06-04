const fs = require('fs');

const seedPath = 'c:/Users/Dell/Desktop/blue-app-main/prisma/seed.ts';
let content = fs.readFileSync(seedPath, 'utf8');

// Also catch arrays stored in variables before createMany
const arrayRegex = /(const \w+ = \[\s*)([\s\S]*?)(\s*\];)/g;
content = content.replace(arrayRegex, (match, p1, p2, p3) => {
  if (p2.includes('projectId') || p2.includes('id:')) {
    const newP2 = p2.replace(/(\{[^{}]*\})/g, (objMatch, inner) => {
      if (!inner.includes('organizationId')) {
         return inner.replace(/\}\s*$/, ', organizationId: org1.id }');
      }
      return objMatch;
    });
    return p1 + newP2 + p3;
  }
  return match;
});

const regex = /(await db\.[a-zA-Z]+\.createMany\(\{\s*data:\s*\[)([\s\S]*?)(\],?\s*(?:skipDuplicates:\s*(?:true|false),?\s*)?\}\);)/g;

content = content.replace(regex, (match, p1, p2, p3) => {
  const newP2 = p2.replace(/(\{[^{}]*\})/g, (objMatch, inner) => {
    if (!inner.includes('organizationId') && !inner.includes('data:')) {
      return inner.replace(/\}\s*$/, ', organizationId: org1.id }');
    }
    return objMatch;
  });
  return p1 + newP2 + p3;
});

const createRegex = /(await db\.[a-zA-Z]+\.create\(\{\s*data:\s*\{)([^{}]*)(\}\s*,?\s*\}\);)/g;
content = content.replace(createRegex, (match, p1, p2, p3) => {
  if (!p2.includes('organizationId') && !p2.includes('data:')) {
    return p1 + p2 + ', organizationId: org1.id ' + p3;
  }
  return match;
});

fs.writeFileSync(seedPath, content, 'utf8');
console.log('patched seed.ts correctly this time');
