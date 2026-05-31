import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedPermission } from '../../utils/auth';
import { Permission } from '@/lib/auth/types';
import { asZAIChatCompletions } from '@/lib/zai-types';
import { log } from '@/lib/logger';
import { withRateLimit, rateLimitResponse } from '@/lib/rate-limit-middleware';
import { z } from 'zod';

// Zod validation schema for image analysis requests
const analyzeImageSchema = z.object({
  image: z.string().min(1, 'Image data is required').max(15_000_000, 'Image data too large'),
  prompt: z.string().max(5000).optional().default('قم بتحليل هذه الصورة'),
  taskType: z.enum([
    'site-photo',
    'blueprint-read',
    'progress-detection',
    'safety-inspection',
    'damage-assessment',
    'defect-analysis',
    'image-analysis',
  ]).optional().default('image-analysis'),
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

/**
 * SECURITY (CWE-918 — SSRF): Validate an image URL to prevent Server-Side Request Forgery.
 * Only allow https:// URLs pointing to known-safe public hostnames.
 * Block private/internal IPs, link-local, and metadata endpoints.
 */
function isValidImageUrl(urlStr: string): { valid: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Only HTTPS allowed
  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTPS URLs are allowed for image analysis' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block common internal/metadata hostnames
  const blockedHostnames = [
    'localhost', '127.0.0.1', '0.0.0.0', '::1',
    'metadata.google.internal', 'metadata.internal',
    '169.254.169.254', // cloud metadata
  ];
  if (blockedHostnames.includes(hostname)) {
    return { valid: false, reason: 'Internal/metadata URLs are not allowed' };
  }

  // Block private IP ranges (RFC 1918, RFC 4193, etc.)
  const privateIpPatterns = [
    /^10\./,                          // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,                     // 192.168.0.0/16
    /^fc00:/i,                         // IPv6 unique-local
    /^fe80:/i,                         // IPv6 link-local
    /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGN)
    /^0\./,                            // 0.0.0.0/8
    /^127\./,                          // 127.0.0.0/8
    /^169\.254\./,                     // 169.254.0.0/16 (link-local)
    /^\[/,                             // IPv6 literal in URL
  ];
  for (const pattern of privateIpPatterns) {
    if (pattern.test(hostname)) {
      return { valid: false, reason: 'Private/internal IP addresses are not allowed' };
    }
  }

  // Block DNS rebinding: reject hostnames that look like IP addresses after stripping brackets
  const bareHost = hostname.replace(/^\[|\]$/g, '');
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(bareHost)) {
    // Already checked private ranges above — additional check for unusual IPs
    const parts = bareHost.split('.').map(Number);
    const isPrivate = parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127 ||
      parts[0] === 0;
    if (isPrivate) {
      return { valid: false, reason: 'Private IP addresses are not allowed' };
    }
  }

  return { valid: true };
}

/**
 * Fetch an external image URL safely with SSRF protections.
 * - Validates the URL against private/internal IPs
 * - Limits response size to 10MB
 * - Validates Content-Type is an image
 * - Returns a base64 data URI
 */
async function fetchImageSafely(urlStr: string): Promise<string> {
  const validation = isValidImageUrl(urlStr);
  if (!validation.valid) {
    throw new Error(`Image URL not allowed: ${validation.reason}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(urlStr, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'BluePrint-ERP-ImageAnalyzer/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: HTTP ${response.status}`);
    }

    // Validate content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw new Error(`URL did not return an image (got: ${contentType})`);
    }

    // Limit response size to 10MB
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
      throw new Error('Image too large (max 10MB for URL fetches)');
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      throw new Error('Image too large (max 10MB for URL fetches)');
    }

    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
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
    // Parse and validate request body with Zod
    const rawBody = await request.json();
    const validation = analyzeImageSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid request', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      image,
      prompt = 'قم بتحليل هذه الصورة',
      taskType = 'image-analysis'
    } = validation.data;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'الصورة مطلوبة' },
        { status: 400 }
      );
    }

    // Get system prompt for task type
    const systemPrompt = SYSTEM_PROMPTS[taskType] || SYSTEM_PROMPTS['image-analysis'];

    // SECURITY (CWE-918 — SSRF): Prepare image URL safely
    let base64ImageUrl: string;
    if (image.startsWith('data:')) {
      // Already has data URI — safe, no server-side fetch needed
      base64ImageUrl = image;
    } else if (image.startsWith('http://') || image.startsWith('https://')) {
      // SECURITY FIX: Fetch the URL server-side with SSRF validation
      // instead of passing it directly to the AI API
      base64ImageUrl = await fetchImageSafely(image);
    } else {
      // Assume raw base64
      base64ImageUrl = `data:image/jpeg;base64,${image}`;
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
