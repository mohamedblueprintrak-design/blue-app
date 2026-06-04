const fs = require('fs');

const files = [
  'prisma/schema.prisma',
  'prisma/schema.postgresql.prisma',
  'prisma/schema.sqlite.prisma'
];

const modelsToMakeRequired = [
  'Task', 'Invoice', 'Document', 'Project', 'Contract', 'CompanySettings'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');

  // 1. Make organizationId required in core models
  for (const model of modelsToMakeRequired) {
    const regex = new RegExp(`(model ${model} \\{[\\s\\S]*?)organizationId\\s+String\\?([\\s\\S]*?)organization\\s+Organization\\?\\s+@relation\\(fields: \\[organizationId\\], references: \\[id\\]\\)([\\s\\S]*?\\})`, 'g');
    content = content.replace(regex, `$1organizationId String$2organization Organization @relation(fields: [organizationId], references: [id])$3`);
  }

  // 2. Add organizationId to ContractAmendment
  if (content.includes('model ContractAmendment {') && !content.includes('organizationId String', content.indexOf('model ContractAmendment'))) {
    content = content.replace(
      /(model ContractAmendment \{[\s\S]*?)(\s*\})/,
      `$1\n  organizationId String?\n  organization   Organization? @relation(fields: [organizationId], references: [id])\n  @@index([organizationId])$2`
    );
  }

  // 3. PostgreSQL & SQLite specific changes (remove @unique on email/googleId/microsoftId, add @@unique)
  if (file.includes('postgresql') || file.includes('sqlite')) {
    // User model email
    content = content.replace(
      /email\s+String\s+@unique/g,
      'email               String    '
    );
    // User model googleId
    content = content.replace(
      /googleId\s+String\?\s+@unique/g,
      'googleId            String?   '
    );
    // User model microsoftId
    content = content.replace(
      /microsoftId\s+String\?\s+@unique/g,
      'microsoftId         String?   '
    );
    // Add @@unique to User model
    if (content.includes('model User {') && !content.includes('@@unique([email, organizationId])')) {
      content = content.replace(
        /(model User \{[\s\S]*?)(\s*\})/,
        `$1\n  @@unique([email, organizationId])\n  @@unique([googleId, organizationId])\n  @@unique([microsoftId, organizationId])$2`
      );
    }

    // Project model number
    content = content.replace(
      /number\s+String\s+@unique/g,
      'number      String    '
    );
    if (content.includes('model Project {') && !content.includes('@@unique([number, organizationId])')) {
      content = content.replace(
        /(model Project \{[\s\S]*?)(\s*\})/,
        `$1\n  @@unique([number, organizationId])$2`
      );
    }
  }

  fs.writeFileSync(file, content, 'utf-8');
  console.log(`Updated ${file}`);
}
