/**
 * AI Model Configuration
 * إعدادات نماذج الذكاء الاصطناعي
 * 
 * يحدد النماذج المتاحة وخصائصها وأفضل استخداماتها
 */

// أنواع المهام المختلفة
export type AITaskType =
  // مهام نصية
  | 'chat'           // محادثة عامة
  | 'summarize'      // تلخيص
  | 'translate'      // ترجمة
  | 'code'           // كتابة/شرح كود
  
  // تحليل المستندات
  | 'contract-analysis'    // تحليل عقود
  | 'document-review'      // مراجعة مستندات
  | 'legal-analysis'       // تحليل قانوني
  
  // تحليل الصور
  | 'image-analysis'       // تحليل صور عادية
  | 'blueprint-read'       // قراءة مخططات هندسية
  | 'site-photo'           // صور موقع بناء
  
  // تحليل البيانات
  | 'data-analysis'        // تحليل بيانات
  | 'financial-forecast'   // توقعات مالية
  | 'risk-assessment'      // تقييم مخاطر
  
  // مهام خاصة
  | 'report-generation'    // توليد تقارير
  | 'email-draft'          // صياغة إيميلات
  | 'task-suggestions';    // اقتراحات مهام

// خصائص النموذج
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'anthropic' | 'deepseek' | 'mistral' | 'meta' | 'xai';
  capabilities: ('text' | 'vision' | 'code')[];
  maxTokens: number;
  costTier: 'free' | 'low' | 'medium' | 'high';
  bestFor: AITaskType[];
  description: string;
}

// النماذج المتاحة
export const AVAILABLE_MODELS: ModelConfig[] = [
  // ━━━━━━━━━━ Google Gemini ━━━━━━━━━━
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    capabilities: ['text', 'vision', 'code'],
    maxTokens: 1000000,
    costTier: 'low',
    bestFor: ['image-analysis', 'blueprint-read', 'site-photo', 'data-analysis', 'chat'],
    description: 'الأحدث والأقوى - ممتاز للصور والتحليل'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    capabilities: ['text', 'vision', 'code'],
    maxTokens: 1000000,
    costTier: 'free',
    bestFor: ['chat', 'summarize', 'translate', 'task-suggestions'],
    description: 'سريع ومجاني - مثالي للمهام العامة'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    provider: 'google',
    capabilities: ['text'],
    maxTokens: 1000000,
    costTier: 'free',
    bestFor: ['chat'],
    description: 'الأسرع والأخف - للمهام البسيطة'
  },

  // ━━━━━━━━━━ OpenAI ━━━━━━━━━━
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    capabilities: ['text', 'vision', 'code'],
    maxTokens: 128000,
    costTier: 'high',
    bestFor: ['blueprint-read', 'data-analysis', 'code', 'document-review'],
    description: 'الأقوى من OpenAI - ممتاز للتحليل المعقد'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    capabilities: ['text', 'vision', 'code'],
    maxTokens: 128000,
    costTier: 'low',
    bestFor: ['chat', 'summarize', 'translate', 'email-draft'],
    description: 'سريع ورخيص - للمهام اليومية'
  },

  // ━━━━━━━━━━ Anthropic Claude ━━━━━━━━━━
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    capabilities: ['text', 'vision', 'code'],
    maxTokens: 200000,
    costTier: 'high',
    bestFor: ['contract-analysis', 'legal-analysis', 'document-review', 'report-generation'],
    description: 'الأفضل للنصوص الطويلة والعقود'
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    capabilities: ['text', 'code'],
    maxTokens: 200000,
    costTier: 'medium',
    bestFor: ['chat', 'summarize', 'email-draft'],
    description: 'سريع من Claude - للمهام السريعة'
  },

  // ━━━━━━━━━━ DeepSeek ━━━━━━━━━━
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    capabilities: ['text', 'code'],
    maxTokens: 64000,
    costTier: 'low',
    bestFor: ['chat', 'code', 'task-suggestions'],
    description: 'رخص جداً وممتاز للكود'
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'deepseek',
    capabilities: ['text', 'code'],
    maxTokens: 64000,
    costTier: 'medium',
    bestFor: ['financial-forecast', 'risk-assessment', 'data-analysis'],
    description: 'تفكير عميق - للتوقعات والتحليل'
  },

  // ━━━━━━━━━━ Mistral ━━━━━━━━━━
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'mistral',
    capabilities: ['text', 'code'],
    maxTokens: 128000,
    costTier: 'medium',
    bestFor: ['chat', 'code', 'translate'],
    description: 'قوي من أوروبا - توازن ممتاز'
  },
  {
    id: 'mistral-small',
    name: 'Mistral Small',
    provider: 'mistral',
    capabilities: ['text'],
    maxTokens: 128000,
    costTier: 'low',
    bestFor: ['chat', 'translate'],
    description: 'سريع ورخيص'
  },

  // ━━━━━━━━━━ Meta Llama ━━━━━━━━━━
  {
    id: 'llama-3.1-70b',
    name: 'Llama 3.1 70B',
    provider: 'meta',
    capabilities: ['text', 'code'],
    maxTokens: 128000,
    costTier: 'medium',
    bestFor: ['chat', 'code', 'data-analysis'],
    description: 'قوي ومفتوح المصدر'
  },

  // ━━━━━━━━━━ xAI Grok ━━━━━━━━━━
  {
    id: 'grok-2',
    name: 'Grok 2',
    provider: 'xai',
    capabilities: ['text', 'code'],
    maxTokens: 128000,
    costTier: 'high',
    bestFor: ['chat', 'data-analysis', 'task-suggestions'],
    description: 'من xAI - ذكي وسريع'
  },
];

// النموذج الافتراضي لكل نوع مهمة
export const DEFAULT_MODEL_FOR_TASK: Record<AITaskType, string> = {
  // مهام نصية
  'chat': 'gemini-2.0-flash',
  'summarize': 'claude-3.5-sonnet',
  'translate': 'gemini-2.0-flash',
  'code': 'gpt-4o',
  
  // تحليل المستندات
  'contract-analysis': 'claude-3.5-sonnet',
  'document-review': 'gpt-4o',
  'legal-analysis': 'claude-3.5-sonnet',
  
  // تحليل الصور
  'image-analysis': 'gemini-2.5-flash',
  'blueprint-read': 'gpt-4o',
  'site-photo': 'gemini-2.5-flash',
  
  // تحليل البيانات
  'data-analysis': 'gpt-4o',
  'financial-forecast': 'deepseek-reasoner',
  'risk-assessment': 'deepseek-reasoner',
  
  // مهام خاصة
  'report-generation': 'claude-3.5-sonnet',
  'email-draft': 'gpt-4o-mini',
  'task-suggestions': 'gemini-2.0-flash',
};

// الحصول على أفضل نموذج لمهمة معينة
export function getBestModelForTask(task: AITaskType, hasImage: boolean = false): string {
  // لو فيه صورة، نتأكد إن النموذج يدعم vision
  if (hasImage) {
    const visionModels = AVAILABLE_MODELS.filter(m => 
      m.capabilities.includes('vision') && m.bestFor.includes(task)
    );
    if (visionModels.length > 0) {
      // نختار الأرخص
      const costOrder = { free: 0, low: 1, medium: 2, high: 3 };
      visionModels.sort((a, b) => costOrder[a.costTier] - costOrder[b.costTier]);
      return visionModels[0].id;
    }
  }
  
  return DEFAULT_MODEL_FOR_TASK[task];
}

// الحصول على معلومات النموذج
export function getModelInfo(modelId: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

// الحصول على النماذج حسب المزود
export function getModelsByProvider(provider: ModelConfig['provider']): ModelConfig[] {
  return AVAILABLE_MODELS.filter(m => m.provider === provider);
}

// الحصول على النماذج الرخيصة/المجانية
export function getFreeModels(): ModelConfig[] {
  return AVAILABLE_MODELS.filter(m => m.costTier === 'free' || m.costTier === 'low');
}
