/**
 * AI Router Service
 * خدمة توجيه طلبات AI للنموذج المناسب
 * 
 * تقوم بتحليل نوع المهمة واختيار أفضل نموذج
 * وتنفيذ الطلب وإرجاع النتيجة
 */

import { AITaskType, getBestModelForTask, getModelInfo} from './model-config';
import { sanitizeAndWrap, sanitizeAiInput, PROMPT_INJECTION_DEFENSE_SUFFIX } from './prompt-sanitizer';

// أنواع المدخلات
export interface AIRequest {
  task: AITaskType;
  prompt: string;
  context?: string;
  image?: string; // base64 or URL
  document?: string; // document content
  modelOverride?: string; // تجاوز النموذج الافتراضي
  temperature?: number;
  maxTokens?: number;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// أنواع المخرجات
export interface AIResponse {
  success: boolean;
  content: string;
  model: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  error?: string;
}

// System prompts حسب نوع المهمة
const SYSTEM_PROMPTS: Record<AITaskType, string> = {
  'chat': `أنت "بلو"، مساعد ذكي متخصص في الهندسة المدنية والبناء في الإمارات العربية المتحدة.
مسؤولياتك:
- المساعدة في الحسابات الهندسية والإنشائية
- شرح متطلبات أكواد البناء الإماراتية
- تقديم معلومات عن أسعار مواد البناء في السوق الإماراتي
- المساعدة في التصميم الإنشائي والمعماري
- الإجابة على استفسارات الهندسة المدنية

إرشادات الرد:
- قدم إجابات دقيقة وواضحة باللغة العربية
- استخدم المصطلحات الفنية المناسبة
- اذكر المعايير والأكواد المعمول بها في الإمارات عند الحاجة
- استخدم تنسيق Markdown للجداول والقوائم`,

  'summarize': `أنت خبير تلخيص. قم بتلخيص النص المقدم بشكل موجز وشامل.
- حافظ على النقاط الرئيسية
- استخدم اللغة العربية
- اجعل التلخيص منظم وواضح`,

  'translate': `أنت مترجم محترف. قم بترجمة النص المقدم.
- حافظ على المعنى والأسلوب
- استخدم لغة سليمة وواضحة`,

  'code': `أنت خبير برمجة متخصص في تطوير الويب والتطبيقات.
- اشرح الكود بوضوح
- قدم أمثلة عملية
- استخدم أفضل الممارسات`,

  'contract-analysis': `أنت مستشار قانوني متخصص في عقود المقاولات والبناء في الإمارات.
- حلل العقد المقدم
- حدد البنود الهامة والمخاطر المحتملة
- قدم توصيات للتحسين
- اذكر القوانين الإماراتية ذات الصلة`,

  'document-review': `أنت خبير مراجعة مستندات.
- راجع المستند المقدم
- حدد الأخطاء والتناقضات
- قدم ملاحظات وتوصيات`,

  'legal-analysis': `أنت مستشار قانوني متخصص في قوانين البناء والإنشاء.
- حلل المسألة القانونية
- اذكر القوانين والأرقام ذات الصلة
- قدم رأي قانوني مدعوم`,

  'image-analysis': `أنت خبير تحليل صور.
- حلل الصورة المقدمة
- صف ما تراه بالتفصيل
- قدم ملاحظات وتحليلات مفيدة`,

  'blueprint-read': `أنت مهندس مدني متخصص في قراءة المخططات الهندسية.
- اقرأ المخطط المقدم
- وضح التفاصيل الهندسية
- قدم تحليل إنشائي
- حدد أي ملاحظات أو مشاكل محتملة`,

  'site-photo': `أنت مهندس موقع متخصص في تقييم صور مواقع البناء.
- حلل الصورة المقدمة
- قيّم حالة العمل
- حدد أي مشاكل أو مخاطر
- قدم توصيات`,

  'data-analysis': `أنت محلل بيانات متخصص.
- حلل البيانات المقدمة
- استخرج الأنماط والرؤى
- قدم توصيات مبنية على البيانات`,

  'financial-forecast': `أنت محلل مالي متخصص في التوقعات المالية لمشاريع البناء.
- حلل البيانات المالية
- قدم توقعات مستقبلية
- حدد المخاطر المالية المحتملة
- قدم توصيات`,

  'risk-assessment': `أنت خبير إدارة مخاطر في مشاريع البناء.
- قيّم المخاطر المحتملة
- صنفها حسب الأهمية
- قدم استراتيجيات التخفيف`,

  'report-generation': `أنت خبير كتابة تقارير فنية.
- اكتب تقريراً منظمًا ومهنيًا
- استخدم تنسيق واضح
- اذكر التفاصيل والأرقام`,

  'email-draft': `أنت خبير صياغة إيميلات رسمية.
- اكتب إيميلاً واضحًا ومهنيًا
- استخدم اللغة العربية الفصحى
- كن موجزًا ومحترفًا`,

  'task-suggestions': `أنت مساعد ذكي يقدم اقتراحات مهام.
- حلل السياق المقدم
- اقترح مهام مفيدة ومناسبة
- رتب الاقتراحات حسب الأولوية`,
};

/**
 * AI Router Class
 * يدير توجيه طلبات AI للنماذج المناسبة
 */
export class AIRouter {
  private apiEndpoint: string;
  private token: string | null = null;

  constructor() {
    this.apiEndpoint = '/api/ai/chat';
  }

  /**
   * تعيين التوكن للمصادقة
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * الحصول على النموذج المناسب
   */
  selectModel(request: AIRequest): string {
    // لو المستخدم حدد نموذج معين
    if (request.modelOverride) {
      return request.modelOverride;
    }

    // اختيار النموذج الأفضل للمهمة
    const hasImage = !!request.image;
    return getBestModelForTask(request.task, hasImage);
  }

  /**
   * بناء الرسائل للإرسال
   */
  private buildMessages(request: AIRequest): Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> {
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];
    
    // System prompt
    // SECURITY: Append prompt-injection defense suffix so the LLM treats
    // user-controlled content as untrusted data, not instructions.
    const systemPrompt = SYSTEM_PROMPTS[request.task] + PROMPT_INJECTION_DEFENSE_SUFFIX;
    messages.push({ role: 'system', content: systemPrompt });

    // التاريخ (history)
    // SECURITY FIX (CWE-400): Limit history to prevent memory exhaustion
    const MAX_HISTORY_ITEMS = 20;
    const MAX_HISTORY_CONTENT_LENGTH = 10000; // 10KB per message
    if (request.history && request.history.length > 0) {
      const limitedHistory = request.history.slice(-MAX_HISTORY_ITEMS); // Keep only last N messages
      limitedHistory.forEach(msg => {
        // SECURITY: Sanitize each history message (user messages may contain
        // injection attempts; assistant messages are echoed back and could
        // be manipulated if the conversation was hijacked).
        const sanitized = sanitizeAiInput(msg.content, MAX_HISTORY_CONTENT_LENGTH);
        messages.push({ role: msg.role, content: sanitized });
      });
    }

    // السياق
    // SECURITY FIX (CWE-400): Limit context size + sanitize for prompt injection
    const MAX_CONTEXT_LENGTH = 50000; // 50KB
    let userContent = '';
    if (request.context) {
      // SECURITY: Wrap context in <user_data> delimiters so the LLM treats it
      // as data, not instructions. Sanitize for common injection patterns.
      userContent += `السياق:\n${sanitizeAndWrap(request.context, MAX_CONTEXT_LENGTH)}\n\n`;
    }

    // المستند
    // SECURITY FIX (CWE-400): Limit document size + sanitize
    const MAX_DOCUMENT_LENGTH = 500000; // 500KB
    if (request.document) {
      userContent += `المستند:\n${sanitizeAndWrap(request.document, MAX_DOCUMENT_LENGTH)}\n\n`;
    }

    // الطلب الرئيسي
    // SECURITY: The user's main prompt is also sanitized — it's the most
    // direct injection vector.
    userContent += sanitizeAiInput(request.prompt, 50000);

    // لو فيه صورة
    if (request.image) {
      const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: 'text', text: userContent }
      ];
      
      // إضافة الصورة
      if (request.image.startsWith('data:')) {
        content.push({
          type: 'image_url',
          image_url: { url: request.image }
        });
      } else {
        content.push({
          type: 'image_url',
          image_url: { url: request.image }
        });
      }
      
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: userContent });
    }

    return messages;
  }

  /**
   * تنفيذ طلب AI
   */
  async execute(request: AIRequest): Promise<AIResponse> {
    try {
      // SECURITY: Limit base64 image size to prevent memory exhaustion
      // A 10MB base64 string is ~7.5MB of actual image data
      const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 10MB
      if (request.image && request.image.length > MAX_BASE64_SIZE) {
        return {
          success: false,
          content: '',
          model: request.modelOverride || getBestModelForTask(request.task, !!request.image),
          error: 'Image size exceeds maximum allowed (10MB). Please compress the image and try again.'
        };
      }

      const model = this.selectModel(request);
      const messages = this.buildMessages(request);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
        },
        body: JSON.stringify({
          message: typeof messages[messages.length - 1].content === 'string' 
            ? messages[messages.length - 1].content 
            : request.prompt,
          model,
          history: messages.slice(1, -1).map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : ''
          })),
          task: request.task,
          temperature: request.temperature ?? 0.7,
          max_tokens: Math.min(request.maxTokens ?? 4000, 8000), // SECURITY FIX (CWE-400): Cap max_tokens at 8000
          image: request.image
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        content: data.message || data.data?.response || data.response || '',
        model: data.model || data.data?.model || model,
        tokens: data.usage ? {
          input: data.usage.input || data.usage.prompt_tokens || 0,
          output: data.usage.output || data.usage.completion_tokens || 0,
          total: data.usage.total_tokens || data.usage.total || 0
        } : (data.data?.tokens ? {
          input: data.data.tokens.input || 0,
          output: data.data.tokens.output || 0,
          total: data.data.tokens.total || 0
        } : undefined)
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        content: '',
        model: request.modelOverride || getBestModelForTask(request.task, !!request.image),
        error: message
      };
    }
  }

  /**
   * تنفيذ طلب سريع (مباشر)
   */
  async quickChat(prompt: string, context?: string): Promise<AIResponse> {
    return this.execute({
      task: 'chat',
      prompt,
      context
    });
  }

  /**
   * تحليل صورة
   */
  async analyzeImage(image: string, prompt: string): Promise<AIResponse> {
    return this.execute({
      task: 'image-analysis',
      image,
      prompt
    });
  }

  /**
   * تحليل عقد
   */
  async analyzeContract(document: string): Promise<AIResponse> {
    return this.execute({
      task: 'contract-analysis',
      document,
      prompt: 'قم بتحليل هذا العقد وتقديم ملخص شامل للبنود الهامة والمخاطر المحتملة والتوصيات.'
    });
  }

  /**
   * تلخيص نص
   */
  async summarize(text: string): Promise<AIResponse> {
    return this.execute({
      task: 'summarize',
      prompt: text
    });
  }

  /**
   * ترجمة
   */
  async translate(text: string, targetLang: 'ar' | 'en' = 'ar'): Promise<AIResponse> {
    return this.execute({
      task: 'translate',
      prompt: targetLang === 'ar' 
        ? `ترجم إلى العربية:\n\n${text}`
        : `Translate to English:\n\n${text}`
    });
  }
}

// إنشاء instance واحد
export const aiRouter = new AIRouter();

// Helper functions
export function getModelDisplayName(modelId: string): string {
  const info = getModelInfo(modelId);
  return info?.name || modelId;
}

export function isVisionModel(modelId: string): boolean {
  const info = getModelInfo(modelId);
  return info?.capabilities.includes('vision') ?? false;
}
