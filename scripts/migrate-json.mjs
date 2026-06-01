import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting data migration...");

  // 1. Project Phase -> Phase Deliverables
  // Note: Depending on your current database schema, some of these legacy relations/fields might not exist.
  try {
    const phases = await prisma.projectPhase.findMany();
    let deliverablesCreated = 0;
    for (const phase of phases) {
      if (phase.deliverables && typeof phase.deliverables === "string" && phase.deliverables !== "[]" && phase.deliverables !== "") {
        try {
          const deliverablesList = JSON.parse(phase.deliverables);
          for (const item of deliverablesList) {
            await prisma.phaseDeliverable.create({
              data: {
                phaseId: phase.id,
                name: item.name || item,
                status: item.status || "PENDING",
              },
            });
            deliverablesCreated++;
          }
        } catch (e) {
          console.error(`Failed to parse deliverables for phase ${phase.id}`);
        }
      }
    }
    console.log(`Migrated ${deliverablesCreated} phase deliverables.`);
  } catch (err) {
    console.warn("Skipping projectPhase migration (model might not exist in the current schema).");
  }

  // 2. Inspection -> Findings
  try {
    const inspections = await prisma.inspection.findMany();
    let findingsCreated = 0;
    for (const insp of inspections) {
      if (insp.findings && typeof insp.findings === "string" && insp.findings !== "[]" && insp.findings !== "") {
        try {
          const findingsList = JSON.parse(insp.findings);
          for (const item of findingsList) {
            await prisma.finding.create({
              data: {
                inspectionId: insp.id,
                location: item.location || "",
                description: item.description || "",
                severity: item.severity || "LOW",
                category: item.category || "STRUCTURAL",
                status: item.status || "OPEN",
              },
            });
            findingsCreated++;
          }
        } catch (e) {
          console.error(`Failed to parse findings for inspection ${insp.id}`);
        }
      }
    }
    console.log(`Migrated ${findingsCreated} findings.`);
  } catch (err) {
    console.warn("Skipping inspection findings migration (model might not exist in the current schema).");
  }

  console.log("Data migration completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
