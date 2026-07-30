export interface ParsedGanttTask {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  progress: number;
  dependencies: string[];
  wbsCode?: string;
  stageName?: string;
}

export function parseP6OrMsProjectXML(xmlContent: string): ParsedGanttTask[] {
  const tasks: ParsedGanttTask[] = [];

  // Regex-based lightweight XML parsing (works in both Node & browser)
  const taskBlocks = xmlContent.match(/<Task>[\s\S]*?<\/Task>/gi) || [];

  for (const block of taskBlocks) {
    const nameMatch = block.match(/<Name>(.*?)<\/Name>/i);
    const startMatch = block.match(/<Start>(.*?)<\/Start>/i);
    const finishMatch = block.match(/<Finish>(.*?)<\/Finish>/i) || block.match(/<End>(.*?)<\/End>/i);
    const uidMatch = block.match(/<UID>(.*?)<\/UID>/i) || block.match(/<ID>(.*?)<\/ID>/i);
    const percentMatch = block.match(/<PercentComplete>(.*?)<\/PercentComplete>/i);
    const wbsMatch = block.match(/<WBS>(.*?)<\/WBS>/i) || block.match(/<OutlineNumber>(.*?)<\/OutlineNumber>/i);

    if (nameMatch && startMatch && finishMatch) {
      const name = nameMatch[1].trim();
      const startDate = startMatch[1].trim().split("T")[0];
      const endDate = finishMatch[1].trim().split("T")[0];
      const id = uidMatch ? uidMatch[1].trim() : `p6-${Math.random().toString(36).substring(2, 9)}`;
      const progress = percentMatch ? Math.min(100, Math.max(0, parseInt(percentMatch[1], 10) || 0)) : 0;
      const wbsCode = wbsMatch ? wbsMatch[1].trim() : undefined;

      // Extract predecessor dependencies
      const predecessorMatches = block.match(/<PredecessorUID>(.*?)<\/PredecessorUID>/gi) || [];
      const dependencies: string[] = predecessorMatches.map(m => m.replace(/<\/?PredecessorUID>/gi, "").trim());

      tasks.push({
        id,
        name,
        startDate,
        endDate,
        progress,
        dependencies,
        wbsCode,
      });
    }
  }

  return tasks;
}

export function generateP6MsProjectXML(projectName: string, tasks: ParsedGanttTask[]): string {
  const now = new Date().toISOString();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<Project xmlns="http://schemas.microsoft.com/project">\n`;
  xml += `  <Name>${escapeXml(projectName)}</Name>\n`;
  xml += `  <CreationDate>${now}</CreationDate>\n`;
  xml += `  <Tasks>\n`;

  tasks.forEach((task, index) => {
    const uid = index + 1;
    xml += `    <Task>\n`;
    xml += `      <UID>${uid}</UID>\n`;
    xml += `      <ID>${uid}</ID>\n`;
    xml += `      <Name>${escapeXml(task.name)}</Name>\n`;
    xml += `      <Start>${task.startDate}T08:00:00</Start>\n`;
    xml += `      <Finish>${task.endDate}T17:00:00</Finish>\n`;
    xml += `      <PercentComplete>${task.progress}</PercentComplete>\n`;
    if (task.wbsCode) xml += `      <WBS>${escapeXml(task.wbsCode)}</WBS>\n`;

    task.dependencies.forEach(depId => {
      xml += `      <PredecessorStructure>\n`;
      xml += `        <PredecessorUID>${depId}</PredecessorUID>\n`;
      xml += `      </PredecessorStructure>\n`;
    });

    xml += `    </Task>\n`;
  });

  xml += `  </Tasks>\n`;
  xml += `</Project>`;

  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
