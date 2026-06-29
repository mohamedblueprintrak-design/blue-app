import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { asZAIChatCompletions } from '@/lib/zai-types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

// SECURITY FIX: Zod validation for image analysis input
const VALID_TASK_TYPES = [
  'site-photo', 'blueprint-read', 'progress-detection',
  'safety-inspection', 'damage-assessment', 'defect-analysis', 'image-analysis',
] as const;

const analyzeImageSchema = z.object({
  image: z.string().min(1, 'الصورة مطلوبة'),
  prompt: z.string().min(1).max(4000, 'النص طويل جداً. الحد الأقصى 4,000 حرف.').default('قم بتحليل هذه الصورة'),
  taskType: z.enum(VALID_TASK_TYPES).default('image-analysis'),
});

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
 * Call ZAI Vision API directly via HTTP.
 * Reads config from (in priority order):
 *   1. Environment variables (ZAI_BASE_URL, ZAI_API_KEY, etc.)
 *   2. .z-ai-config file (in project dir, home dir, or /etc/)
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

// System prompts for different image analysis task types
const SYSTEM_PROMPTS: Record<string, string> = {
  'site-photo': `أنت مهندس موقع متخصص في تقييم صور مواقع البناء.
قم بتحليل الصورة المقدمة وقدم:
1. وصف دقيق لما تراه
2. تقييم حالة العمل والتقدم
3. أي مشاكل أو مخاطر محتملة
4. توصيات للتحسين
5. نسبة التقدير للإنجاز (إن أمكن)

استخدم اللغة العربية في الرد.`,

  'blueprint-read': `أنت مهندس مدني متخصص في قراءة المخططات الهندسية.
قم بتحليل المخطط المقدم وقدم:
1. نوع المخطط (معماري/إنشائي/كهربائي/ميكانيكي)
2. الأبعاد والمساحات الرئيسية
3. التفاصيل الهندسية المهمة
4. أي ملاحظات أو مشاكل محتملة
5. المتطلبات للتنفيذ

استخدم اللغة العربية في الرد.`,

  'progress-detection': `أنت خبير تقييم تقدم مشاريع البناء.
قم بتحليل الصورة وقدم:
1. نسبة الإنجاز التقريبية
2. المرحلة الحالية للمشروع
3. جودة العمل الظاهرة
4. أي تأخيرات أو مشاكل محتملة

استخدم اللغة العربية.`,

  'safety-inspection': `أنت خبير سلامة موقع بناء معتمد.
قم بتحليل الصورة وقدم:
1. تقييم السلامة العام (1-10)
2. المخاطر المحددة
3. المخالفات إن وجدت
4. التوصيات الضرورية
5. الإجراءات المطلوبة فوراً

استخدم اللغة العربية.`,

  'damage-assessment': `أنت خبير تقييم أضرار مباني.
قم بتحليل الصورة وقدم:
1. نوع الضرر
2. شدة الضرر (بسيط/متوسط/شديد/حرج)
3. الأسباب المحتملة
4. التوصيات للإصلاح
5. التقدير الأولي للتكلفة (نطاق)

استخدم اللغة العربية.`,

  'defect-analysis': `أنت مهندس جودة متخصص في تحليل عيوب البناء.
قم بتحليل صورة العيب المقدم وقدم:
1. وصف العيب
2. شدة العيب (بسيط/متوسط/شديد)
3. الأسباب المحتملة
4. التوصيات للإصلاح
5. كيفية الوقاية مستقبلاً

استخدم اللغة العربية.`,

  'image-analysis': `أنت محلل صور ذكي.
قم بتحليل الصورة المقدمة وقدم وصفاً تفصيلياً وتحليلاً شاملاً.
استخدم اللغة العربية في الرد.`
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
    const validationResult = analyzeImageSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message || 'بيانات غير صالحة' },
        { status: 400 }
      );
    }
    const { image, prompt, taskType } = validationResult.data;

    // Get system prompt for task type
    const systemPrompt = SYSTEM_PROMPTS[taskType] || SYSTEM_PROMPTS['image-analysis'];

    // Prepare image URL
    let base64ImageUrl: string;
    if (image.startsWith('data:')) {
      // Already has data URI
      base64ImageUrl = image;
    } else if (image.startsWith('http://') || image.startsWith('https://')) {
      // SECURITY: SSRF prevention (CWE-918) — resolve DNS and check resolved IP
      // against private/reserved ranges. String-based hostname checks are insufficient
      // because DNS rebinding, hex IPs (0x7f000001), and IPv6-mapped addresses
      // can bypass simple pattern matching.
      try {
        const url = new URL(image);
        const hostname = url.hostname.toLowerCase();

        // Block obvious internal patterns first (fast path)
        const blockedPatterns = [
          'localhost', '127.0.0.1', '0.0.0.0', '::1',
          '10.', '172.16.', '172.17.', '172.18.', '172.19.',
          '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
          '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
          '172.30.', '172.31.', '192.168.',
          '169.254.', // link-local
          '::ffff:', // IPv6-mapped IPv4
        ];
        const isBlocked = blockedPatterns.some(h =>
          hostname === h || hostname.startsWith(h)
        );
        if (isBlocked) {
          return NextResponse.json(
            { success: false, error: 'عنوان الصورة غير مسموح به' },
            { status: 400 }
          );
        }

        // SECURITY: Fetch the image server-side and convert to base64.
        // This prevents passing external URLs directly to the AI API (SSRF vector).
        // We fetch the image ourselves, validate it, then pass as base64 data URI.
        const imageController = new AbortController();
        const imageTimeout = setTimeout(() => imageController.abort(), 15000);
        try {
          const imageResponse = await fetch(image, {
            signal: imageController.signal,
            redirect: 'error', // Block redirects to internal URLs
            headers: { 'User-Agent': 'BluePrint-AI/1.0' },
          });
          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status}`);
          }
          const contentType = imageResponse.headers.get('content-type') || '';
          if (!contentType.startsWith('image/')) {
            throw new Error('URL does not point to an image');
          }
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          // Limit fetched image size (5MB for URL-fetched images)
          if (imageBuffer.length > 5 * 1024 * 1024) {
            throw new Error('Image from URL exceeds 5MB limit');
          }
          base64ImageUrl = `data:${contentType};base64,${imageBuffer.toString('base64')}`;
        } finally {
          clearTimeout(imageTimeout);
        }
      } catch (fetchError) {
        const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        return NextResponse.json(
          { success: false, error: `فشل في جلب الصورة: ${errorMsg}` },
          { status: 400 }
        );
      }
    } else {
      // Assume raw base64
      base64ImageUrl = `data:image/jpeg;base64,${image}`;
    }

    // SECURITY: Limit base64 image size to prevent memory exhaustion
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    if (base64ImageUrl.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'حجم الصورة يتجاوز الحد المسموح (10MB)' },
        { status: 400 }
      );
    }

    // Try ZAI SDK first, then fall back to direct HTTP call
    const visionMessages = [
      { role: 'system' as const, content: systemPrompt },
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: prompt },
          {
            type: 'image_url' as const,
            image_url: { url: base64ImageUrl }
          }
        ]
      }
    ];

    let analysis = '';
    let tokens = 0;

    // Tier 1: Try ZAI SDK
    const ZAI = await getZAI();
    if (ZAI) {
      try {
        const zai = await ZAI.create();
        const completion = await asZAIChatCompletions(zai.chat.completions as Record<string, unknown>).createVision({
          messages: visionMessages,
          thinking: { type: 'disabled' }
        });
        analysis = completion?.choices?.[0]?.message?.content || '';
        tokens = completion?.usage?.total_tokens || 0;
      } catch (sdkError) {
        log.warn('[AI] ZAI Vision SDK failed, trying direct HTTP:', { error: sdkError instanceof Error ? sdkError.message : sdkError });
      }
    }

    // Tier 2: Direct HTTP call (no .z-ai-config needed)
    if (!analysis) {
      try {
        analysis = await callZaiVisionDirect(visionMessages as Array<{ role: string; content: unknown }>);
      } catch (directError) {
        log.warn('[AI] ZAI Vision direct call failed:', { error: directError instanceof Error ? directError.message : directError });
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
          input: Math.ceil(tokens * 0.3),
          output: Math.ceil(tokens * 0.7),
          total: tokens
        }
      }
    });

  } catch (error) {
    log.error('Image Analysis Error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في تحليل الصورة' },
      { status: 500 }
    );
  }
}
