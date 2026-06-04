const fs = require('fs');
let s = fs.readFileSync('c:/Users/Dell/Desktop/blue-app-main/prisma/schema.prisma', 'utf8');
const consentModel = `
model CommunicationConsent {
  id             String   @id @default(cuid())
  organizationId String
  phoneNumber    String
  channel        String   @default("whatsapp")
  optIn          Boolean  @default(false)
  updatedAt      DateTime @updatedAt
  createdAt      DateTime @default(now())
  
  @@unique([organizationId, phoneNumber, channel])
  @@index([organizationId])
  @@index([phoneNumber])
}
`;
if (!s.includes('model CommunicationConsent')) {
  s += '\n' + consentModel;
  fs.writeFileSync('c:/Users/Dell/Desktop/blue-app-main/prisma/schema.prisma', s);
  console.log('Appended CommunicationConsent');
} else {
  console.log('Already exists');
}
