import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { asZAIChatCompletions } from '@/lib/zai-types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

// SECURITY FIX: Zod validation for document analysis input
const analyzeDocumentSchema = z.object({
  document: z.string().min(1, 'المستند مطلوب').max(500000, 'المستند طويل جداً. الحد الأقصى 500,000 حرف.'),
  prompt: z.string().min(1).max(4000, 'النص طويل جداً. الحد الأقصى 4,000 حرف.').default('قم بتحليل هذا المستند'),
  taskType: z.enum([
    'contract-analysis',
    'document-review',
    'invoice-extraction',
    'document-analysis',
    'legal-analysis',
  ]).default('document-analysis'),
});

// Type definitions for AI chat message content
interface TextContentPart {
  type: 'text';
  text: string;
}

interface FileUrlContentPart {
  type: 'file_url';
  file_url: { url: string };
}

type MessageContentPart = TextContentPart | FileUrlContentPart;

interface ChatCompletionResult {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number };
}

// Lazy-load ZAI SDK to avoid bundling issues and missing .z-ai-config at import time
async function getZAI() {
  try {
    const mod = await import('z-ai-web-dev-sdk');
    return mod.default;
  } catch (importError) {
    log.warn('[AI] Failed to import z-ai-web-dev-sdk:', { error: importError instanceof Error ? importError.message : importError });
    return null;
  }
}

/**
 * Read ZAI config directly from .z-ai-config file.
 * Used as a backup when env vars are not set.
 */
async function readZaiConfigFile(): Promise<{ baseUrl: string; apiKey: string; chatId?: string; userId?: string; token?: string } | null> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    const configPaths = [
      path.join(process.cwd(), '.z-ai-config'),
      path.join(os.homedir(), '.z-ai-config'),
      '/etc/.z-ai-config',
    ];

    for (const configPath of configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (data.baseUrl && data.apiKey) {
            return data;
          }
        }
      } catch {
        // Try next path
      }
    }
  } catch {
    // Module loading failed
  }
  return null;
}

let _cachedFileConfig: Awaited<ReturnType<typeof readZaiConfigFile>> | undefined = undefined;
async function getCachedZaiFileConfig() {
  if (_cachedFileConfig === undefined) {
    _cachedFileConfig = await readZaiConfigFile();
  }
  return _cachedFileConfig;
}

/**
 * Call ZAI backend directly via HTTP.
 * Reads config from (in priority order):
 *   1. Environment variables (ZAI_BASE_URL, ZAI_API_KEY, etc.)
 *   2. .z-ai-config file (in project dir, home dir, or /etc/)
 */
async function callZaiDirect(
  messages: Array<{ role: string; content: unknown }>,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const fileConfig = await getCachedZaiFileConfig();

  const baseUrl = process.env.ZAI_BASE_URL || fileConfig?.baseUrl || '';
  const apiKey = process.env.ZAI_API_KEY || fileConfig?.apiKey || '';

  if (!baseUrl || !apiKey) {
    throw new Error('ZAI_BASE_URL and ZAI_API_KEY must be configured for document AI calls');
  }
  const chatId = process.env.ZAI_CHAT_ID || fileConfig?.chatId || '';
  const userId = process.env.ZAI_USER_ID || fileConfig?.userId || '';
  const token = process.env.ZAI_TOKEN || fileConfig?.token || '';

  const url = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'X-Z-AI-From': 'Z',
  };
  if (chatId) headers['X-Chat-Id'] = chatId;
  if (userId) headers['X-User-Id'] = userId;
  if (token) headers['X-Token'] = token;

  const body = {
    messages,
    temperature: options.temperature ?? 0.5,
    max_tokens: options.maxTokens ?? 2000,
    thinking: { type: 'disabled' },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ZAI direct call failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call ZAI Vision API directly via HTTP.
 */
async function callZaiVisionDirect(
  messages: Array<{ role: string; content: unknown }>,
): Promise<string> {
  const fileConfig = await getCachedZaiFileConfig();

  const baseUrl = process.env.ZAI_BASE_URL || fileConfig?.baseUrl || '';
  const apiKey = process.env.ZAI_API_KEY || fileConfig?.apiKey || '';

  if (!baseUrl || !apiKey) {
    throw new Error('ZAI_BASE_URL and ZAI_API_KEY must be configured for vision AI calls');
  }
  const chatId = process.env.ZAI_CHAT_ID || fileConfig?.chatId || '';
  const userId = process.env.ZAI_USER_ID || fileConfig?.userId || '';
  const token = process.env.ZAI_TOKEN || fileConfig?.token || '';

  const url = `${baseUrl}/chat/completions/vision`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'X-Z-AI-From': 'Z',
  };
  if (chatId) headers['X-Chat-Id'] = chatId;
  if (userId) headers['X-User-Id'] = userId;
  if (token) headers['X-Token'] = token;

  const body = { messages, thinking: { type: 'disabled' } };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ZAI vision direct call failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeout);
  }
}

// System prompts for different document analysis types
const SYSTEM_PROMPTS: Record<string, string> = {
  'contract-analysis': `أنت مستشار قانوني متخصص في عقود المقاولات والبناء في الإمارات العربية المتحدة.

قم بتحليل العقد المقدم وقدم:

## ملخص العقد
- أطراف العقد
- موضوع العقد
- القيمة والمدة
- تاريخ التوقيع

## المخاطر والتحذيرات
حدد البنود التي قد تشكل مخاطر مثل:
- شروط جزائية غير متوازنة
- التزامات غير واضحة
- غرامات مالية مرتفعة
- شروط تعسفية

## البنود الإيجابية
- البنود العادلة
- الضمانات المطلوبة
- آليات تسوية النزاعات

## التوصيات
- تعديلات مقترحة
- بنود ينصح بإضافتها
- نقاط تحتاج توضيح

استخدم اللغة العربية والتنسيق الواضح.`,

  'document-review': `أنت خبير مراجعة مستندات هندسية وإدارية.
قم بمراجعة المستند المقدم وقدم:
1. ملخص المحتوى
2. الأخطاء والتناقضات إن وجدت
3. النقاط الناقصة
4. التوصيات للتحسين
5. حالة المستند (كامل/ناقص/يحتاج مراجعة)

استخدم اللغة العربية.`,

  'invoice-extraction': `أنت خبير استخراج بيانات الفواتير.
من الفاتورة المقدمة، استخرج:
1. رقم الفاتورة وتاريخها
2. اسم المورد والعميل
3. قائمة الأصناف والكميات والأسعار
4. المجموع الفرعي والضريبة والإجمالي
5. شروط الدفع

قدم البيانات بتنسيق JSON إن أمكن.`,

  'document-analysis': `أنت محلل مستندات ذكي.
قم بتحليل المستند المقدم وقدم:
1. نوع المستند
2. ملخص المحتوى
3. النقاط الرئيسية
4. التحليل والاستنتاجات

استخدم اللغة العربية.`,

  'legal-analysis': `أنت مستشار قانوني متخصص في قوانين البناء والإنشاء في الإمارات.
قم بتحليل المسألة القانونية أو المستند المقدم وقدم:
1. الإطار القانوني المطبق
2. الحقوق والالتزامات
3. المخاطر القانونية
4. التوصيات والإجراءات المطلوبة
5. المراجع القانونية ذات الصلة

استخدم اللغة العربية.`
};

export async function POST(request: NextRequest) {
  const { allowed: _allowed, result } = await withRateLimit(request, 'ai');
  const blocked = rateLimitResponse(result);
  if (blocked) return blocked;

  const authResult = await requireVerifiedPermission(request, Permission.REPORTS_READ);
  if ('error' in authResult) return authResult.error;
  const _ctx = authResult.user;
  try {
    // Parse and validate request with Zod
    const rawBody = await request.json();
    const validationResult = analyzeDocumentSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message || 'بيانات غير صالحة' },
        { status: 400 }
      );
    }
    const { document, prompt, taskType } = validationResult.data;

    // Get system prompt for task type
    const systemPrompt = SYSTEM_PROMPTS[taskType] || SYSTEM_PROMPTS['document-analysis'];

    // Check if the document is base64 (file) or plain text
    let userContent: Array<{ type: string; text?: string; file_url?: { url: string } }>;

    if (document.startsWith('data:') || (document.length > 200 && /^[A-Za-z0-9+/=]+$/.test(document.substring(0, 200)))) {
      // Base64 encoded file - use vision API with file_url
      const base64DataUrl = document.startsWith('data:') ? document : `data:application/octet-stream;base64,${document}`;
      userContent = [
        { type: 'text', text: prompt },
        { type: 'file_url', file_url: { url: base64DataUrl } }
      ];
    } else {
      // Plain text document
      userContent = [
        { type: 'text', text: `${prompt}\n\n---\n\nالمستند:\n\n${document}` }
      ];
    }

    // Build messages
    const aiMessages = [
      { role: 'system' as const, content: systemPrompt },
      {
        role: 'user' as const,
        content: userContent as MessageContentPart[]
      }
    ];

    let analysis = '';
    let tokens = 0;

    // Tier 1: Try ZAI SDK
    const ZAI = await getZAI();
    if (ZAI) {
      try {
        const zai = await ZAI.create();
        // Call AI model - use vision API for file uploads, regular for text
        let completion: ChatCompletionResult | null = null;
        if (userContent.length > 1 && userContent[1].type === 'file_url') {
          completion = await asZAIChatCompletions(zai.chat.completions as Record<string, unknown>).createVision({
            messages: aiMessages as Array<{ role: 'user' | 'system' | 'assistant'; content: unknown }>,
            thinking: { type: 'disabled' }
          });
        } else {
          completion = await zai.chat.completions.create({
            // NOTE: ZAI SDK message type is narrower than our constructed messages;
            // the cast is needed because we build multimodal content dynamically
            messages: aiMessages as Array<{ role: 'user' | 'system' | 'assistant'; content: string }>,
            temperature: 0.5,
          });
        }
        analysis = completion?.choices?.[0]?.message?.content || '';
        tokens = completion?.usage?.total_tokens || 0;
      } catch (sdkError) {
        log.warn('[AI] ZAI Document SDK failed, trying direct HTTP:', { error: sdkError instanceof Error ? sdkError.message : sdkError });
      }
    }

    // Tier 2: Direct HTTP call (no .z-ai-config needed)
    if (!analysis) {
      try {
        const isFileUpload = userContent.length > 1 && userContent[1].type === 'file_url';
        if (isFileUpload) {
          analysis = await callZaiVisionDirect(aiMessages as Array<{ role: 'user' | 'system' | 'assistant'; content: unknown }>);
        } else {
          analysis = await callZaiDirect(aiMessages as Array<{ role: 'user' | 'system' | 'assistant'; content: unknown }>, { temperature: 0.5 });
        }
      } catch (directError) {
        log.warn('[AI] ZAI Document direct call failed:', { error: directError instanceof Error ? directError.message : directError });
        return NextResponse.json(
          { success: false, error: 'خدمة الذكاء الاصطناعي غير متاحة حالياً' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        taskType,
        tokens: {
          input: Math.ceil(tokens * 0.7),
          output: Math.ceil(tokens * 0.3),
          total: tokens
        }
      }
    });

  } catch (error) {
    log.error('Document Analysis Error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في تحليل المستند' },
      { status: 500 }
    );
  }
}
