// @ts-check
/**
 * Project Template Service Index
 * تصدير خدمة قوالب المشاريع
 * 
 * Re-exports everything from all modules for backward compatibility.
 */

// Types
export {
  type CreateProjectFromTemplateInput,
  type TemplateTaskData,
  type WorkflowPhaseTemplateData,
} from './types';

// Templates (pure data)
export { PREDEFINED_TEMPLATES, getTemplateMetadata } from './templates';

// Service functions (DB-dependent)
export {
  initializeTemplates,
  createTasksFromTemplate,
  getAvailableTemplates,
  getTemplateDetails,
} from './service';

// Workflow phase templates
export {
  createArchitecturalTemplate,
  createContractTemplate,
  createStructuralTemplate,
  createMEPTemplate,
  createGovernmentTemplate,
} from './workflows';

// Default export for backward compatibility
import { initializeTemplates } from './service';
import { createTasksFromTemplate } from './service';
import { getAvailableTemplates } from './service';
import { getTemplateDetails } from './service';
import { PREDEFINED_TEMPLATES } from './templates';
import { createArchitecturalTemplate } from './workflows';
import { createContractTemplate } from './workflows';
import { createStructuralTemplate } from './workflows';
import { createMEPTemplate } from './workflows';
import { createGovernmentTemplate } from './workflows';

const projectTemplateService = {
  initializeTemplates,
  createTasksFromTemplate,
  getAvailableTemplates,
  getTemplateDetails,
  PREDEFINED_TEMPLATES,
  createArchitecturalTemplate,
  createContractTemplate,
  createStructuralTemplate,
  createMEPTemplate,
  createGovernmentTemplate,
};

export default projectTemplateService;
