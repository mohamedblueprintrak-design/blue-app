const fs = require('fs');
let code = fs.readFileSync('src/components/pages/gantt.tsx', 'utf8');

const oldDefs = new RegExp("// ===== Types =====[\\\\s\\\\S]*?// ===== Main Component =====");
const newImport = \`import { 
  GanttTask, 
  STATUS_COLORS, 
  PHASE_CATEGORY_COLORS, 
  PHASE_CATEGORY_LABELS, 
  STATUS_LABELS, 
  STATUS_ICONS, 
  getBarColor 
} from "@/components/gantt/gantt-types";

// ===== Main Component =====\`;

code = code.replace(oldDefs, newImport);
fs.writeFileSync('src/components/pages/gantt.tsx', code);
console.log('Successfully replaced gantt constants');
