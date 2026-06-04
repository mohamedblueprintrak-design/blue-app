const fs = require('fs');
const seedPath = 'c:/Users/Dell/Desktop/blue-app-main/prisma/seed.ts';
let content = fs.readFileSync(seedPath, 'utf8');

const regex = /(await db\.[a-zA-Z_]+\.create(?:Many)?\(\s*\{\s*data:\s*(?:\[|\{))([\s\S]*?)((?:\]|\})\s*,?\s*\}\);)/g;

content = content.replace(regex, (match, prefix, dataContent, suffix) => {
  // Now dataContent is either the contents of an array or an object
  // We want to find `{ ... }` blocks and add organizationId if not present
  
  let newDataContent = dataContent.replace(/\{([^{}]+)\}/g, (objMatch, innerProps) => {
    if (!innerProps.includes('organizationId')) {
      return '{' + innerProps + ', organizationId: org1.id}';
    }
    return objMatch;
  });
  
  return prefix + newDataContent + suffix;
});

// For arrays assigned to variables like `const assignments = [ ... ]`
const arrayRegex = /(const \w+ = \[\s*)([\s\S]*?)(\s*\];)/g;
content = content.replace(arrayRegex, (match, prefix, dataContent, suffix) => {
  let newDataContent = dataContent.replace(/\{([^{}]+)\}/g, (objMatch, innerProps) => {
    // Only patch if it has projectId or something that indicates it needs orgId
    if (innerProps.includes('projectId') && !innerProps.includes('organizationId')) {
      return '{' + innerProps + ', organizationId: org1.id}';
    }
    return objMatch;
  });
  return prefix + newDataContent + suffix;
});

fs.writeFileSync(seedPath, content, 'utf8');
console.log('Done patching safely!');
