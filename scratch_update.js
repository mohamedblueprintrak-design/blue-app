const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Project replacements
schema = schema.replace(
  /paymentSchedule\s+String\s+@default\(""\).*/g,
  'paymentSchedules ProjectPaymentSchedule[]'
);
schema = schema.replace(
  /municipalityChecklist\s+String\s+@default\(""\).*/g,
  'checklists ProjectChecklist[]'
);

// Client replacements
schema = schema.replace(
  /fullAddress\s+String\s+@default\(""\).*/g,
  'address ClientAddress?'
);
schema = schema.replace(
  /servicesWanted\s+String\s+@default\(""\).*/g,
  'services ClientService[]'
);
schema = schema.replace(
  /landDocuments\s+String\s+@default\(""\).*/g,
  'landDocuments ClientLandDocument[]'
);

// Append new models
const newModels = `
model ProjectPaymentSchedule {
  id          String    @id @default(cuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  milestone   String
  amount      Float
  percentage  Float
  dueDate     DateTime?
  status      String    @default("PENDING")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([projectId])
}

model ProjectChecklist {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  label       String
  checked     Boolean  @default(false)
  stage       String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId])
}

model ClientAddress {
  id        String   @id @default(cuid())
  clientId  String   @unique
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  emirate   String
  city      String
  area      String
  street    String?
  building  String?
  unit      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ClientService {
  id        String   @id @default(cuid())
  clientId  String
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  service   String
  createdAt DateTime @default(now())

  @@index([clientId])
}

model ClientLandDocument {
  id        String   @id @default(cuid())
  clientId  String
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  type      String
  path      String
  createdAt DateTime @default(now())

  @@index([clientId])
}
`;

if (!schema.includes('model ProjectPaymentSchedule')) {
  schema += newModels;
}

fs.writeFileSync(schemaPath, schema);
console.log("Schema updated successfully.");
