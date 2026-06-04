const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('c:/Users/Dell/Desktop/blue-app-main/src/app/api');
let changedCount = 0;

for (const file of files) {
  if (file.includes('utils\\\\auth.ts') || file.includes('utils/auth.ts') || file.includes('utils\\\\crud-permissions.ts') || file.includes('utils/crud-permissions.ts')) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('requireVerifiedPermission')) {
    // Revert the messed up regex from earlier
    content = content.replace(/const\s+=\s+await requireVerifiedPermission/g, 'const rbac = await requireVerifiedPermission');
    
    // Also if it originally had authResult
    if (file.includes('whatsapp') && content.includes('const  = await requireVerifiedPermission')) {
       content = content.replace(/const\s+=\s+await requireVerifiedPermission/g, 'const authResult = await requireVerifiedPermission');
    }
    
    // If they missed await but had requireVerifiedPermission without await
    content = content.replace(/const rbac = requireVerifiedPermission/g, 'const rbac = await requireVerifiedPermission');
    content = content.replace(/const authResult = requireVerifiedPermission/g, 'const authResult = await requireVerifiedPermission');
    
    // Also fix any imports that might still say requirePermission
    content = content.replace(/\{\s*requirePermission\s*\}/g, '{ requireVerifiedPermission }');
    content = content.replace(/requirePermission,/g, 'requireVerifiedPermission,');
    content = content.replace(/, requirePermission\}/g, ', requireVerifiedPermission}');

    fs.writeFileSync(file, content);
    console.log('Fixed', file);
    changedCount++;
  } else if (content.includes('requirePermission')) {
    content = content.replace(/requirePermission/g, 'requireVerifiedPermission');
    content = content.replace(/const rbac = requireVerifiedPermission/g, 'const rbac = await requireVerifiedPermission');
    content = content.replace(/const authResult = requireVerifiedPermission/g, 'const authResult = await requireVerifiedPermission');
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
    changedCount++;
  }
}
console.log('Total fixed:', changedCount);
